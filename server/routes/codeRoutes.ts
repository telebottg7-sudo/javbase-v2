import { Router, Request, Response } from "express";
import { codeRegistryService, ingestionService } from "../services";
import { javtifulScraper } from "../scrapers";
import { githubStorage } from "../storage";
import { syncPrefixIndexFiles } from "./databaseRoutes";

const router = Router();

// Get code categories summary
router.get("/code-categories", async (_req: Request, res: Response) => {
  try {
    const categories = await codeRegistryService.getCategorySummaries();
    res.json({ success: true, data: categories });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

router.get("/codes/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await codeRegistryService.getCategorySummaries();
    res.json({ success: true, categories });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Category number-wise details (e.g. /codes/category/SSIS?page=1&sort=number_asc)
router.get("/codes/category/:category", async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.max(1, Math.min(200, parseInt((req.query.limit as string) || "50", 10)));
    const sort = (req.query.sort as string) || "number_asc";
    const q = (req.query.q as string) || "";
    const minNum = req.query.minNum ? parseInt(req.query.minNum as string, 10) : undefined;
    const maxNum = req.query.maxNum ? parseInt(req.query.maxNum as string, 10) : undefined;
    const exactNum = req.query.exactNum ? parseInt(req.query.exactNum as string, 10) : undefined;

    const data = await codeRegistryService.getCategoryDetails(category, {
      page,
      limit,
      sort,
      q,
      minNum,
      maxNum,
      exactNum,
    });

    res.json({ success: true, data });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Track missing numbers in sequence and search & auto-harvest them with real-time log streaming
router.post("/codes/category/:category/find-missing", async (req: Request, res: Response) => {
  const isStream = req.query.stream === "true" || req.headers.accept?.includes("text/event-stream");

  if (isStream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
  }

  const sendEvent = (event: string, data: any) => {
    if (isStream) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    const { category } = req.params;
    const cleanCat = (category || "").toUpperCase().trim();
    if (!cleanCat) {
      if (isStream) {
        sendEvent("error", { error: "Missing category parameter" });
        return res.end();
      }
      return res.status(400).json({ success: false, error: "Missing category parameter" });
    }

    sendEvent("log", {
      timestamp: new Date().toLocaleTimeString(),
      level: "info",
      message: `[Init] Analyzing category index for ${cleanCat}...`,
      progress: 0,
    });

    // 1. Get current details to find active numbers
    const catDetails = await codeRegistryService.getCategoryDetails(cleanCat, { limit: 2000 });
    const existingSet = new Set((catDetails.allNumbers || []).map((n) => n.number));

    // Determine missing numbers
    const startNum = req.body.startNum ? parseInt(req.body.startNum, 10) : (catDetails.minNumber || 1);
    const endNum = req.body.endNum ? parseInt(req.body.endNum, 10) : (catDetails.maxNumber || 1);
    const maxToSearch = Math.min(500, Math.max(1, parseInt(req.body.maxToSearch || "30", 10)));

    let missingNumbersList: number[] = Array.isArray(req.body.missingNumbers) && req.body.missingNumbers.length > 0
      ? req.body.missingNumbers.map((n: any) => parseInt(n, 10)).filter((n: number) => !isNaN(n))
      : [];

    if (missingNumbersList.length === 0) {
      const minVal = Math.max(1, startNum);
      const maxVal = Math.max(minVal, endNum);
      for (let i = minVal; i <= maxVal; i++) {
        if (!existingSet.has(i)) {
          missingNumbersList.push(i);
        }
      }
    }

    const totalMissingInRange = missingNumbersList.length;
    const targetNumbers = missingNumbersList.slice(0, maxToSearch);

    sendEvent("init", {
      category: cleanCat,
      totalMissingInRange,
      targetNumbersCount: targetNumbers.length,
      targetNumbers,
    });

    if (targetNumbers.length === 0) {
      const emptyReport = {
        success: true,
        category: cleanCat,
        totalMissingInRange: 0,
        searchedCount: 0,
        foundCount: 0,
        stillMissingCount: 0,
        foundCodes: [],
        stillMissingCodes: [],
        remainingMissingCount: 0,
        message: `No missing code numbers found in ${cleanCat} range #${startNum} to #${endNum}.`,
      };

      sendEvent("log", {
        timestamp: new Date().toLocaleTimeString(),
        level: "info",
        message: `[Complete] No missing numbers found in sequence range #${startNum} to #${endNum}.`,
        progress: 100,
      });

      sendEvent("complete", emptyReport);

      if (isStream) {
        return res.end();
      }
      return res.json(emptyReport);
    }

    sendEvent("log", {
      timestamp: new Date().toLocaleTimeString(),
      level: "info",
      message: `[Start] Found ${totalMissingInRange} total missing sequence gaps. Beginning real-time web search for first ${targetNumbers.length} targets...`,
      progress: 5,
    });

    const foundItems: any[] = [];
    const foundCodes: string[] = [];
    const stillMissingCodes: string[] = [];

    // Search Javtiful for each missing number
    for (let index = 0; index < targetNumbers.length; index++) {
      const num = targetNumbers[index];
      const formattedNum = String(num).padStart(3, "0");
      const searchCode = `${cleanCat}-${formattedNum}`;
      const stepPct = Math.round(5 + ((index + 1) / targetNumbers.length) * 75);

      sendEvent("log", {
        timestamp: new Date().toLocaleTimeString(),
        level: "info",
        message: `[Searching ${index + 1}/${targetNumbers.length}] Querying online registry for ${searchCode}...`,
        currentCode: searchCode,
        progress: stepPct,
      });

      try {
        const searchResult = await javtifulScraper.searchByCode(searchCode);
        const matches = (searchResult.items || []).filter((it) => {
          if (!it.code) return false;
          const norm = it.code.toUpperCase();
          return norm === searchCode || norm === `${cleanCat}-${num}`;
        });

        if (matches.length > 0) {
          const bestMatch = matches[0];
          let enrichedItem = { ...bestMatch };

          sendEvent("log", {
            timestamp: new Date().toLocaleTimeString(),
            level: "success",
            message: `[FOUND] Match located for ${searchCode}: "${bestMatch.title || searchCode}". Harvesting full stream details...`,
            currentCode: searchCode,
            progress: stepPct,
          });

          if (bestMatch.postUrl) {
            try {
              const details = await javtifulScraper.getPostDetails(bestMatch.postUrl);
              enrichedItem.actress = details.actress || bestMatch.actress;
              enrichedItem.actressSlug = details.actressSlug || bestMatch.actressSlug;
              enrichedItem.studio = details.studio || bestMatch.studio;
              enrichedItem.studioSlug = details.studioSlug || bestMatch.studioSlug;
              enrichedItem.duration = details.duration || bestMatch.duration;
              enrichedItem.releaseDate = details.releaseDate || bestMatch.releaseDate;
              if (details.coverImage && (!enrichedItem.coverImage || enrichedItem.coverImage.includes("placeholder"))) {
                enrichedItem.coverImage = details.coverImage;
              }
            } catch (err) {
              console.warn(`[Missing Search] Could not enrich ${searchCode}:`, err);
            }
          }

          const itemObj = {
            code: enrichedItem.code || searchCode,
            title: enrichedItem.title || searchCode,
            postUrl: enrichedItem.postUrl || "",
            thumbnail: enrichedItem.coverImage || (enrichedItem as any).thumbnail || "",
            actress: enrichedItem.actress || "",
            actressSlug: enrichedItem.actressSlug || "",
            studio: enrichedItem.studio || "",
            studioSlug: enrichedItem.studioSlug || "",
            duration: enrichedItem.duration || "",
            releaseDate: enrichedItem.releaseDate || "",
          };

          foundItems.push(itemObj);
          foundCodes.push(enrichedItem.code || searchCode);

          sendEvent("found", {
            code: searchCode,
            item: itemObj,
            foundTotal: foundItems.length,
          });

          sendEvent("log", {
            timestamp: new Date().toLocaleTimeString(),
            level: "success",
            message: `[ENRICHED] Verified ${searchCode} (${enrichedItem.actress ? `Actress: ${enrichedItem.actress}` : "Metadata extracted"})`,
            currentCode: searchCode,
            progress: stepPct,
          });
        } else {
          stillMissingCodes.push(searchCode);
          sendEvent("log", {
            timestamp: new Date().toLocaleTimeString(),
            level: "warning",
            message: `[NOT FOUND] No online match for ${searchCode} on primary provider. Skipping.`,
            currentCode: searchCode,
            progress: stepPct,
          });
        }
      } catch (err: any) {
        console.warn(`[Missing Search] Error searching for ${searchCode}:`, err);
        stillMissingCodes.push(searchCode);
        sendEvent("log", {
          timestamp: new Date().toLocaleTimeString(),
          level: "error",
          message: `[ERROR] Network error for ${searchCode}: ${err.message || String(err)}`,
          currentCode: searchCode,
          progress: stepPct,
        });
      }
    }

    // Ingest found items into database and storage
    let ingestedCount = 0;
    if (foundItems.length > 0) {
      sendEvent("log", {
        timestamp: new Date().toLocaleTimeString(),
        level: "info",
        message: `[DATABASE INGEST] Committing ${foundItems.length} newly discovered release entries into primary storage and prefix indices...`,
        progress: 85,
      });

      const autoCommitEnabled = githubStorage.isAutoCommitEnabled();
      const batchResult = await ingestionService.bulkIngestTransaction(foundItems, {
        commitMessage: `[Missing Recovery] Ingested ${foundItems.length} recovered releases for ${cleanCat} (Auto-Commit: ${autoCommitEnabled ? "ON" : "OFF"})`,
      });
      ingestedCount = batchResult.ingestedCount;
      await syncPrefixIndexFiles().catch(() => {});

      sendEvent("log", {
        timestamp: new Date().toLocaleTimeString(),
        level: "success",
        message: `[INDEX UPDATED] Successfully persisted ${ingestedCount} new releases to database cache and GitHub repository!`,
        progress: 98,
      });
    } else {
      sendEvent("log", {
        timestamp: new Date().toLocaleTimeString(),
        level: "info",
        message: `[INGEST SKIPPED] 0 matches found among missing code queries. No database writes required.`,
        progress: 95,
      });
    }

    const finalReport = {
      success: true,
      category: cleanCat,
      range: { startNum, endNum },
      totalMissingInRange,
      searchedCount: targetNumbers.length,
      foundCount: foundItems.length,
      ingestedCount,
      stillMissingCount: stillMissingCodes.length,
      foundItems,
      foundCodes,
      stillMissingCodes,
      remainingMissingCount: totalMissingInRange - foundItems.length,
      message: `Searched ${targetNumbers.length} missing numbers for ${cleanCat}. Found and registered ${foundItems.length} new releases!`,
    };

    sendEvent("log", {
      timestamp: new Date().toLocaleTimeString(),
      level: "complete",
      message: `[DONE] Missing code recovery operation complete. Found ${foundItems.length} releases, ${stillMissingCodes.length} unreleased.`,
      progress: 100,
    });

    sendEvent("complete", finalReport);

    if (isStream) {
      return res.end();
    }
    res.json(finalReport);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    sendEvent("log", {
      timestamp: new Date().toLocaleTimeString(),
      level: "error",
      message: `[FATAL ERROR] Operation failed: ${errorMsg}`,
      progress: 100,
    });
    if (isStream) {
      sendEvent("error", { error: errorMsg });
      return res.end();
    }
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Single code file details
router.get("/code/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const data = await codeRegistryService.getCodeFile(code);
    if (!data) {
      return res.status(404).json({ success: false, error: "Code not found" });
    }
    res.json({ success: true, data });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Code Registry: Stats
router.get("/codes/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await codeRegistryService.getStats();
    res.json(stats);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Code Registry: Single Check
router.get("/codes/check", async (req: Request, res: Response) => {
  try {
    const code = (req.query.code as string) || "";
    const result = await codeRegistryService.checkCode(code);
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Code Registry: Batch Check
router.post("/codes/check-batch", async (req: Request, res: Response) => {
  try {
    const codes = Array.isArray(req.body.codes) ? req.body.codes : [];
    const results = await codeRegistryService.checkBatch(codes);
    res.json({ results });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Code Registry: Register Codes
router.post("/codes/register", async (req: Request, res: Response) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const result = await codeRegistryService.registerCodes(items);
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Code Registry: Automated Deduplication Self-Test
router.post("/codes/test-dedup", async (_req: Request, res: Response) => {
  try {
    const report = await codeRegistryService.runDeduplicationTest();
    res.json(report);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Codes Master Index: Paginated, searchable list
router.get("/codes", async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) || "").toUpperCase().trim();
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt((req.query.limit as string) || "50", 10))
    );

    const { index } = await codeRegistryService.getOrLoadIndex();
    let codeEntries = Object.values(index.codes);

    if (q) {
      codeEntries = codeEntries.filter(
        (c) =>
          c.code.toUpperCase().includes(q) ||
          (c.title && c.title.toLowerCase().includes(q.toLowerCase())) ||
          (c.actressName &&
            c.actressName.toLowerCase().includes(q.toLowerCase())) ||
          (c.studioName &&
            c.studioName.toLowerCase().includes(q.toLowerCase()))
      );
    }

    const totalFound = codeEntries.length;
    const totalPages = Math.ceil(totalFound / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = codeEntries.slice(startIndex, startIndex + limit);

    res.json({
      totalCount: index.totalCount,
      totalFound,
      page,
      totalPages,
      limit,
      codes: paginated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

export default router;
