const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL

export async function logToGoogleSheets(payload: Record<string, unknown>) {
  if (!SHEETS_WEBHOOK_URL) return
  try {
    const res = await fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    console.log('Sheets log response:', res.status, text)
  } catch (e) {
    console.error('Failed to log to Google Sheets:', e)
  }
}
