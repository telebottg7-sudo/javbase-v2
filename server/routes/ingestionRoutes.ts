import { Router, Request, Response } from "express";
import { ingestionService } from "../services";

const router = Router();

// Ingest Single Video
router.post("/ingestion/ingest-video", async (req: Request, res: Response) => {
  try {
    const item = req.body;
    if (!item || !item.code || !item.title) {
      return res
        .status(400)
        .json({ error: "Missing required fields: 'code' and 'title'" });
    }
    const result = await ingestionService.ingestVideo(item);
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Ingest Batch of Videos
router.post("/ingestion/ingest-batch", async (req: Request, res: Response) => {
  try {
    const items = Array.isArray(req.body.items)
      ? req.body.items
      : Array.isArray(req.body.videos)
      ? req.body.videos
      : [];
    if (items.length === 0) {
      return res.status(400).json({ error: "Empty or invalid 'items' array" });
    }
    const result = await ingestionService.ingestBatch(items);
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Save Actress details & videos with duplicate filterout option
router.post("/ingestion/save-actress", async (req: Request, res: Response) => {
  try {
    const {
      slug,
      name,
      thumbnail,
      videoCount,
      bio,
      measurements,
      birthdate,
      aliases,
      videos,
      filterDuplicates,
      commitMessage,
    } = req.body;

    if (!slug && !name) {
      return res
        .status(400)
        .json({ error: "Missing required 'slug' or 'name' parameter" });
    }

    const result = await ingestionService.saveActressWithVideos({
      slug: slug || name,
      name: name || slug,
      thumbnail,
      videoCount,
      bio,
      measurements,
      birthdate,
      aliases,
      videos: Array.isArray(videos) ? videos : [],
      filterDuplicates: filterDuplicates !== false,
      commitMessage,
    });

    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Database Stats
router.get("/ingestion/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await ingestionService.getDatabaseStats();
    res.json(stats);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Step 6 Automated Test Suite
router.post("/ingestion/test-suite", async (_req: Request, res: Response) => {
  try {
    const report = await ingestionService.runStep6TestSuite();
    res.json(report);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Master Videos Index: Paginated, searchable, filterable
router.get("/videos", async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) || "").toLowerCase().trim();
    const actress = ((req.query.actress as string) || "").toLowerCase().trim();
    const studio = ((req.query.studio as string) || "").toLowerCase().trim();
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt((req.query.limit as string) || "24", 10))
    );

    const index = await ingestionService.getVideosIndex();
    let filtered = index.videos;

    if (q) {
      filtered = filtered.filter(
        (v) =>
          (v.code && v.code.toLowerCase().includes(q)) ||
          (v.title && v.title.toLowerCase().includes(q)) ||
          (v.actressName && v.actressName.toLowerCase().includes(q)) ||
          (v.studioName && v.studioName.toLowerCase().includes(q))
      );
    }
    if (actress) {
      filtered = filtered.filter(
        (v) =>
          (v.actressSlug && v.actressSlug.toLowerCase() === actress) ||
          (v.actressName && v.actressName.toLowerCase().includes(actress))
      );
    }
    if (studio) {
      filtered = filtered.filter(
        (v) =>
          (v.studioSlug && v.studioSlug.toLowerCase() === studio) ||
          (v.studioName && v.studioName.toLowerCase().includes(studio))
      );
    }

    const totalFound = filtered.length;
    const totalPages = Math.ceil(totalFound / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    res.json({
      totalCount: index.totalCount,
      totalFound,
      page,
      totalPages,
      limit,
      videos: paginated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Actresses Master Index: Paginated, letter-filterable, searchable
router.get("/actresses", async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) || "").toLowerCase().trim();
    const letter = ((req.query.letter as string) || "").toLowerCase().trim();
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt((req.query.limit as string) || "36", 10))
    );

    const index = await ingestionService.getActressesIndex();
    let filtered = index.actresses;

    if (q) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q)
      );
    }
    if (letter && letter !== "all") {
      if (letter === "#") {
        filtered = filtered.filter((a) => a.letter === "_");
      } else {
        filtered = filtered.filter((a) => a.letter === letter);
      }
    }

    const totalFound = filtered.length;
    const totalPages = Math.ceil(totalFound / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    res.json({
      totalCount: index.totalCount,
      totalFound,
      page,
      totalPages,
      limit,
      actresses: paginated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Single Sharded Actress Entity
router.get("/actresses/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const entity = await ingestionService.getActressEntity(slug);
    if (!entity) {
      return res.status(404).json({ error: `Actress '${slug}' not found` });
    }
    res.json(entity);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Studios Master Index: Paginated, letter-filterable, searchable
router.get("/studios", async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) || "").toLowerCase().trim();
    const letter = ((req.query.letter as string) || "").toLowerCase().trim();
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt((req.query.limit as string) || "36", 10))
    );

    const index = await ingestionService.getStudiosIndex();
    let filtered = index.studios;

    if (q) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)
      );
    }
    if (letter && letter !== "all") {
      if (letter === "#") {
        filtered = filtered.filter((s) => s.letter === "_");
      } else {
        filtered = filtered.filter((s) => s.letter === letter);
      }
    }

    const totalFound = filtered.length;
    const totalPages = Math.ceil(totalFound / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    res.json({
      totalCount: index.totalCount,
      totalFound,
      page,
      totalPages,
      limit,
      studios: paginated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Single Sharded Studio Entity
router.get("/studios/:slug", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const entity = await ingestionService.getStudioEntity(slug);
    if (!entity) {
      return res.status(404).json({ error: `Studio '${slug}' not found` });
    }
    res.json(entity);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

export default router;
