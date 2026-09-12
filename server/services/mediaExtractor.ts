import * as cheerio from "cheerio";
import { HarvestedMediaStream } from "../schema/types";

export function normalizeMediaUrl(value: string, pageUrl: string): string | undefined {
  let url = value.trim().replace(/&amp;/gi, "&").replace(/\\\//g, "/");
  // Sources are commonly embedded as JSON strings in inline JavaScript.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
        url = JSON.parse(url);
      }
    } catch {
      break;
    }
  }
  try {
    const resolved = new URL(url, pageUrl);
    return resolved.protocol === "http:" || resolved.protocol === "https:" ? resolved.toString() : undefined;
  } catch {
    return undefined;
  }
}

function balancedArray(text: string, start: number): string | undefined {
  const first = text.indexOf("[", start);
  if (first < 0) return undefined;
  let quote = "";
  let escaped = false;
  let depth = 0;
  for (let index = first; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === "[") depth += 1;
    else if (character === "]" && --depth === 0) return text.slice(first, index + 1);
  }
  return undefined;
}

function parseSourceArray(raw: string): unknown[] {
  const candidates = [raw, raw.replace(/\\"/g, '"').replace(/\\\\/g, "\\")];
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* try the next representation */ }
  }
  // Many players use JavaScript object literals rather than JSON. Convert the limited,
  // safe source-object syntax without evaluating page-provided JavaScript.
  try {
    const jsonLike = raw
      .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)\s*:/g, '$1"$2":')
      .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, content: string) => JSON.stringify(content.replace(/\\'/g, "'")));
    const parsed: unknown = JSON.parse(jsonLike);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function streamFromValue(value: unknown, pageUrl: string, fallback: Partial<HarvestedMediaStream> = {}): HarvestedMediaStream | undefined {
  if (typeof value === "string") {
    const url = normalizeMediaUrl(value, pageUrl);
    return url ? { quality: fallback.quality ?? "auto", label: fallback.label, format: fallback.format ?? "video/mp4", url } : undefined;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const rawUrl = [record.src, record.file, record.url, record.source].find((item): item is string => typeof item === "string");
  if (!rawUrl) return undefined;
  const url = normalizeMediaUrl(rawUrl, pageUrl);
  if (!url) return undefined;
  const quality = typeof record.size === "number" || typeof record.size === "string" ? record.size
    : typeof record.height === "number" || typeof record.height === "string" ? record.height
    : typeof record.res === "number" || typeof record.res === "string" ? record.res : fallback.quality ?? "auto";
  const label = typeof record.label === "string" ? record.label : typeof quality === "number" || /^\d+$/.test(String(quality)) ? `${quality}p` : fallback.label;
  const format = typeof record.type === "string" ? record.type : typeof record.mimeType === "string" ? record.mimeType : fallback.format ?? "video/mp4";
  return { quality, label, format, url };
}

export function extractPlayerSources(html: string, pageUrl: string): HarvestedMediaStream[] {
  const streams: HarvestedMediaStream[] = [];
  const add = (stream: HarvestedMediaStream | undefined) => {
    if (stream && !streams.some((current) => current.url === stream.url)) streams.push(stream);
  };
  // A JSON payload may itself be stored in a JavaScript string, escaping quotes.
  const scriptText = html.replace(/\\"/g, '"');
  const property = /(?:["']?playerSources["']?|["']?sources["']?)\s*[:=]/gi;
  for (let match; (match = property.exec(scriptText)); ) {
    const raw = balancedArray(scriptText, match.index + match[0].length);
    if (!raw) continue;
    for (const source of parseSourceArray(raw)) add(streamFromValue(source, pageUrl));
  }

  const $ = cheerio.load(html);
  $("video, video source").each((_, element) => {
    const node = $(element);
    add(streamFromValue(node.attr("src") || node.attr("data-src") || "", pageUrl, {
      quality: node.attr("data-quality") || node.attr("height") || "auto",
      label: node.attr("label") || node.attr("data-quality"),
      format: node.attr("type") || "video/mp4",
    }));
  });
  return streams;
}
