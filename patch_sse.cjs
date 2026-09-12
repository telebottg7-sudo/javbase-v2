const fs = require('fs');
const file = 'server/routes/scraperRoutes.ts';
let content = fs.readFileSync(file, 'utf8');

// I need to add a new SSE endpoint for auto-crawl
const sseRoute = `
// SSE endpoint for auto-crawl progress
router.get("/scrapers/javtiful/auto-crawl-stream", async (req: Request, res: Response) => {
  // Setup SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event: string, data: any) => {
    res.write(\`event: \${event}\\ndata: \${JSON.stringify(data)}\\n\\n\`);
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
    sendEvent("error", { error: \`Missing \${mode} slug\` });
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
        status: \`Crawling page \${currentPage} (\${p + 1} of \${pagesToCrawl})...\`,
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
              console.warn(\`[Auto-Crawl] Failed to enrich metadata for \${item.code}:\`, err);
            }
            enrichedCount++;
            
            // Send enrichment progress
            sendEvent("progress", {
              status: \`Enriching metadata for page \${currentPage}: \${enrichedCount} / \${totalToEnrich}\`,
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
        \`[Auto Crawl] Ingested \${allItemsToIngest.length} unique videos from \${mode} (\${startPage}-\${lastCrawledPage}) with Auto-Commit: \${autoCommitEnabled ? "ON" : "OFF"}\`;
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
        ? \`Successfully crawled \${pageStats.length} pages (pages \${startPage} to \${lastCrawledPage}): Saved \${batchResult.ingestedCount} unique videos to GitHub database (\${totalDuplicatesAcrossPages} duplicates filtered)\`
        : \`Successfully crawled \${pageStats.length} pages: Saved \${batchResult.ingestedCount} videos to local database cache (\${uncommittedCount} pending commit since Auto-Commit is OFF)\`,
    });
    
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    sendEvent("error", { success: false, error: errorMsg });
  } finally {
    res.end();
  }
});
`;

content = content.replace('// Automated End-to-End Scraper Test Suite', sseRoute + '\n// Automated End-to-End Scraper Test Suite');
fs.writeFileSync(file, content);
