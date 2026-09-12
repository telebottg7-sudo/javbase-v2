import { codeRegistryService } from "../services";
import { JavtifulScraper } from "./javtiful";

export * from "./javtiful";

export const javtifulScraper = new JavtifulScraper(codeRegistryService);
