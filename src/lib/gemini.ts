type ChatRole = 'user' | 'assistant'
type HistoryItem = { role: ChatRole; content: string }
type GeoLocation = { lat: number; lng: number } | null

export async function streamAssistantReply(
  history: HistoryItem[],
  onDelta: (textSoFar: string) => void,
  signal: AbortSignal,
  location?: GeoLocation,
  onStatus?: (status: string) => void
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

      let parsed: { error?: string; status?: string; text?: string }
      try {
        parsed = JSON.parse(payload)
      } catch {
        continue // ignore partial json chunks
      }

      if (parsed.error) throw new Error(parsed.error)
      if (parsed.status) onStatus?.(parsed.status)
      if (parsed.text) {
        fullText += parsed.text
        onDelta(fullText)
      }
    }
  }

  return fullText
}
