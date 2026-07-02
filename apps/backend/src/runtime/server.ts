/**
 * Phase 2 exit-criteria harness (Roadmap — Phase 2: World Viewer): serves
 * the simulation over WebSocket plus a static "fishbowl" viewer page, with
 * no auth and no persistence (both land in Phase 3). This is intentionally
 * not the Fastify REST API from 05_API/APISpecification.md — there are no
 * REST endpoints to serve yet, so introducing Fastify now would be
 * unused ceremony; it's added when Phase 3 actually needs routes.
 *
 * Run: pnpm --filter @open-sphere/backend world:viewer
 * Open: http://localhost:4000
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrapSimulation } from "../contexts/simulation/application/bootstrapSimulation.js";
import { WorldGateway } from "../contexts/simulation/interface/websocket/WorldGateway.js";

const PORT = Number(process.env.SIM_SERVER_PORT ?? 4000);
const SEED = Number(process.env.SIM_SEED ?? 42);
const TICK_INTERVAL_MS = Number(process.env.SIM_TICK_INTERVAL_MS ?? 150);
const INITIAL_SNAKES = Number(process.env.SIM_INITIAL_SNAKES ?? 8);
const INITIAL_FOOD = Number(process.env.SIM_INITIAL_FOOD ?? 30);
const CHUNK_ID = 0;
const BOUNDS = { minX: 0, maxX: 60, minY: 0, maxY: 60 };

const PUBLIC_DIR = fileURLToPath(new URL("../../public", import.meta.url));
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

async function serveStatic(pathname: string): Promise<{ body: Buffer; contentType: string } | undefined> {
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = join(PUBLIC_DIR, relativePath);

  if (!filePath.startsWith(PUBLIC_DIR)) return undefined; // path traversal guard

  try {
    const body = await readFile(filePath);
    const contentType = CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream";
    return { body, contentType };
  } catch {
    return undefined;
  }
}

function main(): void {
  const { world, clock } = bootstrapSimulation({
    seed: SEED,
    chunkId: CHUNK_ID,
    bounds: BOUNDS,
    initialSnakes: INITIAL_SNAKES,
    initialFood: INITIAL_FOOD,
    foodSpawnChancePerTick: 0.3,
  });

  const httpServer = createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", `http://${req.headers.host}`).pathname;

    serveStatic(pathname)
      .then((file) => {
        if (!file) {
          res.writeHead(404).end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": file.contentType }).end(file.body);
      })
      .catch(() => {
        res.writeHead(500).end("Internal error");
      });
  });

  const gateway = new WorldGateway(httpServer, CHUNK_ID);

  const interval = setInterval(() => {
    clock.step();
    gateway.broadcastTick(world, clock.currentTick);
  }, TICK_INTERVAL_MS);

  httpServer.listen(PORT, () => {
    console.log(`Open Sphere world viewer: http://localhost:${PORT} (tick=${TICK_INTERVAL_MS}ms, seed=${SEED})`);
  });

  const shutdown = () => {
    clearInterval(interval);
    gateway.close();
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
