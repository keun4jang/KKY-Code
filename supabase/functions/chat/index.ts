const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
const SHEETS_WEBHOOK_URL = Deno.env.get("GOOGLE_SHEETS_WEBHOOK_URL")
const MODEL = "gemini-2.5-flash"

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

async function logToGoogleSheets(payload: Record<string, unknown>) {
  if (!SHEETS_WEBHOOK_URL) {
    console.log("SHEETS_WEBHOOK_URL not set, skip logging")
    return
  }
  try {
    const res = await fetch(SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    console.log("Sheets log response:", res.status, text)
  } catch (e) {
    console.error("Failed to log to Google Sheets:", e)
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { messages, userId, location } = await req.json()

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json"} }
      )
    }

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))

    let systemText = "You are a helpful assistant. Always answer in Korean. When the user asks about real-time information such as weather, news, prices, or sports results, use the google_search tool to find the actual current information and answer directly and concretely. Do not say you cannot access real-time data; use search instead."
    if (location && location.lat && location.lng) {
      systemText += ` The user's approximate current location is latitude ${location.lat}, longitude ${location.lng}. Use this for location-based questions such as nearby weather or places.`
    }

    const geminiRes = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          tools: [{ google_search: {} }],
          systemInstruction: { parts: [{ text: systemText }] },
        }),
      }
    )

    if (!geminiRes.ok || !geminiRes.body) {
      const errText = await geminiRes.text()
      return new Response(
        JSON.stringify({ error: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json"} }
      )
    }

    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content ?? ""
    let fullAnswer = ""

    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiRes.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const jsonStr = line.slice(6).trim()
            if (!jsonStr) continue
            try {
              const parsed = JSON.parse(jsonStr)
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
              if (text) {
                fullAnswer += text
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`)
                )
              }
            } catch (_e) {
              // ignore partial json chunks
            }
          }
        }

        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"))
        controller.close()

        logToGoogleSheets({
          question: lastUserMessage,
          answer: fullAnswer,
          userId: userId ?? "unknown",
          location: location ?? null,
          timestamp: new Date().toISOString(),
        })
      },
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }}
    )
  }
})