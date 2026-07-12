import { getSession } from '@/lib/auth/session'
import { apiHandler } from '@/lib/apiHandler'
import { logToGoogleSheets } from '@/lib/googleSheets'
import { sql } from '@/lib/db'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY
const MODEL = 'gemini-2.5-flash'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastRes: Response | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options)
    if (res.ok) return res
    if (res.status === 503 || res.status === 429) {
      lastRes = res
      if (attempt < maxRetries) {
        const delayMs = 500 * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delayMs))
        continue
      }
    }
    return res
  }
  return lastRes as Response
}

async function callGemini(contents: unknown, systemText: string): Promise<string> {
  const res = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        tools: [{ google_search: {} }],
        systemInstruction: { parts: [{ text: systemText }] },
      }),
    }
  )
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function callGroq(
  history: { role: string; content: string }[],
  systemText: string
): Promise<string | null> {
  if (!GROQ_API_KEY) return null
  try {
    const res = await fetchWithRetry(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'system', content: systemText }, ...history],
        }),
      },
      1
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}

async function streamGeminiText(
  contents: unknown,
  systemText: string,
  onDelta: (text: string) => void
): Promise<string> {
  const res = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        tools: [{ google_search: {} }],
        systemInstruction: { parts: [{ text: systemText }] },
      }),
    }
  )
  if (!res.ok || !res.body) throw new Error(await res.text())

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const jsonStr = line.slice(6).trim()
      if (!jsonStr) continue
      try {
        const parsed = JSON.parse(jsonStr)
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          fullText += text
          onDelta(text)
        }
      } catch {
        // ignore partial json chunks
      }
    }
  }

  return fullText
}

export const POST = apiHandler(async (req: Request) => {
  const session = await getSession()
  if (!session) {
    return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), { status: 401 })
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not set' }), { status: 500 })
  }

  const { messages, location } = await req.json()

  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const db = sql()
  const [profile] = await db`select nickname, custom_instructions from users where id = ${session.userId}`

  let systemText =
    'You are a helpful assistant. Always answer in Korean. When the user asks about real-time information such as weather, news, prices, or sports results, use the google_search tool to find the actual current information and answer directly and concretely. Do not say you cannot access real-time data; use search instead.'
  if (location && location.lat && location.lng) {
    systemText += ` The user's approximate current location is latitude ${location.lat}, longitude ${location.lng}. Use this for location-based questions such as nearby weather or places.`
  }
  if (profile?.nickname) {
    systemText += ` Address the user as "${profile.nickname}" when appropriate.`
  }
  if (profile?.custom_instructions) {
    systemText += ` Additional instructions from the user, follow these unless they conflict with safety: ${profile.custom_instructions}`
  }

  const lastUserMessage =
    [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.content ?? ''

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) =>
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`))

      try {
        send({ status: 'AI 답변 수집 중...' })

        const [geminiAnswer, groqAnswer] = await Promise.all([
          callGemini(contents, systemText),
          callGroq(messages, systemText),
        ])

        send({ status: '종합 답변 작성 중...' })

        const synthesisPrompt = `사용자의 질문: "${lastUserMessage}"

아래는 서로 다른 AI 모델이 생성한 답변 두 개입니다.

[답변 A]
${geminiAnswer}

[답변 B]
${groqAnswer ?? '(응답 없음)'}

두 답변을 비교해서 더 정확하고 풍부한 하나의 최종 답변을 작성해주세요. 서로 보완되는 정보는 합치고, 상충되는 내용이 있으면 더 신뢰할 수 있는 쪽을 따르세요. 최종 답변만 자연스러운 한국어로 작성하고, "답변 A"나 "답변 B" 같은 표현은 쓰지 마세요.`

        const fullAnswer = await streamGeminiText(
          [{ role: 'user', parts: [{ text: synthesisPrompt }] }],
          systemText,
          (text) => send({ text })
        )

        send({ done: true })
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()

        logToGoogleSheets({
          type: 'chat',
          userId: session.userId,
          email: session.email,
          question: lastUserMessage,
          answer: fullAnswer,
          location: location ?? null,
          timestamp: new Date().toISOString(),
        })
      } catch (e) {
        send({ error: String((e as Error)?.message ?? e) })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
