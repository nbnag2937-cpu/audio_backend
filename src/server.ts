import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[server] Dang chay tai http://localhost:${env.port} (env: ${env.nodeEnv})`);
});

// Dong ket noi DB gon gang khi tat server (tot cho debug & deploy tren Railway)
async function shutdown(signal: string): Promise<void> {
  console.log(`[server] Nhan tin hieu ${signal}, dang tat server...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
