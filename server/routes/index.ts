import { Express } from "express";
import systemRoutes from "./systemRoutes";
import databaseRoutes from "./databaseRoutes";
import codeRoutes from "./codeRoutes";
import scraperRoutes from "./scraperRoutes";
import ingestionRoutes from "./ingestionRoutes";
import searchRoutes from "./searchRoutes";
import maintenanceRoutes from "./maintenanceRoutes";

export function registerRoutes(app: Express): void {
  // Mount system routes (/api/health, /api/config/status, /api/storage/*)
  app.use("/api", systemRoutes);

  // Mount database schema routes (/api/database/*)
  app.use("/api", databaseRoutes);

  // Mount code registry routes (/api/codes/*, /api/code/*, /api/code-categories)
  app.use("/api", codeRoutes);

  // Mount scraper routes (/api/scrapers/*, /api/scraper/*)
  app.use("/api", scraperRoutes);

  // Mount ingestion routes (/api/ingestion/*, /api/videos, /api/actresses, /api/studios)
  app.use("/api", ingestionRoutes);

  // Mount search & harvester routes (/api/search, /api/media/harvest)
  app.use("/api", searchRoutes);

  // Mount maintenance routes (/api/maintenance/*)
  app.use("/api", maintenanceRoutes);
}
