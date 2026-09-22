import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './db/connection.js';
import { createLocalStorage } from './storage/local-files.js';

const VERSION = '0.1.0';

const config = loadConfig();
const db = openDatabase(config.dataDir);
const storage = createLocalStorage(config.dataDir);
const app = await buildApp({ db, storage, version: VERSION });

await app.listen({ host: config.host, port: config.port });
app.log.info(`dsh-story-api ${VERSION} 监听 http://${config.host}:${config.port}，数据目录 ${config.dataDir}`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void (async () => {
      await app.close();
      db.close();
      process.exit(0);
    })();
  });
}
