import {
  CodesIndexFile,
  ActressesIndexFile,
  StudiosIndexFile,
  VideosIndexFile,
  LatestIndexFile,
  ActressEntity,
  StudioEntity,
} from "./types";

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
 * e.g. "yua-mikami" -> "pstar/y/yua-mikami.json"
 */
export function getActressPath(slugOrName: string): string {
  const slug = normalizeSlug(slugOrName);
  const letter = getShardLetter(slug);
  return `pstar/${letter}/${slug}.json`;
}

/**
 * Computes the canonical relative storage path for a studio entity.
 * e.g. "s1-no-1-style" -> "studio/s/s1-no-1-style.json"
 */
export function getStudioPath(slugOrName: string): string {
  const slug = normalizeSlug(slugOrName);
  const letter = getShardLetter(slug);
  return `studio/${letter}/${slug}.json`;
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
 * E.g., "DSOD-123" -> "DSOD"
 * "10MUSUME-050515-01" -> "10MUSUME"
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
 * Extracts numeric sequence value and formatted string from code.
 * e.g. "SSIS-001" -> { numberVal: 1, numberFormatted: "001" }
 * "ABP-123" -> { numberVal: 123, numberFormatted: "123" }
 */
export function extractCodeNumber(code: string): { numberVal: number; numberFormatted: string } {
  if (!code) return { numberVal: 0, numberFormatted: "0" };
  const parts = code.split("-");
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    const num = parseInt(lastPart, 10);
    if (!isNaN(num)) {
      return { numberVal: num, numberFormatted: lastPart };
    }
  }
  const match = code.match(/(\d+)/g);
  if (match && match.length > 0) {
    const lastNumStr = match[match.length - 1];
    const num = parseInt(lastNumStr, 10);
    return { numberVal: isNaN(num) ? 0 : num, numberFormatted: lastNumStr };
  }
  return { numberVal: 0, numberFormatted: "0" };
}

/**
 * Computes canonical relative storage path for a video code entity.
 * e.g. "DSOD-123" -> "codes/DSOD/DSOD-123.json"
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
 * Factory for a new, valid empty CodesIndexFile (database/index/codes.json)
 */
export function createInitialCodesIndex(): CodesIndexFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    totalCount: 0,
    codes: {},
  };
}

/**
 * Factory for a new, valid empty ActressesIndexFile (database/index/actresses.json)
 */
export function createInitialActressesIndex(): ActressesIndexFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    totalCount: 0,
    actresses: [],
  };
}

/**
 * Factory for a new, valid empty StudiosIndexFile (database/index/studios.json)
 */
export function createInitialStudiosIndex(): StudiosIndexFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    totalCount: 0,
    studios: [],
  };
}

/**
 * Factory for a new, valid empty VideosIndexFile (database/index/videos.json)
 */
export function createInitialVideosIndex(): VideosIndexFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    totalCount: 0,
    videos: [],
  };
}

/**
 * Factory for a new, valid empty LatestIndexFile (database/index/latest.json)
 */
export function createInitialLatestIndex(): LatestIndexFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    totalCount: 0,
    videos: [],
  };
}

/**
 * Factory for a new Actress entity record (database/pstar/{letter}/{slug}.json)
 */
export function createInitialActressEntity(
  name: string,
  aliases: string[] = [],
  thumbnail?: string
): ActressEntity {
  const slug = normalizeSlug(name);
  const letter = getShardLetter(slug);
  const now = new Date().toISOString();

  return {
    slug,
    name: name.trim(),
    letter,
    aliases: aliases.map((a) => a.trim()).filter(Boolean),
    thumbnail: thumbnail || "",
    videoCount: 0,
    videos: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Factory for a new Studio entity record (database/studio/{letter}/{slug}.json)
 */
export function createInitialStudioEntity(
  name: string,
  aliases: string[] = [],
  thumbnail?: string
): StudioEntity {
  const slug = normalizeSlug(name);
  const letter = getShardLetter(slug);
  const now = new Date().toISOString();

  return {
    slug,
    name: name.trim(),
    letter,
    aliases: aliases.map((a) => a.trim()).filter(Boolean),
    thumbnail: thumbnail || "",
    videoCount: 0,
    videos: [],
    createdAt: now,
    updatedAt: now,
  };
}
