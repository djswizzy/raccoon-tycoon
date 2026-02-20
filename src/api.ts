export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')

export const API_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': '1',
  'User-Agent': 'GameClient/1.0',
}

const NGROK_PAGE_MESSAGE = 'Server returned a page instead of data.'

export async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        `${NGROK_PAGE_MESSAGE} If using ngrok, the request may have hit a warning page—try again.`
      )
    }
    throw new Error(`Invalid response: ${text.slice(0, 80)}`)
  }
}

/** Run an API call; if ngrok returns its HTML page, retry up to 2 times (3 attempts total). */
export async function withNgrokRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (e instanceof Error && e.message.includes(NGROK_PAGE_MESSAGE) && attempt < 2) continue
      throw e
    }
  }
  throw last
}
