import assert from "node:assert/strict";
import test from "node:test";
import { extractPlayerSources, normalizeMediaUrl } from "../server/services/mediaExtractor";
import { isAllowedMediaUrl } from "../server/routes/mediaProxy";
import { createMediaProxyHandler } from "../server/routes/mediaProxy";

test("extracts JavaScript player source arrays without relying on quoted property names", () => {
  const streams = extractPlayerSources("<script>window.player = { playerSources: [{file: '//javtiful.com/media/main.mp4', label: '1080p', type: 'video/mp4'}, {src: '/media/main.mp4', size: 720}] };</script>", "https://javtiful.com/video/1");
  assert.equal(streams.length, 2);
  assert.equal(streams[0].url, "https://javtiful.com/media/main.mp4");
  assert.equal(streams[0].label, "1080p");
});

test("extracts escaped JSON and deduplicates source URLs", () => {
  const streams = extractPlayerSources('<script>"playerSources": [{"src":"https:\\/\\/javtiful.com\\/video.mp4","size":720},{"src":"https:\\/\\/javtiful.com\\/video.mp4","size":720}]</script>', "https://javtiful.com/watch");
  assert.equal(streams.length, 1);
  assert.equal(streams[0].quality, 720);
});

test("uses video and source elements as a fallback and normalizes URLs", () => {
  const streams = extractPlayerSources('<video src="/media/a.mp4"><source src="//javtiful.com/media/b.mp4" type="video/webm"></video>', "https://javtiful.com/watch");
  assert.deepEqual(streams.map((stream) => stream.url), ["https://javtiful.com/media/a.mp4", "https://javtiful.com/media/b.mp4"]);
  assert.equal(normalizeMediaUrl('"\\/media\\/a.mp4"', "https://javtiful.com/watch"), "https://javtiful.com/media/a.mp4");
});

test("rejects unsafe and arbitrary proxy targets", () => {
  assert.ok(isAllowedMediaUrl("https://javtiful.com/media/a.mp4"));
  assert.equal(isAllowedMediaUrl("http://127.0.0.1:3000/private"), undefined);
  assert.equal(isAllowedMediaUrl("https://example.com/video.mp4"), undefined);
  assert.equal(isAllowedMediaUrl("file:///etc/passwd"), undefined);
});

test("proxy forwards a Range request and preserves partial-content headers", async () => {
  let receivedRange = "";
  const handler = createMediaProxyHandler(async (_url, init) => {
    receivedRange = (init?.headers as Record<string, string>).Range;
    return new Response(null, { status: 206, headers: { "content-type": "video/mp4", "content-range": "bytes 0-9/10", "content-length": "10", "accept-ranges": "bytes" } });
  });
  const calls: { status?: number; headers: Record<string, string>; json?: unknown; ended?: boolean } = { headers: {} };
  const res = {
    setHeader: (name: string, value: string) => { calls.headers[name.toLowerCase()] = value; },
    status: (status: number) => { calls.status = status; return res; },
    json: (value: unknown) => { calls.json = value; return res; },
    end: () => { calls.ended = true; },
    headersSent: false,
  };
  await handler({ query: { url: "https://javtiful.com/media/main.mp4" }, headers: { range: "bytes=0-9" } } as never, res as never);
  assert.equal(receivedRange, "bytes=0-9");
  assert.equal(calls.status, 206);
  assert.equal(calls.headers["content-range"], "bytes 0-9/10");
  assert.equal(calls.ended, true);
});

test("proxy returns an error response for a missing stream", async () => {
  const handler = createMediaProxyHandler(async () => new Response(null, { status: 404 }));
  const calls: { status?: number; json?: unknown } = {};
  const res = { status: (status: number) => { calls.status = status; return res; }, json: (value: unknown) => { calls.json = value; return res; }, headersSent: false };
  await handler({ query: { url: "https://javtiful.com/media/missing.mp4" }, headers: {} } as never, res as never);
  assert.equal(calls.status, 502);
  assert.deepEqual(calls.json, { error: "Upstream media request failed (404)" });
});
