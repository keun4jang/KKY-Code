import { getSession } from '@/lib/auth/session'
import { apiHandler } from '@/lib/apiHandler'
import { logToGoogleSheets } from '@/lib/googleSheets'
import { sql } from '@/lib/db'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MODEL = 'gemini-2.5-flash'

async function fetchGeminiWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
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

  const geminiRes = await fetchGeminiWithRetry(
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

  if (!geminiRes.ok || !geminiRes.body) {
    const errText = await geminiRes.text()
    return new Response(JSON.stringify({ error: errText }), { status: 500 })
  }

  const lastUserMessage =
    [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.content ?? ''
  let fullAnswer = ''

  const stream = new ReadableStream({
    async start(controller) {
      const reader = geminiRes.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

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
              fullAnswer += text
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          } catch {
            // ignore partial json chunks
          }
        }
      }

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
