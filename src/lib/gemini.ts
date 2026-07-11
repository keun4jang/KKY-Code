type ChatRole = 'user' | 'assistant'
type HistoryItem = { role: ChatRole; content: string }
type GeoLocation = { lat: number; lng: number } | null

export async function streamAssistantReply(
  history: HistoryItem[],
  onDelta: (textSoFar: string) => void,
  signal: AbortSignal,
  location?: GeoLocation
): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: history, location }),
    signal,
  })

  if (!res.ok || !res.body) {
    const errText = await res.text()
    throw new Error(errText || 'AI request failed.')
  }

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
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') continue
      try {
        const parsed = JSON.parse(payload)
        if (parsed.text) {
          fullText += parsed.text
          onDelta(fullText)
        }
      } catch {
        // ignore
      }
    }
  }

  return fullText
}
