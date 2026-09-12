import { Router, Request, Response } from "express";
import { maintenanceService } from "../services";

const router = Router();

// Full Database & Index Diagnostics
router.get("/maintenance/diagnostics", async (_req: Request, res: Response) => {
  try {
    const report = await maintenanceService.runFullDiagnostics();
    res.json(report);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Full Master Indexes Rebuild from Ground Truth Entities
router.post("/maintenance/rebuild-indexes", async (_req: Request, res: Response) => {
  try {
    const result = await maintenanceService.rebuildAllIndexes();
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Auto-Repair Discovered Database Issues
router.post("/maintenance/repair", async (_req: Request, res: Response) => {
  try {
    const result = await maintenanceService.autoRepair();
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Step 11 Automated Verification Test Suite
router.post("/maintenance/step11-test-suite", async (_req: Request, res: Response) => {
  try {
    const report = await maintenanceService.runStep11MaintenanceTestSuite();
    res.json(report);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

export default router;
