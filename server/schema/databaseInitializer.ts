import { GitHubStorage } from "../storage/githubStorage";
import {
  createInitialCodesIndex,
  createInitialActressesIndex,
  createInitialStudiosIndex,
  createInitialVideosIndex,
  createInitialActressEntity,
  createInitialStudioEntity,
} from "./normalizers";
import {
  validateCodesIndex,
  validateActressesIndex,
  validateStudiosIndex,
  validateVideosIndex,
  ValidationResult,
} from "./validators";
import {
  CodesIndexFile,
  ActressesIndexFile,
  StudiosIndexFile,
  VideosIndexFile,
} from "./types";

export interface IndexFileStatus {
  path: string;
  exists: boolean;
  valid: boolean;
  errors: string[];
  totalCount: number;
  updatedAt?: string;
  sha?: string;
}

export interface DatabaseStatusReport {
  initialized: boolean;
  files: {
    codes: IndexFileStatus;
    actresses: IndexFileStatus;
    studios: IndexFileStatus;
    videos: IndexFileStatus;
  };
  samples: {
    codesIndex: CodesIndexFile;
    actressesIndex: ActressesIndexFile;
    studiosIndex: StudiosIndexFile;
    videosIndex: VideosIndexFile;
    actressEntity: unknown;
    studioEntity: unknown;
  };
}

export async function checkDatabaseIndexes(storage: GitHubStorage): Promise<DatabaseStatusReport> {
  const codesPath = "index/codes.json";
  const actressesPath = "index/actresses.json";
  const studiosPath = "index/studios.json";
  const videosPath = "index/videos.json";

  const [codesFile, actressesFile, studiosFile, videosFile] = await Promise.all([
    storage.readFile<CodesIndexFile>(codesPath),
    storage.readFile<ActressesIndexFile>(actressesPath),
    storage.readFile<StudiosIndexFile>(studiosPath),
    storage.readFile<VideosIndexFile>(videosPath),
  ]);

  const codesVal: ValidationResult = codesFile ? validateCodesIndex(codesFile.data) : { valid: false, errors: ["File does not exist"] };
  const actressesVal: ValidationResult = actressesFile ? validateActressesIndex(actressesFile.data) : { valid: false, errors: ["File does not exist"] };
  const studiosVal: ValidationResult = studiosFile ? validateStudiosIndex(studiosFile.data) : { valid: false, errors: ["File does not exist"] };
  const videosVal: ValidationResult = videosFile ? validateVideosIndex(videosFile.data) : { valid: false, errors: ["File does not exist"] };

  const allExist = Boolean(codesFile && actressesFile && studiosFile && videosFile);
  const allValid = codesVal.valid && actressesVal.valid && studiosVal.valid && videosVal.valid;

  const sampleActress = createInitialActressEntity("Sample Actress", ["Sample Alias"]);
  sampleActress.videos.push({
    code: "SSIS-001",
    title: "Sample Video Title",
    thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80",
    postUrl: "https://example.com/posts/ssis-001",
    studioSlug: "sample-studio",
    studioName: "Sample Studio",
    addedAt: new Date().toISOString(),
  });
  sampleActress.videoCount = 1;

  const sampleStudio = createInitialStudioEntity("Sample Studio", ["S1"]);
  sampleStudio.videos.push({
    code: "SSIS-001",
    title: "Sample Video Title",
    thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80",
    postUrl: "https://example.com/posts/ssis-001",
    actressSlug: "sample-actress",
    actressName: "Sample Actress",
    addedAt: new Date().toISOString(),
  });
  sampleStudio.videoCount = 1;

  const sampleCodes = createInitialCodesIndex();
  sampleCodes.totalCount = 1;
  sampleCodes.codes["SSIS-001"] = {
    code: "SSIS-001",
    title: "Sample Video Title",
    postUrl: "https://example.com/posts/ssis-001",
    actressSlug: "sample-actress",
    actressName: "Sample Actress",
    studioSlug: "sample-studio",
    studioName: "Sample Studio",
    addedAt: new Date().toISOString(),
  };

  const sampleActresses = createInitialActressesIndex();
  sampleActresses.totalCount = 1;
  sampleActresses.actresses.push({
    slug: "sample-actress",
    name: "Sample Actress",
    letter: "s",
    path: "pstar/s/sample-actress.json",
    videoCount: 1,
    updatedAt: new Date().toISOString(),
  });

  const sampleStudios = createInitialStudiosIndex();
  sampleStudios.totalCount = 1;
  sampleStudios.studios.push({
    slug: "sample-studio",
    name: "Sample Studio",
    letter: "s",
    path: "studio/s/sample-studio.json",
    videoCount: 1,
    updatedAt: new Date().toISOString(),
  });

  const sampleVideos = createInitialVideosIndex();
  sampleVideos.totalCount = 1;
  sampleVideos.videos.push({
    code: "SSIS-001",
    title: "Sample Video Title",
    thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80",
    postUrl: "https://example.com/posts/ssis-001",
    actressSlug: "sample-actress",
    actressName: "Sample Actress",
    studioSlug: "sample-studio",
    studioName: "Sample Studio",
    scrapedAt: new Date().toISOString(),
  });

  return {
    initialized: allExist && allValid,
    files: {
      codes: {
        path: storage.resolvePath(codesPath),
        exists: Boolean(codesFile),
        valid: codesVal.valid,
        errors: codesVal.errors,
        totalCount: codesFile?.data?.totalCount ?? 0,
        updatedAt: codesFile?.data?.updatedAt,
        sha: codesFile?.sha,
      },
      actresses: {
        path: storage.resolvePath(actressesPath),
        exists: Boolean(actressesFile),
        valid: actressesVal.valid,
        errors: actressesVal.errors,
        totalCount: actressesFile?.data?.totalCount ?? 0,
        updatedAt: actressesFile?.data?.updatedAt,
        sha: actressesFile?.sha,
      },
      studios: {
        path: storage.resolvePath(studiosPath),
        exists: Boolean(studiosFile),
        valid: studiosVal.valid,
        errors: studiosVal.errors,
        totalCount: studiosFile?.data?.totalCount ?? 0,
        updatedAt: studiosFile?.data?.updatedAt,
        sha: studiosFile?.sha,
      },
      videos: {
        path: storage.resolvePath(videosPath),
        exists: Boolean(videosFile),
        valid: videosVal.valid,
        errors: videosVal.errors,
        totalCount: videosFile?.data?.totalCount ?? 0,
        updatedAt: videosFile?.data?.updatedAt,
        sha: videosFile?.sha,
      },
    },
    samples: {
      codesIndex: sampleCodes,
      actressesIndex: sampleActresses,
      studiosIndex: sampleStudios,
      videosIndex: sampleVideos,
      actressEntity: sampleActress,
      studioEntity: sampleStudio,
    },
  };
}

export async function initializeDatabaseIndexes(storage: GitHubStorage): Promise<{
  created: string[];
  skipped: string[];
  commitSha?: string;
  report: DatabaseStatusReport;
}> {
  const currentStatus = await checkDatabaseIndexes(storage);
  const filesToCommit: Array<{ path: string; content: object }> = [];
  const created: string[] = [];
  const skipped: string[] = [];

  if (!currentStatus.files.codes.exists) {
    filesToCommit.push({
      path: "index/codes.json",
      content: createInitialCodesIndex(),
    });
    created.push("index/codes.json");
  } else {
    skipped.push("index/codes.json");
  }

  if (!currentStatus.files.actresses.exists) {
    filesToCommit.push({
      path: "index/actresses.json",
      content: createInitialActressesIndex(),
    });
    created.push("index/actresses.json");
  } else {
    skipped.push("index/actresses.json");
  }

  if (!currentStatus.files.studios.exists) {
    filesToCommit.push({
      path: "index/studios.json",
      content: createInitialStudiosIndex(),
    });
    created.push("index/studios.json");
  } else {
    skipped.push("index/studios.json");
  }

  if (!currentStatus.files.videos.exists) {
    filesToCommit.push({
      path: "index/videos.json",
      content: createInitialVideosIndex(),
    });
    created.push("index/videos.json");
  } else {
    skipped.push("index/videos.json");
  }

  let commitSha: string | undefined;

  if (filesToCommit.length > 0) {
    const commitResult = await storage.batchCommit(
      filesToCommit,
      `[Schema Setup] Initialize Avdb core database indexes (${filesToCommit.length} files)`
    );
    commitSha = commitResult.commitSha;
  }

  const updatedReport = await checkDatabaseIndexes(storage);

  return {
    created,
    skipped,
    commitSha,
    report: updatedReport,
  };
}
