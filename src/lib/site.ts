// TypeScript bridge to the single source of truth (site.config.mjs at repo root).
// Import site constants from here everywhere in the app.
export {
  ORIGIN,
  BASE_PATH,
  SITE_URL,
  INDEXABLE,
  SITE,
  absoluteUrl,
  asset,
} from "../../site.config.mjs";
