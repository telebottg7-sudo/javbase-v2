import { githubStorage } from "../storage";
import { CodeRegistryService } from "./codeRegistry";
import { IngestionService } from "./ingestionService";
import { SearchService } from "./searchService";
import { MaintenanceService } from "./maintenanceService";

export * from "./codeRegistry";
export * from "./ingestionService";
export * from "./searchService";
export * from "./maintenanceService";

export const codeRegistryService = new CodeRegistryService(githubStorage);
export const ingestionService = new IngestionService(githubStorage, codeRegistryService);
export const searchService = new SearchService(githubStorage, codeRegistryService, ingestionService);
export const maintenanceService = new MaintenanceService(githubStorage, ingestionService, codeRegistryService);
