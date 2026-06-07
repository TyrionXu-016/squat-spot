import { loadConfig } from "./config/env.js";
import { buildApp } from "./app.js";

const config = loadConfig();
const app = buildApp({ config });

try {
  await app.listen({ port: config.PORT, host: config.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
