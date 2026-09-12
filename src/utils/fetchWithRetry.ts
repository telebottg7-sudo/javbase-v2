/**
 * Helper to fetch with automatic retries on network errors or transient 5xx HTTP responses.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  delayMs = 800
): Promise<Response> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || i === retries - 1) {
        return res;
      }
    } catch (err) {
      lastError = err;
    }
    if (i < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(1.5, i)));
    }
  }
  throw lastError || new Error(`Failed to fetch ${url}`);
}
