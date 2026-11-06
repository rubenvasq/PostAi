import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[api] PostAi API escuchando en http://127.0.0.1:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`[api] Cerrando por ${signal}...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
