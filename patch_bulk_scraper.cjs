const fs = require('fs');
const file = 'src/components/views/BulkScraperView.tsx';
let content = fs.readFileSync(file, 'utf8');

const sseState = `
  const [crawlProgress, setCrawlProgress] = useState<number>(0);
  const [crawlStatusText, setCrawlStatusText] = useState<string>("");
`;

content = content.replace('  const [bulkScrapeError, setBulkScrapeError] = useState<string | null>(null);', '  const [bulkScrapeError, setBulkScrapeError] = useState<string | null>(null);' + sseState);

const handleAutoCrawlCatalogReplacement = `
  const handleAutoCrawlCatalog = async (pagesToCrawl = 3) => {
    setBatchIngesting(true);
    setCatalogLoading(true);
    setCatalogError(null);
    setIngestionBanner(null);
    setCrawlProgress(0);
    setCrawlStatusText("Initializing...");

    const params = new URLSearchParams({
      mode: "catalog",
      startPage: catalogPage.toString(),
      pagesToCrawl: pagesToCrawl.toString(),
      enrichDetails: "true",
    });

    const eventSource = new EventSource(\`/api/scrapers/javtiful/auto-crawl-stream?\${params.toString()}\`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Fallback progress state if using stream endpoint
      } catch (e) {
        console.error("Failed to parse SSE data", e);
      }
    };

    eventSource.addEventListener("progress", (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress !== undefined) {
          setCrawlProgress(Math.round(data.progress * 100));
        }
        if (data.status) {
          setCrawlStatusText(data.status);
        }
      } catch (e) {
        console.error("Failed to parse progress data", e);
      }
    });

    eventSource.addEventListener("complete", (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data.success) {
          if (data.scrapeResult) {
            setCatalogResult(data.scrapeResult);
          }
          if (data.lastCrawledPage) {
            setCatalogPage(data.lastCrawledPage);
          }
          setIngestionBanner({
            type: "success",
            message:
              data.message ||
              \`Catalog Multi-Page Crawl: Saved \${data.ingestedCount} videos across \${data.pagesCrawled} pages (\${data.duplicateCount} duplicates filtered)\`,
            details: data.autoCommitEnabled
              ? \`GitHub Atomic Commit: \${data.commitSha ? data.commitSha.slice(0, 7) : "pushed"}\`
              : \`Database Staged: Staged in memory (\${data.uncommittedCount || 0} pending files — Auto-Commit is OFF)\`,
          });
          if (typeof data.autoCommitEnabled === "boolean") {
            setAutoCommitEnabled(data.autoCommitEnabled);
          }
          if (typeof data.uncommittedCount === "number") {
            setUncommittedCount(data.uncommittedCount);
          }
        } else {
          setCatalogError("Catalog auto-crawl reported failure");
        }
      } catch (e) {
        setCatalogError("Failed to parse completion data");
      } finally {
        eventSource.close();
        setBatchIngesting(false);
        setCatalogLoading(false);
        fetchAutoCommitStatus();
      }
    });

    eventSource.addEventListener("error", (event: any) => {
      try {
        if (event.data) {
          const data = JSON.parse(event.data);
          setCatalogError(data.error || "Stream error occurred");
        } else {
          setCatalogError("Stream connection error");
        }
      } catch (e) {
        setCatalogError("Stream error");
      } finally {
        eventSource.close();
        setBatchIngesting(false);
        setCatalogLoading(false);
        fetchAutoCommitStatus();
      }
    });
  };
`;

content = content.replace(/  const handleAutoCrawlCatalog = async \([\s\S]*?fetchAutoCommitStatus\(\);\n    }\n  };/m, handleAutoCrawlCatalogReplacement.trim());


const handleAutoCrawlStudioReplacement = `
  const handleAutoCrawlStudio = async (pagesToCrawl = 3) => {
    if (!selectedStudio) return;
    setBatchIngesting(true);
    setStudioVideosLoading(true);
    setIngestionBanner(null);
    setCrawlProgress(0);
    setCrawlStatusText("Initializing...");

    const params = new URLSearchParams({
      mode: "studio",
      slug: selectedStudio,
      startPage: studioVideosPage.toString(),
      pagesToCrawl: pagesToCrawl.toString(),
      enrichDetails: "true",
    });

    const eventSource = new EventSource(\`/api/scrapers/javtiful/auto-crawl-stream?\${params.toString()}\`);

    eventSource.addEventListener("progress", (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress !== undefined) {
          setCrawlProgress(Math.round(data.progress * 100));
        }
        if (data.status) {
          setCrawlStatusText(data.status);
        }
      } catch (e) {
        console.error("Failed to parse progress data", e);
      }
    });

    eventSource.addEventListener("complete", (event: any) => {
      try {
        const data = JSON.parse(event.data);
        if (data.success) {
          if (data.scrapeResult) {
            setStudioVideos(data.scrapeResult.items || []);
            if (data.scrapeResult.pagination) {
              setStudioVideosPagination(data.scrapeResult.pagination);
            }
          }
          if (data.lastCrawledPage) {
            setStudioVideosPage(data.lastCrawledPage);
          }
          setIngestionBanner({
            type: "success",
            message:
              data.message ||
              \`Studio Multi-Page Crawl: Saved \${data.ingestedCount} videos across \${data.pagesCrawled} pages (\${data.duplicateCount} duplicates filtered)\`,
            details: data.autoCommitEnabled
              ? \`GitHub Atomic Commit: \${data.commitSha ? data.commitSha.slice(0, 7) : "pushed"}\`
              : \`Database Staged: Staged in memory (\${data.uncommittedCount || 0} pending files — Auto-Commit is OFF)\`,
          });
          if (typeof data.autoCommitEnabled === "boolean") {
            setAutoCommitEnabled(data.autoCommitEnabled);
          }
          if (typeof data.uncommittedCount === "number") {
            setUncommittedCount(data.uncommittedCount);
          }
        } else {
          setIngestionBanner({
            type: "error",
            message: "Studio Crawl failed",
            details: data.error,
          });
        }
      } catch (e) {
        setIngestionBanner({
          type: "error",
          message: "Studio Crawl error",
          details: "Failed to parse completion data",
        });
      } finally {
        eventSource.close();
        setBatchIngesting(false);
        setStudioVideosLoading(false);
        fetchAutoCommitStatus();
      }
    });

    eventSource.addEventListener("error", (event: any) => {
      try {
        if (event.data) {
          const data = JSON.parse(event.data);
          setIngestionBanner({
            type: "error",
            message: "Studio Crawl error",
            details: data.error || "Stream error occurred",
          });
        } else {
          setIngestionBanner({
            type: "error",
            message: "Studio Crawl error",
            details: "Stream connection error",
          });
        }
      } catch (e) {
        setIngestionBanner({
          type: "error",
          message: "Studio Crawl error",
          details: "Stream error",
        });
      } finally {
        eventSource.close();
        setBatchIngesting(false);
        setStudioVideosLoading(false);
        fetchAutoCommitStatus();
      }
    });
  };
`;

content = content.replace(/  const handleAutoCrawlStudio = async \([\s\S]*?fetchAutoCommitStatus\(\);\n    }\n  };/m, handleAutoCrawlStudioReplacement.trim());

fs.writeFileSync(file, content);
