export interface RateLimiter {
  schedule<T>(task: () => Promise<T>): Promise<T>
}

export function createRateLimiter(minIntervalMs: number): RateLimiter {
  let lastStartedAt = 0
  let queue: Promise<unknown> = Promise.resolve()

  return {
    schedule<T>(task: () => Promise<T>): Promise<T> {
      const result = queue.then(async () => {
        const waitMs = lastStartedAt + minIntervalMs - Date.now()
        if (waitMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitMs))
        }
        lastStartedAt = Date.now()
        return task()
      })

      queue = result.catch(() => undefined as unknown)
      return result
    },
  }
}
