import nextEnv from "@next/env";
import { fileURLToPath } from "node:url";
// All generators must read the same .env files as Next; otherwise the deployed
// CSP could block the configured backend or publish the wrong canonical domain.
nextEnv.loadEnvConfig(fileURLToPath(new URL("../", import.meta.url)), process.env.NODE_ENV === "development" || process.env.npm_lifecycle_event === "predev");
