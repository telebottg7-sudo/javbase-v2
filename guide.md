# Javtiful Data Extraction & Media Streaming Guide

This guide details the technical architecture and methodologies used within the JavBase platform to extract metadata and stream video files directly from Javtiful.

## 1. System Architecture Overview

The scraping and extraction architecture is built purely in TypeScript/Node.js using an Express backend and React frontend. It does not rely on headless browsers (like Puppeteer) or heavy scraping frameworks, ensuring rapid, lightweight, and serverless-compatible execution.

- **`server/scrapers/javtiful.ts`**: The core scraping class. Uses `node-fetch` and `cheerio` to fetch and parse raw HTML.
- **`server/services/searchService.ts`**: Houses the **Media Harvester**, which performs deep inspections on individual video posts to pull out direct MP4 streaming links and embedded preview clips.
- **`server/routes/scraperRoutes.ts`**: Exposes SSE (Server-Sent Events) endpoints for real-time streaming progress to the frontend during multi-page crawls.
- **`src/components/modals/MediaHarvesterModal.tsx`**: The frontend UI that mounts standard HTML5 `<video>` players to stream the extracted MP4 links.

---

## 2. Extracting Video Metadata (Catalog & Search Pages)

When the application requests a catalog page, an actress page, or search results, the following process occurs:

### Parsing the Grid
The scraper downloads the raw HTML and uses `cheerio` to locate all video grid items via CSS selectors: `$(".front-video-card, .video-card, .video-item")`.

For each card, the system extracts:
1. **Title**: Prioritizing the heading text, falling back to `img alt` attributes.
2. **Post URL**: Resolved to an absolute URL (`https://javtiful.com/video/...`).
3. **Cover Image**: Found in `.front-video-thumb img`.
4. **Duration**: Found inside the `.front-duration-tag` overlay.

### Canonical Code Extraction
The most critical part of extraction is determining the "Canonical Code" (e.g., `MIDE-999`, `GVH-123`). The `javtiful.ts` scraper uses a cascading regex approach:
1. **URL Slug matching**: Looks for `/video/123456/code-goes-here`.
2. **Title Pattern matching**: Looks for standard industry code formats (e.g., 2-6 uppercase letters followed by numbers) leading the title string.

All codes are aggressively normalized to uppercase with standardized hyphenation to prevent duplication in the database.

---

## 3. Deep Extraction (Post Details)

When a user clicks on a video or when "Auto Crawl & Save" executes, the system hits the individual post URL to extract "deep" metadata.

### Schema.org & JSON-LD
Javtiful embeds structured SEO data on their post pages. The scraper targets the `<script type="application/ld+json">` block, extracting a `VideoObject`. From this, it can cleanly extract:
- **Duration**: Parsed from ISO-8601 strings (e.g., `PT1H30M25S`) into raw seconds.
- **Upload Date**: Used as the release date.
- **High-Res Thumbnail**: Often higher quality than the grid cover image.

### DOM Traversal for Entities
- **Actresses**: Extracted by finding links matching `$('a[href*="/actress/"]')`. The slug is derived from the URL path.
- **Studios/Channels**: Extracted similarly via `$('a[href*="/channel/"]')`.
- **Tags**: Extracted via `$('a[href*="/tag/"], .badge')`.

---

## 4. Extracting the Video Streams (Media Harvester)

The `harvestMediaDetails` function (in `searchService.ts`) is responsible for finding the direct MP4 streaming links to power the built-in video player. Javtiful obscures these slightly, so the scraper uses a multi-tier fallback system:

### Strategy 1: JSON Configuration Block (Primary)
The modern Javtiful video player initializes using a JSON configuration object.
The scraper locates `<script id="frontWatchConfig">` and parses its contents. Inside, it looks for the `playerSources` array.
```json
"playerSources": [
  {
    "src": "https://cdn.example.com/stream/720p.mp4",
    "size": 720,
    "type": "video/mp4"
  }
]
```

### Strategy 2: Inline Script Regex matching (Fallback 1)
If the structured `#frontWatchConfig` isn't found, the scraper concatenates all `<script>` tags on the page and uses a Regex pattern to match `"playerSources": [...]`. It then parses that captured string as JSON.

### Strategy 3: Standard Video Sources (Fallback 2)
If it's an older video format, it queries standard `<video source>` tags in the DOM and extracts their `src` attributes.

### Embedded Previews
To find the 10-20 second preview clip, the scraper searches the HTML for a custom data attribute:
`data-front-video-preview-src="...mp4"`.

---

## 5. Streaming in the Frontend UI

Once the backend extracts the direct MP4/HLS links, they are sent to the React frontend.

The `MediaHarvesterModal.tsx` component is responsible for streaming playback:
- It mounts a standard, native HTML5 `<video>` element.
- It passes the extracted stream URL directly to the `src` attribute.
- It applies standard native controls (`controls autoplay playsInline`).
- **Fullscreen API**: By utilizing React `useRef`, the custom UI includes a "Fullscreen" button overlaid on the video. When clicked, it calls `videoRef.current.requestFullscreen()` via the native browser Fullscreen API.

Because the links are direct media files (MP4/m3u8), the browser handles all decoding, buffering, and range-requests automatically.

---

## 6. The Auto-Crawl & Save Pipeline

When scraping massive amounts of data (e.g., fetching 10 pages of a studio's directory at once), the system uses **Server-Sent Events (SSE)**.

1. **Initialization**: The frontend connects to `/api/scrapers/javtiful/auto-crawl-stream`.
2. **Scraping Loop**: The backend loops through the requested pages. For each page, it scrapes the grid.
3. **Deduplication Check**: Before doing deep extraction, it cross-references the codes with the `CodeRegistryService` in memory. If a video is already in the database, it is skipped.
4. **Batch Enrichment**: The scraper fetches deep metadata concurrently for all unique videos on that page (batching network requests for speed).
5. **Progress Updates**: As it works, it writes SSE events (`res.write("event: progress\ndata: ...")`) back to the client, causing the frontend progress bar to fill smoothly.
6. **Atomic Transaction**: Once all pages are crawled, all unique data is handed to `ingestionService.bulkIngestTransaction()`.
7. **Local Fast Save**: It writes to the local `database/` folder in highly optimized concurrent batches of 50 files.
8. **GitHub Push**: Finally, it packages every single new JSON file into a massive array and pushes them all to the GitHub API in a **single Git commit**. This ensures the database is never left in a partially-synced state.
