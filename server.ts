import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { registerRoutes } from "./server/routes";

async function startServer() {
  const app = express();
  const PORT = Number.parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // Register all modular API routes
  registerRoutes(app);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(Number.isFinite(PORT) ? PORT : 3000, "0.0.0.0", () => {
    console.log(`[Avdb] Server running on http://0.0.0.0:${PORT}`);
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 35_000;
}

startServer();
