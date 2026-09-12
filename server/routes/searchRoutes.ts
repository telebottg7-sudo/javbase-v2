import { Router, Request, Response } from "express";
import { searchService } from "../services";
import { createMediaProxyHandler } from "./mediaProxy";

const router = Router();

// Universal Cross-Index Search Endpoint
router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const type = (req.query.type as any) || "all";
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "24", 10);

    const result = await searchService.universalSearch({
      query: q,
      type,
      page,
      limit,
    });

    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Deep Video Metadata & Media Harvester Endpoint
router.get("/media/harvest", async (req: Request, res: Response) => {
  try {
    const target =
      (req.query.url as string) || (req.query.code as string) || "";
    if (!target) {
      return res
        .status(400)
        .json({ error: "Query parameter 'url' or 'code' is required" });
    }

    const media = await searchService.harvestMediaDetails(target);
    res.json(media);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// This is deliberately not a general-purpose URL proxy: the handler accepts only
// the Javtiful media host allow-list and forwards Range for seekable playback.
router.get("/media/stream", createMediaProxyHandler());

// Step 8 Automated Verification Test Suite
router.post("/search/step8-test-suite", async (_req: Request, res: Response) => {
  try {
    const report = await searchService.runStep8TestSuite();
    res.json(report);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

export default router;
