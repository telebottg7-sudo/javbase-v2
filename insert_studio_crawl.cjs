const fs = require('fs');
const file = 'src/components/views/BulkScraperView.tsx';
let content = fs.readFileSync(file, 'utf8');

const studioCrawlFn = `
  const handleAutoCrawlStudio = async (pagesToCrawl = 3) => {
    if (!selectedStudio) return;
    setBatchIngesting(true);
    setStudioVideosLoading(true);
    setIngestionBanner(null);

    try {
      const res = await fetch("/api/scrapers/javtiful/auto-crawl-and-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "studio",
          slug: selectedStudio,
          startPage: studioVideosPage,
          pagesToCrawl,
          enrichDetails: true,
        }),
      });
      const data = await res.json();

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
          details: data.commitSha
            ? \`Commit \${data.commitSha.slice(0, 7)} — updated \${
                data.modifiedFiles?.length || 0
              } index and sharded files.\`
            : "Saved to local cache.",
        });
        checkUncommitted();
      } else {
        setIngestionBanner({
          type: "error",
          message: "Studio Crawl failed",
          details: data.error,
        });
      }
    } catch (err: unknown) {
      setIngestionBanner({
        type: "error",
        message: "Studio Crawl error",
        details: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBatchIngesting(false);
      setStudioVideosLoading(false);
    }
  };

`;

content = content.replace('  const handleAutoCrawlCatalog = async', studioCrawlFn + '  const handleAutoCrawlCatalog = async');
fs.writeFileSync(file, content);
