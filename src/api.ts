export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')

export const API_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': '1',
}

export async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        'Server returned a page instead of data. If using ngrok, the request may have hit a warning page—try again.'
      )
    }
    throw new Error(`Invalid response: ${text.slice(0, 80)}`)
  }
}
