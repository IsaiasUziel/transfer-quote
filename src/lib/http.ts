const DEFAULT_TIMEOUT_MS = 10_000

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

interface FetchJsonOptions {
  timeoutMs?: number
  signal?: AbortSignal
}

export async function fetchJson(
  url: string,
  options: FetchJsonOptions = {},
): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const abortFromCaller = () => controller.abort()
  options.signal?.addEventListener('abort', abortFromCaller, { once: true })

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new HttpError(
        response.status,
        `Request failed with status ${response.status}`,
      )
    }

    return (await response.json()) as unknown
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError(0, 'The request timed out')
    }
    throw new HttpError(0, 'The network request failed')
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}
