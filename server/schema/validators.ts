import {
  CodesIndexFile,
  ActressesIndexFile,
  StudiosIndexFile,
  VideosIndexFile,
  ActressEntity,
  StudioEntity,
} from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCodesIndex(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Data is not an object"] };
  }

  const index = data as Partial<CodesIndexFile>;
  if (typeof index.version !== "number") errors.push("Missing or invalid 'version' field");
  if (!index.updatedAt || typeof index.updatedAt !== "string") errors.push("Missing or invalid 'updatedAt' field");
  if (typeof index.totalCount !== "number") errors.push("Missing or invalid 'totalCount' field");
  if (!index.codes || typeof index.codes !== "object" || Array.isArray(index.codes)) {
    errors.push("Missing or invalid 'codes' map dictionary");
  }

  return { valid: errors.length === 0, errors };
}

export function validateActressesIndex(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Data is not an object"] };
  }

  const index = data as Partial<ActressesIndexFile>;
  if (typeof index.version !== "number") errors.push("Missing or invalid 'version' field");
  if (!index.updatedAt || typeof index.updatedAt !== "string") errors.push("Missing or invalid 'updatedAt' field");
  if (typeof index.totalCount !== "number") errors.push("Missing or invalid 'totalCount' field");
  if (!Array.isArray(index.actresses)) {
    errors.push("Missing or invalid 'actresses' array");
  }

  return { valid: errors.length === 0, errors };
}

export function validateStudiosIndex(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Data is not an object"] };
  }

  const index = data as Partial<StudiosIndexFile>;
  if (typeof index.version !== "number") errors.push("Missing or invalid 'version' field");
  if (!index.updatedAt || typeof index.updatedAt !== "string") errors.push("Missing or invalid 'updatedAt' field");
  if (typeof index.totalCount !== "number") errors.push("Missing or invalid 'totalCount' field");
  if (!Array.isArray(index.studios)) {
    errors.push("Missing or invalid 'studios' array");
  }

  return { valid: errors.length === 0, errors };
}

export function validateVideosIndex(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Data is not an object"] };
  }

  const index = data as Partial<VideosIndexFile>;
  if (typeof index.version !== "number") errors.push("Missing or invalid 'version' field");
  if (!index.updatedAt || typeof index.updatedAt !== "string") errors.push("Missing or invalid 'updatedAt' field");
  if (typeof index.totalCount !== "number") errors.push("Missing or invalid 'totalCount' field");
  if (!Array.isArray(index.videos)) {
    errors.push("Missing or invalid 'videos' array");
  }

  return { valid: errors.length === 0, errors };
}

export function validateActressEntity(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Data is not an object"] };
  }

  const entity = data as Partial<ActressEntity>;
  if (!entity.slug || typeof entity.slug !== "string") errors.push("Missing 'slug'");
  if (!entity.name || typeof entity.name !== "string") errors.push("Missing 'name'");
  if (!entity.letter || typeof entity.letter !== "string") errors.push("Missing 'letter'");
  if (typeof entity.videoCount !== "number") errors.push("Missing 'videoCount'");
  if (!Array.isArray(entity.videos)) errors.push("Missing 'videos' array");

  return { valid: errors.length === 0, errors };
}

export function validateStudioEntity(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Data is not an object"] };
  }

  const entity = data as Partial<StudioEntity>;
  if (!entity.slug || typeof entity.slug !== "string") errors.push("Missing 'slug'");
  if (!entity.name || typeof entity.name !== "string") errors.push("Missing 'name'");
  if (!entity.letter || typeof entity.letter !== "string") errors.push("Missing 'letter'");
  if (typeof entity.videoCount !== "number") errors.push("Missing 'videoCount'");
  if (!Array.isArray(entity.videos)) errors.push("Missing 'videos' array");

  return { valid: errors.length === 0, errors };
}
