import { Request, Response } from "express";
import { Readable } from "stream";

const ALLOWED_MEDIA_HOSTS = ["javtiful.com", "cdn.javtiful.com"];
const FORWARDED_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "cache-control", "etag", "last-modified"];

export function isAllowedMediaUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const allowed = ALLOWED_MEDIA_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
    if (!allowed || !["http:", "https:"].includes(url.protocol)) return undefined;
    return url;
  } catch { return undefined; }
}

export function createMediaProxyHandler(fetchImpl: typeof fetch = fetch) {
  return async (req: Request, res: Response): Promise<void> => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
    const url = isAllowedMediaUrl(rawUrl);
    if (!url) { res.status(400).json({ error: "Invalid or disallowed media URL" }); return; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (compatible; AvdbMediaProxy/1.0)",
        Referer: "https://javtiful.com/",
      };
      if (req.headers.range) headers.Range = req.headers.range;
      let requestUrl = url;
      let upstream: globalThis.Response | undefined;
      // Validate every redirect target so an allowed host cannot turn this into SSRF.
      for (let redirects = 0; redirects < 4; redirects += 1) {
        upstream = await fetchImpl(requestUrl, { headers, redirect: "manual", signal: controller.signal });
        if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
        const location = upstream.headers.get("location");
        const nextUrl = location ? isAllowedMediaUrl(new URL(location, requestUrl).toString()) : undefined;
        if (!nextUrl) { res.status(502).json({ error: "Media server redirected to a disallowed URL" }); return; }
        requestUrl = nextUrl;
      }
      if (!upstream) throw new Error("Media server did not return a response");
      if (!upstream.ok && upstream.status !== 206) {
        res.status(upstream.status === 416 ? 416 : 502).json({ error: `Upstream media request failed (${upstream.status})` });
        return;
      }
      for (const header of FORWARDED_HEADERS) {
        const value = upstream.headers.get(header);
        if (value) res.setHeader(header, value);
      }
      res.status(upstream.status === 206 ? 206 : 200);
      if (!upstream.body) { res.end(); return; }
      Readable.fromWeb(upstream.body as import("stream/web").ReadableStream).pipe(res);
    } catch (error: unknown) {
      if (!res.headersSent) res.status(504).json({ error: error instanceof Error && error.name === "AbortError" ? "Media request timed out" : "Unable to reach media server" });
    } finally { clearTimeout(timeout); }
  };
}
