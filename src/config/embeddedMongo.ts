import path from 'path';
import fs from 'fs';
import { MongoMemoryServer } from 'mongodb-memory-server';

const DATA_DIR = path.resolve(process.cwd(), '.mongodb-data');

fs.mkdirSync(DATA_DIR, { recursive: true });

let server: MongoMemoryServer | null = null;
const stoppedServers = new Set<MongoMemoryServer>();
let exiting = false;

const stopServer = async (srv: MongoMemoryServer): Promise<void> => {
  if (stoppedServers.has(srv)) return;
  stoppedServers.add(srv);
  try {
    await srv.stop();
  } catch {
    // ignore — process is shutting down anyway
  }
  if (server === srv) server = null;
};

process.once('SIGINT', () => {
  exiting = true;
  void (async () => {
    if (server) await stopServer(server);
    process.exit(0);
  })();
});
process.once('SIGTERM', () => {
  exiting = true;
  void (async () => {
    if (server) await stopServer(server);
    process.exit(0);
  })();
});

/**
 * Start an embedded MongoDB (downloads a mongod binary once, then reuses it).
 * Data persists in ./.mongodb-data so progress survives restarts.
 */
export const startEmbeddedMongo = async (): Promise<MongoMemoryServer> => {
  if (server) return server;
  try {
    server = await MongoMemoryServer.create({
      binary: { version: '7.0.14' },
      instance: {
        dbPath: DATA_DIR,
        storageEngine: 'wiredTiger',
        // Allow a slow start: on low-end machines the first boot after an abrupt
        // shutdown replays the journal and can take longer than the 10s default.
        launchTimeout: 120000,
      },
    });
    console.log('[embedded-mongo] Embedded MongoDB started (no external MongoDB required)');
    console.log(`[embedded-mongo] Data directory: ${DATA_DIR} (progress persists across restarts)`);
    console.log('[embedded-mongo] To use your own MongoDB instead, set MONGODB_URI in .env');
    return server;
  } catch (error) {
    console.error('[embedded-mongo] Failed to start embedded MongoDB:', error);
    if (String(error).includes('10000ms') || String(error).includes('launchTimeout')) {
      console.error('  → The start timed out (default 10s): slow machines or a stale lock from an');
      console.error('    abrupt shutdown can delay the first boot. Try again now that the timeout');
      console.error('    is raised, and make sure no other instance holds the data directory:');
      console.error('      pkill -f "ts-node-dev" && rm -f .mongodb-data/mongod.lock .mongodb-data/WiredTiger.lock');
    }
    console.error('  → The MongoDB binary is downloaded once on first run and needs internet access.');
    console.error('  → Alternative: install Docker and run `docker compose up -d`,');
    console.error('    or set MONGODB_URI in .env to a MongoDB you already have.');
    throw error;
  }
};

export const stopEmbeddedMongo = async (): Promise<void> => {
  if (!exiting && server) await stopServer(server);
};

/**
 * Resolve the MongoDB URI to connect to:
 * - an explicit MONGODB_URI in .env wins (your own MongoDB), otherwise
 * - an embedded MongoDB is started automatically — nothing to install.
 */
export const getMongoUri = async (): Promise<string> => {
  const explicit = process.env.MONGODB_URI;
  if (explicit) return explicit;
  const srv = await startEmbeddedMongo();
  return srv.getUri('ecommerce');
};
