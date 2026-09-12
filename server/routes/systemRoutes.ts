import { Router, Request, Response } from "express";
import { githubStorage } from "../storage";

const router = Router();

// Health check endpoint
router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Config & storage status endpoint
router.get("/config/status", async (_req: Request, res: Response) => {
  const config = githubStorage.getConfig();
  let rateLimit = null;

  if (config.hasToken) {
    try {
      rateLimit = await githubStorage.getRateLimit();
    } catch (err: unknown) {
      console.error("Failed to fetch GitHub rate limit:", err);
    }
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    githubConfigured: config.hasToken,
    repo: {
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
      root: config.databaseRoot,
    },
    rateLimit,
  });
});

// Storage diagnosis and verification self-test
router.post("/storage/test", async (_req: Request, res: Response) => {
  try {
    const report = await githubStorage.runSelfTest();
    res.json(report);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

// List files under a storage directory
router.get("/storage/files", async (req: Request, res: Response) => {
  try {
    const dirPath = (req.query.path as string) || "";
    const files = await githubStorage.listFiles(dirPath);
    res.json({ files, path: githubStorage.resolvePath(dirPath) });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Storage Performance & Cache Metrics
const getMetricsHandler = async (_req: Request, res: Response) => {
  try {
    const metrics = githubStorage.getPerformanceMetrics();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      metrics,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
};
router.get("/storage/metrics", getMetricsHandler);
router.get("/system/storage-metrics", getMetricsHandler);

// Invalidate or purge storage cache
router.post("/storage/cache/purge", async (req: Request, res: Response) => {
  try {
    const pattern = req.body?.pattern as string | undefined;
    const purgedCount = githubStorage.purgeCache(pattern);
    res.json({
      success: true,
      purgedCount,
      message: pattern
        ? `Purged cache entries matching '${pattern}'`
        : "Wiped complete storage cache",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Step 10 Automated Performance & Race Condition Test Suite
router.post("/system/step10-performance-test", async (_req: Request, res: Response) => {
  try {
    const report = await githubStorage.runStep10PerformanceTest();
    res.json(report);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Auto-commit status & pending uncommitted files
const getAutoCommitHandler = async (_req: Request, res: Response) => {
  try {
    const status = githubStorage.getAutoCommitStatus();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      ...status,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
};
router.get("/system/auto-commit", getAutoCommitHandler);
router.get("/storage/auto-commit", getAutoCommitHandler);

// Toggle or update auto-commit state
router.post("/system/auto-commit/toggle", async (req: Request, res: Response) => {
  try {
    const requestedState = req.body?.enabled as boolean | undefined;
    const currentState = githubStorage.isAutoCommitEnabled();
    const nextState = requestedState !== undefined ? requestedState : !currentState;
    githubStorage.setAutoCommit(nextState);

    const status = githubStorage.getAutoCommitStatus();
    res.json({
      success: true,
      message: nextState
        ? "Auto-commit to GitHub enabled (all operations push immediately)"
        : "Auto-commit to GitHub stopped (operations staged in memory)",
      ...status,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Commit all pending staged files to GitHub
router.post("/system/auto-commit/commit-pending", async (req: Request, res: Response) => {
  try {
    const customMessage = req.body?.message as string | undefined;
    const result = await githubStorage.commitAllPending(customMessage);
    const status = githubStorage.getAutoCommitStatus();
    res.json({
      success: true,
      result,
      message: result
        ? `Successfully committed ${result.filesCommitted} file(s) to GitHub`
        : "No pending files to commit",
      ...status,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Discard all uncommitted staged files
router.post("/system/auto-commit/discard-pending", async (_req: Request, res: Response) => {
  try {
    const { discardedCount } = githubStorage.discardPendingChanges();
    const status = githubStorage.getAutoCommitStatus();
    res.json({
      success: true,
      discardedCount,
      message: `Discarded ${discardedCount} uncommitted staged file(s)`,
      ...status,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

export default router;
