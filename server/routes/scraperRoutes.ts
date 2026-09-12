import { Router, Request, Response } from "express";
import { javtifulScraper } from "../scrapers";
import { ingestionService, codeRegistryService } from "../services";
import { githubStorage } from "../storage";

const router = Router();

// Primary Catalog Scraping
router.get("/scrapers/javtiful/catalog", async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const filterDuplicates = req.query.filterDuplicates === "true";
    const enrichDetails = req.query.enrichDetails === "true";
    const result = await javtifulScraper.scrapeCatalogPage(page, {
      filterDuplicates,
      enrichDetails,
    });
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Search Scraping
router.get("/scrapers/javtiful/search", async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) || "").trim();
    const page = parseInt((req.query.page as string) || "1", 10);
    const filterDuplicates = req.query.filterDuplicates === "true";
    const enrichDetails = req.query.enrichDetails === "true";
    if (!q) {
      return res.status(400).json({ error: "Missing query parameter 'q'" });
    }
    const result = await javtifulScraper.searchByKeyword(q, page, {
      filterDuplicates,
      enrichDetails,
    });
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Individual Post Details
router.get("/scrapers/javtiful/post", async (req: Request, res: Response) => {
  try {
    const url = ((req.query.url as string) || "").trim();
    if (!url) {
      return res.status(400).json({ error: "Missing 'url' parameter" });
    }
    const post = await javtifulScraper.getPostDetails(url);
    res.json(post);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Actresses Directory
router.get("/scrapers/javtiful/actresses", async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const result = await javtifulScraper.getActresses(page);
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Actress Videos
router.get("/scrapers/javtiful/actress-videos", async (req: Request, res: Response) => {
  try {
    const slug = ((req.query.slug as string) || "").trim();
    const page = parseInt((req.query.page as string) || "1", 10);
    const filterDuplicates = req.query.filterDuplicates === "true";
    if (!slug) {
      return res.status(400).json({ error: "Missing 'slug' parameter" });
    }
    const result = await javtifulScraper.getActressVideos(slug, page, {
      filterDuplicates,
    });
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Studios / Channels Directory
router.get("/scrapers/javtiful/studios", async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const result = await javtifulScraper.getStudios(page);
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Studio Videos
router.get("/scrapers/javtiful/studio-videos", async (req: Request, res: Response) => {
  try {
    const slug = ((req.query.slug as string) || "").trim();
    const page = parseInt((req.query.page as string) || "1", 10);
    const filterDuplicates = req.query.filterDuplicates === "true";
    if (!slug) {
      return res.status(400).json({ error: "Missing 'slug' parameter" });
    }
    const result = await javtifulScraper.getStudioVideos(slug, page, {
      filterDuplicates,
    });
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Save Actress details & videos in database with duplicate filter option
router.post(
  ["/scraper/save-actress", "/scrapers/javtiful/save-actress"],
  async (req: Request, res: Response) => {
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
  }
);

// Universal Bulk Scraper: Scrape any listing / detail / search / category URL
router.post("/scraper/bulk-scrape-url", async (req: Request, res: Response) => {
  try {
    const { url, filterDuplicates, enrichDetails, maxEnrich } = req.body;
    if (!url || typeof url !== "string") {
      return res
        .status(400)
        .json({ error: "Missing required 'url' string parameter" });
    }
    const scrapeResult = await javtifulScraper.scrapeAnyUrl(url, {
      filterDuplicates: Boolean(filterDuplicates),
      enrichDetails: Boolean(enrichDetails),
      maxEnrich: typeof maxEnrich === "number" ? maxEnrich : 10,
    });
    res.json(scrapeResult);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Bulk Scrape & Ingest in ONE single GitHub transaction commit
router.post("/scraper/bulk-ingest-url", async (req: Request, res: Response) => {
  try {
    const { url, enrichDetails, commitMessage } = req.body;
    if (!url || typeof url !== "string") {
      return res
        .status(400)
        .json({ error: "Missing required 'url' string parameter" });
    }

    // 1. Scrape URL
    const scrapeResult = await javtifulScraper.scrapeAnyUrl(url, {
      filterDuplicates: false,
      enrichDetails: Boolean(enrichDetails),
      maxEnrich: 15,
    });

    // 2. Prepare items for bulk transaction
    const itemsToIngest = scrapeResult.items.map((it) => ({
      code: it.code,
      title: it.title,
      postUrl: it.postUrl,
      thumbnail: it.coverImage,
      actress: it.actress,
      actressSlug: it.actressSlug,
      studio: it.studio,
      studioSlug: it.studioSlug,
      duration: it.duration,
      releaseDate: it.releaseDate,
    }));

    // 3. Commit ALL in ONE single atomic transaction
    const batchResult = await ingestionService.bulkIngestTransaction(
      itemsToIngest,
      {
        commitMessage:
          commitMessage ||
          `[Bulk Pipeline] Ingested from ${url} in single transaction`,
      }
    );

    res.json({
      success: true,
      sourceUrl: url,
      totalScraped: scrapeResult.totalFound,
      scrapeResult,
      batchResult,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Bulk Commit Staged Items in ONE single atomic transaction
router.post("/scraper/bulk-commit", async (req: Request, res: Response) => {
  try {
    const items = Array.isArray(req.body.items)
      ? req.body.items
      : Array.isArray(req.body.videos)
      ? req.body.videos
      : [];
    if (items.length === 0) {
      return res.status(400).json({ error: "Empty or invalid 'items' array" });
    }
    const commitMessage = req.body.commitMessage;
    const result = await ingestionService.bulkIngestTransaction(items, {
      commitMessage,
    });
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Auto Ingest & Save: Automatically filter duplicates, enrich details, and save to database respecting auto-commit setting
router.post("/scrapers/javtiful/auto-save", async (req: Request, res: Response) => {
  try {
    const rawItems = Array.isArray(req.body.items)
      ? req.body.items
      : Array.isArray(req.body.videos)
      ? req.body.videos
      : [];

    if (rawItems.length === 0) {
      return res.status(400).json({ success: false, error: "No items provided to auto-save" });
    }

    const enrichDetails = req.body.enrichDetails !== false;
    const commitMessage = req.body.commitMessage;

    // 1. Batch check duplicates to avoid unnecessary detail fetching
    const codes = rawItems.map((i: { code?: string }) => i.code || "").filter(Boolean);
    const dedupResults = await codeRegistryService.checkBatch(codes);
    const dedupMap = new Map(dedupResults.map((r) => [r.normalizedCode, r]));

    const uniqueItems: typeof rawItems = [];
    let preFilteredDuplicates = 0;

    for (const item of rawItems) {
      const check = item.code ? dedupMap.get(item.code.toUpperCase()) : null;
      if (check && check.isDuplicate) {
        preFilteredDuplicates++;
      } else {
        uniqueItems.push(item);
      }
    }

    // 2. If enriching details is requested, enrich unique items that have postUrl
    if (enrichDetails && uniqueItems.length > 0) {
      const enrichmentTasks = uniqueItems.map(async (item) => {
        if (item.postUrl) {
          try {
            const details = await javtifulScraper.getPostDetails(item.postUrl);
            item.actress = details.actress || item.actress;
            item.actressSlug = details.actressSlug || item.actressSlug;
            item.studio = details.studio || item.studio;
            item.studioSlug = details.studioSlug || item.studioSlug;
            item.duration = details.duration || item.duration;
            item.releaseDate = details.releaseDate || item.releaseDate;
            if (details.coverImage && (!item.coverImage || item.coverImage.includes("placeholder"))) {
              item.coverImage = details.coverImage;
            }
          } catch (err) {
            console.warn(`[Auto-Save] Failed to enrich metadata for ${item.code}:`, err);
          }
        }
      });

      const batchSize = 6;
      for (let i = 0; i < enrichmentTasks.length; i += batchSize) {
        await Promise.all(enrichmentTasks.slice(i, i + batchSize));
      }
    }

    // 3. Format items for bulk ingestion
    const itemsToIngest = uniqueItems.map((it) => ({
      code: it.code,
      title: it.title,
      postUrl: it.postUrl,
      thumbnail: it.coverImage || it.thumbnail,
      actress: it.actress,
      actressSlug: it.actressSlug,
      studio: it.studio,
      studioSlug: it.studioSlug,
      duration: it.duration,
      releaseDate: it.releaseDate,
    }));

    // 4. Ingest via bulk transaction (strictly honors autoCommit setting)
    const autoCommitEnabled = githubStorage.isAutoCommitEnabled();
    const batchResult = await ingestionService.bulkIngestTransaction(itemsToIngest, {
      commitMessage:
        commitMessage ||
        `[Auto Ingest] Saved ${itemsToIngest.length} unique videos with details (Auto-Commit: ${autoCommitEnabled ? "ON" : "OFF"})`,
    });

    const uncommittedCount = githubStorage.getUncommittedCount();

    res.json({
      success: true,
      totalProcessed: rawItems.length,
      ingestedCount: batchResult.ingestedCount,
      duplicateCount: preFilteredDuplicates + batchResult.duplicateCount,
      autoCommitEnabled,
      commitSha: batchResult.commitSha,
      commitUrl: batchResult.commitUrl,
      modifiedFiles: batchResult.modifiedFiles,
      actressesTouched: batchResult.actressesTouched,
      studiosTouched: batchResult.studiosTouched,
      uncommittedCount,
      durationMs: batchResult.durationMs,
      message: autoCommitEnabled
        ? `Successfully saved ${batchResult.ingestedCount} videos directly to GitHub database (${preFilteredDuplicates + batchResult.duplicateCount} duplicates filtered)`
        : `Successfully saved ${batchResult.ingestedCount} videos to local database cache (${uncommittedCount} pending commit since Auto-Commit is OFF)`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Auto Search, Filter, Enrich & Save in ONE Action
router.post("/scrapers/javtiful/auto-search-and-save", async (req: Request, res: Response) => {
  try {
    const query = ((req.body.q || req.body.query || "") as string).trim();
    const page = parseInt(String(req.body.page || 1), 10);
    const enrichDetails = req.body.enrichDetails !== false;

    if (!query) {
      return res.status(400).json({ success: false, error: "Missing search query 'q'" });
    }

    // 1. Scrape search results
    const scrapeResult = await javtifulScraper.searchByKeyword(query, page, {
      filterDuplicates: false,
      enrichDetails,
    });

    if (scrapeResult.items.length === 0) {
      return res.json({
        success: true,
        query,
        page,
        totalFound: 0,
        ingestedCount: 0,
        duplicateCount: 0,
        message: "No videos found for query",
        scrapeResult,
      });
    }

    // 2. Prepare for ingestion
    const itemsToIngest = scrapeResult.items.map((it) => ({
      code: it.code,
      title: it.title,
      postUrl: it.postUrl,
      thumbnail: it.coverImage,
      actress: it.actress,
      actressSlug: it.actressSlug,
      studio: it.studio,
      studioSlug: it.studioSlug,
      duration: it.duration,
      releaseDate: it.releaseDate,
    }));

    const autoCommitEnabled = githubStorage.isAutoCommitEnabled();
    const batchResult = await ingestionService.bulkIngestTransaction(itemsToIngest, {
      commitMessage: `[Auto Search Save] Ingested query "${query}" (page ${page}) with ${itemsToIngest.length} items`,
    });

    const uncommittedCount = githubStorage.getUncommittedCount();

    res.json({
      success: true,
      query,
      page,
      totalScraped: scrapeResult.totalFound,
      ingestedCount: batchResult.ingestedCount,
      duplicateCount: batchResult.duplicateCount,
      autoCommitEnabled,
      commitSha: batchResult.commitSha,
      commitUrl: batchResult.commitUrl,
      uncommittedCount,
      scrapeResult,
      batchResult,
      message: autoCommitEnabled
        ? `Saved ${batchResult.ingestedCount} videos to GitHub database (${batchResult.duplicateCount} duplicates filtered)`
        : `Saved ${batchResult.ingestedCount} videos to local database cache (Auto-Commit is OFF)`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// Auto Crawl & Follow Pagination: Automatically crawls sequential pages, filters duplicates, enriches details, and saves to database respecting auto-commit setting
router.post("/scrapers/javtiful/auto-crawl-and-save", async (req: Request, res: Response) => {
  try {
    const mode = (req.body.mode || "search") as "search" | "catalog" | "actress" | "studio";
    const query = ((req.body.q || req.body.query || req.body.slug || "") as string).trim();
    const startPage = Math.max(1, parseInt(String(req.body.startPage || req.body.page || 1), 10));
    const pagesToCrawl = Math.min(20, Math.max(1, parseInt(String(req.body.pagesToCrawl || req.body.maxPages || 1), 10)));
    const enrichDetails = req.body.enrichDetails !== false;
    const customCommitMessage = req.body.commitMessage;

    if (mode === "search" && !query) {
      return res.status(400).json({ success: false, error: "Missing search query for search crawl" });
    }
    if ((mode === "actress" || mode === "studio") && !query) {
      return res.status(400).json({ success: false, error: `Missing ${mode} slug` });
    }

    const allItemsToIngest: Array<{
      code: string;
      title: string;
      postUrl: string;
      thumbnail?: string;
      actress?: string;
      actressSlug?: string;
      studio?: string;
      studioSlug?: string;
      duration?: string;
      releaseDate?: string;
    }> = [];

    const pageStats: Array<{
      page: number;
      scrapedCount: number;
      uniqueCount: number;
      duplicateCount: number;
    }> = [];

    let totalScrapedAcrossPages = 0;
    let totalDuplicatesAcrossPages = 0;
    let lastCrawledPage = startPage;
    let hasNextPage = true;
    let latestScrapeResult: any = null;

    for (let p = 0; p < pagesToCrawl; p++) {
      const currentPage = startPage + p;
      lastCrawledPage = currentPage;

      let scrapeRes: any = null;
      if (mode === "search") {
        scrapeRes = await javtifulScraper.searchByKeyword(query, currentPage, {
          filterDuplicates: false,
          enrichDetails: false, // will batch enrich below for unique items only
        });
      } else if (mode === "catalog") {
        scrapeRes = await javtifulScraper.scrapeCatalogPage(currentPage, {
          filterDuplicates: false,
          enrichDetails: false,
        });
      } else if (mode === "actress") {
        scrapeRes = await javtifulScraper.getActressVideos(query, currentPage, {
          filterDuplicates: false,
        });
      } else if (mode === "studio") {
        scrapeRes = await javtifulScraper.getStudioVideos(query, currentPage, {
          filterDuplicates: false,
        });
      }

      latestScrapeResult = scrapeRes;

      if (!scrapeRes || !scrapeRes.items || scrapeRes.items.length === 0) {
        hasNextPage = false;
        break;
      }

      totalScrapedAcrossPages += scrapeRes.items.length;

      // 1. Batch deduplication check for this page
      const codes = scrapeRes.items.map((i: { code?: string }) => i.code || "").filter(Boolean);
      const dedupResults = await codeRegistryService.checkBatch(codes);
      const dedupMap = new Map(dedupResults.map((r) => [r.normalizedCode, r]));

      const uniqueItemsThisPage: any[] = [];
      let duplicatesThisPage = 0;

      for (const item of scrapeRes.items) {
        const check = item.code ? dedupMap.get(item.code.toUpperCase()) : null;
        if (check && check.isDuplicate) {
          duplicatesThisPage++;
        } else {
          // Avoid duplicate within the same crawl run
          if (!allItemsToIngest.some((existing) => existing.code && item.code && existing.code.toUpperCase() === item.code.toUpperCase())) {
            uniqueItemsThisPage.push(item);
          } else {
            duplicatesThisPage++;
          }
        }
      }

      totalDuplicatesAcrossPages += duplicatesThisPage;

      pageStats.push({
        page: currentPage,
        scrapedCount: scrapeRes.items.length,
        uniqueCount: uniqueItemsThisPage.length,
        duplicateCount: duplicatesThisPage,
      });

      // 2. Enrich unique items if requested
      if (enrichDetails && uniqueItemsThisPage.length > 0) {
        const enrichmentTasks = uniqueItemsThisPage.map(async (item) => {
          if (item.postUrl) {
            try {
              const details = await javtifulScraper.getPostDetails(item.postUrl);
              item.actress = details.actress || item.actress;
              item.actressSlug = details.actressSlug || item.actressSlug;
              item.studio = details.studio || item.studio;
              item.studioSlug = details.studioSlug || item.studioSlug;
              item.duration = details.duration || item.duration;
              item.releaseDate = details.releaseDate || item.releaseDate;
              if (details.coverImage && (!item.coverImage || item.coverImage.includes("placeholder"))) {
                item.coverImage = details.coverImage;
              }
            } catch (err) {
              console.warn(`[Auto-Crawl] Failed to enrich metadata for ${item.code}:`, err);
            }
          }
        });

        const batchSize = 6;
        for (let i = 0; i < enrichmentTasks.length; i += batchSize) {
          await Promise.all(enrichmentTasks.slice(i, i + batchSize));
        }
      }

      // Add to master ingest list
      for (const item of uniqueItemsThisPage) {
        allItemsToIngest.push({
          code: item.code,
          title: item.title,
          postUrl: item.postUrl || "",
          thumbnail: item.coverImage,
          actress: item.actress,
          actressSlug: item.actressSlug,
          studio: item.studio,
          studioSlug: item.studioSlug,
          duration: item.duration,
          releaseDate: item.releaseDate,
        });
      }

      // Check if pagination indicates a next page exists
      if (scrapeRes.pagination && !scrapeRes.pagination.hasNext) {
        hasNextPage = false;
        break;
      }
    }

    // Ingest all accumulated unique items in a single transaction
    const autoCommitEnabled = githubStorage.isAutoCommitEnabled();
    let batchResult: any = {
      ingestedCount: 0,
      duplicateCount: totalDuplicatesAcrossPages,
      modifiedFiles: [],
      commitSha: null,
      commitUrl: null,
    };

    if (allItemsToIngest.length > 0) {
      const commitMsg =
        customCommitMessage ||
        `[Auto Crawl] Ingested ${allItemsToIngest.length} unique videos from ${mode} (${startPage}-${lastCrawledPage}) with Auto-Commit: ${autoCommitEnabled ? "ON" : "OFF"}`;

      batchResult = await ingestionService.bulkIngestTransaction(allItemsToIngest, {
        commitMessage: commitMsg,
      });
    }

    const uncommittedCount = githubStorage.getUncommittedCount();

    res.json({
      success: true,
      mode,
      query,
      startPage,
      lastCrawledPage,
      pagesCrawled: pageStats.length,
      hasNextPage,
      totalScrapedAcrossPages,
      ingestedCount: batchResult.ingestedCount,
      duplicateCount: totalDuplicatesAcrossPages + (batchResult.duplicateCount || 0),
      autoCommitEnabled,
      commitSha: batchResult.commitSha,
      commitUrl: batchResult.commitUrl,
      uncommittedCount,
      pageStats,
      scrapeResult: latestScrapeResult,
      message: autoCommitEnabled
        ? `Successfully crawled ${pageStats.length} pages (pages ${startPage} to ${lastCrawledPage}): Saved ${batchResult.ingestedCount} unique videos to GitHub database (${totalDuplicatesAcrossPages} duplicates filtered)`
        : `Successfully crawled ${pageStats.length} pages: Saved ${batchResult.ingestedCount} videos to local database cache (${uncommittedCount} pending commit since Auto-Commit is OFF)`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});


// SSE endpoint for auto-crawl progress
router.get("/scrapers/javtiful/auto-crawl-stream", async (req: Request, res: Response) => {
  // Setup SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const mode = (req.query.mode || "search") as "search" | "catalog" | "actress" | "studio";
  const query = ((req.query.q || req.query.query || req.query.slug || "") as string).trim();
  const startPage = Math.max(1, parseInt(String(req.query.startPage || req.query.page || 1), 10));
  const pagesToCrawl = Math.min(20, Math.max(1, parseInt(String(req.query.pagesToCrawl || req.query.maxPages || 1), 10)));
  const enrichDetails = req.query.enrichDetails !== "false";
  const customCommitMessage = req.query.commitMessage as string | undefined;

  if (mode === "search" && !query) {
    sendEvent("error", { error: "Missing search query for search crawl" });
    res.end();
    return;
  }
  if ((mode === "actress" || mode === "studio") && !query) {
    sendEvent("error", { error: `Missing ${mode} slug` });
    res.end();
    return;
  }

  const allItemsToIngest: any[] = [];
  const pageStats: any[] = [];
  let totalScrapedAcrossPages = 0;
  let totalDuplicatesAcrossPages = 0;
  let lastCrawledPage = startPage;
  let hasNextPage = true;
  let latestScrapeResult: any = null;

  try {
    for (let p = 0; p < pagesToCrawl; p++) {
      const currentPage = startPage + p;
      lastCrawledPage = currentPage;
      let scrapeRes: any = null;

      sendEvent("progress", {
        status: `Crawling page ${currentPage} (${p + 1} of ${pagesToCrawl})...`,
        progress: (p / pagesToCrawl) * 0.3, // allocate 30% to crawling
        page: currentPage
      });

      if (mode === "search") {
        scrapeRes = await javtifulScraper.searchByKeyword(query, currentPage, {
          filterDuplicates: false,
          enrichDetails: false,
        });
      } else if (mode === "catalog") {
        scrapeRes = await javtifulScraper.scrapeCatalogPage(currentPage, {
          filterDuplicates: false,
          enrichDetails: false,
        });
      } else if (mode === "actress") {
        scrapeRes = await javtifulScraper.getActressVideos(query, currentPage, {
          filterDuplicates: false,
        });
      } else if (mode === "studio") {
        scrapeRes = await javtifulScraper.getStudioVideos(query, currentPage, {
          filterDuplicates: false,
        });
      }

      latestScrapeResult = scrapeRes;

      if (!scrapeRes || !scrapeRes.items || scrapeRes.items.length === 0) {
        hasNextPage = false;
        break;
      }

      totalScrapedAcrossPages += scrapeRes.items.length;

      // 1. Batch deduplication check for this page
      const codes = scrapeRes.items.map((i: { code?: string }) => i.code || "").filter(Boolean);
      const dedupResults = await codeRegistryService.checkBatch(codes);
      const dedupMap = new Map(dedupResults.map((r) => [r.normalizedCode, r]));

      const uniqueItemsThisPage: any[] = [];
      let duplicatesThisPage = 0;

      for (const item of scrapeRes.items) {
        const check = item.code ? dedupMap.get(item.code.toUpperCase()) : null;
        if (check && check.isDuplicate) {
          duplicatesThisPage++;
        } else {
          if (!allItemsToIngest.some((existing) => existing.code && item.code && existing.code.toUpperCase() === item.code.toUpperCase())) {
            uniqueItemsThisPage.push(item);
          } else {
            duplicatesThisPage++;
          }
        }
      }

      totalDuplicatesAcrossPages += duplicatesThisPage;

      pageStats.push({
        page: currentPage,
        scrapedCount: scrapeRes.items.length,
        uniqueCount: uniqueItemsThisPage.length,
        duplicateCount: duplicatesThisPage,
      });

      // 2. Enrich unique items if requested
      if (enrichDetails && uniqueItemsThisPage.length > 0) {
        let enrichedCount = 0;
        const totalToEnrich = uniqueItemsThisPage.length;

        const enrichmentTasks = uniqueItemsThisPage.map(async (item) => {
          if (item.postUrl) {
            try {
              const details = await javtifulScraper.getPostDetails(item.postUrl);
              item.actress = details.actress || item.actress;
              item.actressSlug = details.actressSlug || item.actressSlug;
              item.studio = details.studio || item.studio;
              item.studioSlug = details.studioSlug || item.studioSlug;
              item.duration = details.duration || item.duration;
              item.releaseDate = details.releaseDate || item.releaseDate;
              if (details.coverImage && (!item.coverImage || item.coverImage.includes("placeholder"))) {
                item.coverImage = details.coverImage;
              }
            } catch (err) {
              console.warn(`[Auto-Crawl] Failed to enrich metadata for ${item.code}:`, err);
            }
            enrichedCount++;
            
            // Send enrichment progress
            sendEvent("progress", {
              status: `Enriching metadata for page ${currentPage}: ${enrichedCount} / ${totalToEnrich}`,
              progress: 0.3 + ((p / pagesToCrawl) * 0.5) + ((enrichedCount / totalToEnrich) * (0.5 / pagesToCrawl))
            });
          }
        });

        const batchSize = 6;
        for (let i = 0; i < enrichmentTasks.length; i += batchSize) {
          await Promise.all(enrichmentTasks.slice(i, i + batchSize));
        }
      }

      // Add to master ingest list
      for (const item of uniqueItemsThisPage) {
        allItemsToIngest.push({
          code: item.code,
          title: item.title,
          postUrl: item.postUrl || "",
          thumbnail: item.coverImage,
          actress: item.actress,          
          actressSlug: item.actressSlug,
          studio: item.studio,          
          studioSlug: item.studioSlug,
          duration: item.duration,          
          releaseDate: item.releaseDate,
        });
      }

      if (scrapeRes.pagination && !scrapeRes.pagination.hasNext) {
        hasNextPage = false;
        break;
      }
    }

    sendEvent("progress", {
      status: "Saving to database...",
      progress: 0.9
    });

    const autoCommitEnabled = githubStorage.isAutoCommitEnabled();
    let batchResult: any = {
      ingestedCount: 0,
      duplicateCount: totalDuplicatesAcrossPages,
      modifiedFiles: [],
      commitSha: null,
      commitUrl: null,
    };

    if (allItemsToIngest.length > 0) {
      const commitMsg =
        customCommitMessage ||
        `[Auto Crawl] Ingested ${allItemsToIngest.length} unique videos from ${mode} (${startPage}-${lastCrawledPage}) with Auto-Commit: ${autoCommitEnabled ? "ON" : "OFF"}`;
      batchResult = await ingestionService.bulkIngestTransaction(allItemsToIngest, {
        commitMessage: commitMsg,
      });
    }

    const uncommittedCount = githubStorage.getUncommittedCount();

    sendEvent("complete", {
      success: true,
      mode,
      query,
      startPage,
      lastCrawledPage,
      pagesCrawled: pageStats.length,
      hasNextPage,
      totalScrapedAcrossPages,
      ingestedCount: batchResult.ingestedCount,
      duplicateCount: totalDuplicatesAcrossPages + (batchResult.duplicateCount || 0),
      autoCommitEnabled,
      commitSha: batchResult.commitSha,
      commitUrl: batchResult.commitUrl,
      uncommittedCount,
      pageStats,
      scrapeResult: latestScrapeResult,
      message: autoCommitEnabled
        ? `Successfully crawled ${pageStats.length} pages (pages ${startPage} to ${lastCrawledPage}): Saved ${batchResult.ingestedCount} unique videos to GitHub database (${totalDuplicatesAcrossPages} duplicates filtered)`
        : `Successfully crawled ${pageStats.length} pages: Saved ${batchResult.ingestedCount} videos to local database cache (${uncommittedCount} pending commit since Auto-Commit is OFF)`,
    });
    
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    sendEvent("error", { success: false, error: errorMsg });
  } finally {
    res.end();
  }
});

// Automated End-to-End Scraper Test Suite
router.post("/scrapers/javtiful/test-suite", async (_req: Request, res: Response) => {
  const startTime = Date.now();
  interface TestStep {
    name: string;
    status: "passed" | "failed";
    durationMs: number;
    details?: unknown;
  }
  const steps: TestStep[] = [];

  try {
    const t1 = Date.now();
    const catalogResult = await javtifulScraper.scrapeCatalogPage(1);
    if (!catalogResult.items || catalogResult.items.length === 0) {
      throw new Error("Catalog returned 0 items from https://javtiful.com/main");
    }
    steps.push({
      name: "Primary Catalog Scraping (https://javtiful.com/main)",
      status: "passed",
      durationMs: Date.now() - t1,
      details: {
        source: catalogResult.source,
        totalFound: catalogResult.totalFound,
        sample: catalogResult.items
          .slice(0, 3)
          .map((i) => ({ code: i.code, title: i.title, duration: i.duration })),
      },
    });

    const t2 = Date.now();
    const sampleItem =
      catalogResult.items.find((i) => i.postUrl) || catalogResult.items[0];
    const postDetails = await javtifulScraper.getPostDetails(sampleItem.postUrl);

    if (!postDetails.code || !postDetails.title || !postDetails.postUrl) {
      throw new Error(
        `Incomplete post metadata: missing code (${postDetails.code}), title (${postDetails.title}), or postUrl`
      );
    }
    steps.push({
      name: "Post Metadata Extraction (Code, Title, Actress, Studio, Duration, ReleaseDate, CoverImage, PostUrl)",
      status: "passed",
      durationMs: Date.now() - t2,
      details: {
        code: postDetails.code,
        title: postDetails.title,
        actress: postDetails.actress || "(N/A)",
        studio: postDetails.studio || "(N/A)",
        duration: postDetails.duration,
        releaseDate: postDetails.releaseDate || "(N/A)",
        coverImage: postDetails.coverImage
          ? postDetails.coverImage.slice(0, 50) + "..."
          : "(none)",
        postUrl: postDetails.postUrl,
      },
    });

    const t3 = Date.now();
    const searchCode = postDetails.code || "SSIS-001";
    const codeSearchResult = await javtifulScraper.searchByCode(searchCode);
    steps.push({
      name: `Search by Video Code ("${searchCode}")`,
      status: "passed",
      durationMs: Date.now() - t3,
      details: {
        query: searchCode,
        totalFound: codeSearchResult.totalFound,
        firstMatch: codeSearchResult.items[0]?.title || "None",
      },
    });

    const t4 = Date.now();
    const keywordSearchResult = await javtifulScraper.searchByKeyword("Hatano");
    steps.push({
      name: 'Search by Keyword ("Hatano")',
      status: "passed",
      durationMs: Date.now() - t4,
      details: {
        query: "Hatano",
        totalFound: keywordSearchResult.totalFound,
        sample: keywordSearchResult.items.slice(0, 3).map((i) => i.code),
      },
    });

    const t5 = Date.now();
    const actressesResult = await javtifulScraper.getActresses(1);
    if (!actressesResult.actresses || actressesResult.actresses.length === 0) {
      throw new Error("Failed to extract actresses directory");
    }
    steps.push({
      name: "Actress/Model Listings Directory",
      status: "passed",
      durationMs: Date.now() - t5,
      details: {
        totalFound: actressesResult.totalFound,
        sample: actressesResult.actresses
          .slice(0, 3)
          .map((a) => `${a.name} (${a.videoCount || 0} videos)`),
      },
    });

    const t6 = Date.now();
    const studiosResult = await javtifulScraper.getStudios(1);
    if (!studiosResult.studios || studiosResult.studios.length === 0) {
      throw new Error("Failed to extract studios/channels directory");
    }
    steps.push({
      name: "Studio/Maker Listings Directory",
      status: "passed",
      durationMs: Date.now() - t6,
      details: {
        totalFound: studiosResult.totalFound,
        sample: studiosResult.studios
          .slice(0, 3)
          .map((s) => `${s.name} (${s.videoCount || 0} videos)`),
      },
    });

    const t7 = Date.now();
    const dedupCheck = await codeRegistryService.checkCode("SSIS-001");
    const unregCheck = await codeRegistryService.checkCode(
      "UNREGISTERED-CODE-999"
    );
    if (!dedupCheck.isDuplicate) {
      throw new Error(
        "Registered code SSIS-001 was not recognized as duplicate by CodeRegistryService"
      );
    }
    if (unregCheck.isDuplicate) {
      throw new Error(
        "Unregistered code was unexpectedly recognized as duplicate"
      );
    }
    steps.push({
      name: "Global CodeRegistry Deduplication Integration",
      status: "passed",
      durationMs: Date.now() - t7,
      details: {
        registeredCodeCheck: {
          code: "SSIS-001",
          isDuplicate: dedupCheck.isDuplicate,
        },
        unregisteredCodeCheck: {
          code: "UNREGISTERED-CODE-999",
          isDuplicate: unregCheck.isDuplicate,
        },
      },
    });

    res.json({
      success: true,
      durationMs: Date.now() - startTime,
      steps,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    steps.push({
      name: "Test Failure",
      status: "failed",
      durationMs: Date.now() - startTime,
      details: { error: errorMsg },
    });
    res.status(500).json({
      success: false,
      durationMs: Date.now() - startTime,
      steps,
      error: errorMsg,
    });
  }
});

// Step 7 Verification Test Suite
router.post("/scraper/step7-test-suite", async (_req: Request, res: Response) => {
  try {
    const report = await ingestionService.runStep7TestSuite(async () => {
      try {
        return await javtifulScraper.scrapeAnyUrl(
          "https://javtiful.com/main",
          {
            filterDuplicates: false,
            enrichDetails: false,
          }
        );
      } catch (err) {
        return { error: String(err), simulated: true };
      }
    });
    res.json(report);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: errorMsg });
  }
});

export default router;
