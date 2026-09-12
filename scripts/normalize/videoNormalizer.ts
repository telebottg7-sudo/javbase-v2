/**
 * Reusable normalization utilities for standardized Avdb JSON schemas.
 */

export interface CanonicalActressRef {
  name: string;
  slug: string;
}

export interface CanonicalStudioRef {
  name: string;
  slug: string;
}

export interface CanonicalVideoJson {
  code: string;
  title: string;
  actress: CanonicalActressRef | null;
  studio: CanonicalStudioRef | null;
  duration: number | null; // Total seconds
  releaseDate: string | null; // YYYY-MM-DD
  thumbnail: string | null;
  postUrl: string | null;
  addedAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  [key: string]: any;
}

/**
 * Normalizes an actress or studio name into a deterministic URL/file slug.
 * e.g., "Yua Mikami" -> "yua-mikami", "S1 NO.1 STYLE" -> "s1-no-1-style"
 */
export function normalizeSlug(name: string): string {
  if (!name) return "unnamed";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // replace symbols and whitespace with hyphens
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .substring(0, 100) || "unnamed";
}

/**
 * Returns the alphabetical shard directory letter ('a' through 'z', or '_' for symbols/numbers).
 */
export function getShardLetter(nameOrSlug: string): string {
  const clean = normalizeSlug(nameOrSlug);
  const firstChar = clean.charAt(0);
  if (firstChar >= "a" && firstChar <= "z") {
    return firstChar;
  }
  return "_";
}

/**
 * Computes the canonical relative storage path for an actress entity.
 * e.g. "yua-mikami" -> "actresses/y/yua-mikami.json"
 */
export function getActressPath(slugOrName: string): string {
  const slug = normalizeSlug(slugOrName);
  const letter = getShardLetter(slug);
  return `actresses/${letter}/${slug}.json`;
}

/**
 * Computes the canonical relative storage path for a studio entity.
 * e.g. "s1-no-1-style" -> "studios/s/s1-no-1-style.json"
 */
export function getStudioPath(slugOrName: string): string {
  const slug = normalizeSlug(slugOrName);
  const letter = getShardLetter(slug);
  return `studios/${letter}/${slug}.json`;
}

/**
 * Deterministically normalizes video release codes.
 * e.g. "ssis 001" -> "SSIS-001", "abp-123" -> "ABP-123", "IPX-054" -> "IPX-054"
 */
export function normalizeCode(rawCode: string): string | null {
  if (!rawCode) return null;
  const trimmed = rawCode.trim().toUpperCase();

  // Multi-segment formats like "10MUSUME-050515_01" or "CARIBBEANCOM-050515-001"
  const multiSegmentMatch = trimmed.match(/^([A-Z0-9]{3,15})[\s\-_]+([0-9]{6})[\s\-_]+([0-9]{2,4})$/);
  if (multiSegmentMatch) {
    return `${multiSegmentMatch[1]}-${multiSegmentMatch[2]}-${multiSegmentMatch[3]}`;
  }

  // Standard alphanumeric code format: 2-8 letters, optional space/hyphen/underscore, 2-7 digits
  const standardMatch = trimmed.match(/^([A-Z0-9]{2,8})[\s\-_]+([0-9]{2,7})$/);
  if (standardMatch) {
    return `${standardMatch[1]}-${standardMatch[2]}`;
  }

  // Codes without separators like "SSIS001"
  const compactMatch = trimmed.match(/^([A-Z]{2,6})([0-9]{3,5})$/);
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}`;
  }

  return null;
}

/**
 * Detects category automatically from normalized video code.
 * E.g., "DSOD-123" -> "DSOD", "ADN-426" -> "ADN"
 */
export function getCodeCategory(code: string): string | null {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  const parts = normalized.split("-");
  if (parts.length > 0 && parts[0]) {
    const category = parts[0].toUpperCase();
    if (/^[A-Z0-9]+$/.test(category)) {
      return category;
    }
  }
  return null;
}

/**
 * Computes canonical relative storage path for a video code entity.
 * e.g. "ADN-426" -> "codes/ADN/ADN-426.json"
 */
export function getCodeFilePath(code: string): string | null {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  const category = getCodeCategory(normalized);
  if (!category) return null;
  return `codes/${category}/${normalized}.json`;
}

/**
 * Computes canonical relative path for a code index file.
 * e.g. "ADN" -> "index/codes/ADN.json"
 */
export function getCodeIndexPath(category: string): string {
  const cat = (category || "").toUpperCase().trim();
  return `index/codes/${cat}.json`;
}

/**
 * Parses any duration representation (HH:MM:SS, MM:SS, "118 min", raw seconds) into numeric total seconds.
 */
export function parseDurationToSeconds(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;

  if (typeof val === "number") {
    return isNaN(val) || val <= 0 ? null : Math.round(val);
  }

  const str = String(val).trim();
  if (!str) return null;

  // Pure numeric string
  if (/^\d+$/.test(str)) {
    const parsed = parseInt(str, 10);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  }

  // Format "HH:MM:SS" or "MM:SS"
  if (str.includes(":")) {
    const parts = str.split(":").map((p) => parseInt(p.trim(), 10));
    if (parts.every((p) => !isNaN(p))) {
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
    }
  }

  // Format "120 min" or "120 mins" or "2 hr 10 min"
  const minMatch = str.match(/(\d+)\s*(?:min|mins|m)/i);
  const hrMatch = str.match(/(\d+)\s*(?:hr|hrs|h)/i);
  const secMatch = str.match(/(\d+)\s*(?:sec|secs|s)/i);

  if (minMatch || hrMatch || secMatch) {
    let total = 0;
    if (hrMatch) total += parseInt(hrMatch[1], 10) * 3600;
    if (minMatch) total += parseInt(minMatch[1], 10) * 60;
    if (secMatch) total += parseInt(secMatch[1], 10);
    return total > 0 ? total : null;
  }

  return null;
}

/**
 * Normalizes release date to strict YYYY-MM-DD format.
 */
export function normalizeReleaseDate(val: any): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // Already standard YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = String(parseInt(ymdMatch[2], 10)).padStart(2, "0");
    const d = String(parseInt(ymdMatch[3], 10)).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Try parsing through Date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Normalizes timestamp to ISO 8601 UTC string.
 */
export function normalizeTimestamp(val: any, fallback?: string): string {
  if (val) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  if (fallback) {
    const fb = new Date(fallback);
    if (!isNaN(fb.getTime())) {
      return fb.toISOString();
    }
  }
  return new Date().toISOString();
}

/**
 * Converts any arbitrary legacy or raw video object into canonical Video JSON.
 * Normalizes field names, converts duration to seconds, strips redundant legacy fields,
 * and preserves all useful extra metadata.
 */
export function normalizeToCanonicalVideo(raw: Record<string, any>): CanonicalVideoJson | null {
  if (!raw || typeof raw !== "object") return null;

  const rawCode = raw.code || raw.id || raw.videoCode || raw.video_code || raw.canonicalCode || "";
  const code = normalizeCode(rawCode);
  if (!code) return null;

  const title = String(raw.title || code).trim();
  const thumbnail = String(raw.thumbnail || raw.coverImage || raw.cover || raw.image || "").trim() || null;
  const postUrl = String(raw.postUrl || raw.url || raw.link || "").trim() || null;

  // Normalize actress
  let actress: CanonicalActressRef | null = null;
  if (raw.actress && typeof raw.actress === "object" && raw.actress.name) {
    actress = {
      name: String(raw.actress.name).trim(),
      slug: normalizeSlug(raw.actress.slug || raw.actress.name),
    };
  } else if (raw.actressName || raw.actress_name) {
    const name = String(raw.actressName || raw.actress_name).trim();
    if (name) {
      actress = {
        name,
        slug: normalizeSlug(raw.actressSlug || raw.actress_slug || name),
      };
    }
  }

  // Normalize studio
  let studio: CanonicalStudioRef | null = null;
  if (raw.studio && typeof raw.studio === "object" && raw.studio.name) {
    studio = {
      name: String(raw.studio.name).trim(),
      slug: normalizeSlug(raw.studio.slug || raw.studio.name),
    };
  } else if (raw.studioName || raw.studio_name) {
    const name = String(raw.studioName || raw.studio_name).trim();
    if (name) {
      studio = {
        name,
        slug: normalizeSlug(raw.studioSlug || raw.studio_slug || name),
      };
    }
  }

  // Duration: converts any string/number representation to total seconds
  const duration = parseDurationToSeconds(raw.duration || raw.runtime || raw.videoDuration);

  // Release Date: normalizes to strict YYYY-MM-DD
  const releaseDate = normalizeReleaseDate(raw.releaseDate || raw.release_date || raw.date);

  // Timestamps
  const addedAt = normalizeTimestamp(raw.addedAt || raw.scrapedAt || raw.createdAt);
  const updatedAt = normalizeTimestamp(raw.updatedAt, addedAt);

  const canonical: CanonicalVideoJson = {
    code,
    title,
    actress,
    studio,
    duration,
    releaseDate,
    thumbnail,
    postUrl,
    addedAt,
    updatedAt,
  };

  // Obsolete redundant fields to remove
  const obsoleteFields = new Set([
    "code",
    "video_code",
    "videoCode",
    "canonicalCode",
    "id",
    "title",
    "thumbnail",
    "coverImage",
    "cover",
    "image",
    "postUrl",
    "url",
    "link",
    "actress",
    "actressName",
    "actress_name",
    "actressSlug",
    "actress_slug",
    "studio",
    "studioName",
    "studio_name",
    "studioSlug",
    "studio_slug",
    "duration",
    "runtime",
    "videoDuration",
    "releaseDate",
    "release_date",
    "date",
    "addedAt",
    "scrapedAt",
    "createdAt",
    "updatedAt",
  ]);

  // Preserve all extra useful existing metadata
  for (const [key, val] of Object.entries(raw)) {
    if (val !== undefined && val !== null && !obsoleteFields.has(key)) {
      canonical[key] = val;
    }
  }

  return canonical;
}
