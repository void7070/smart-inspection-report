import { existsSync, rmSync } from 'node:fs';
import { config } from '../config.js';
import { createDb, applySchema } from './connection.js';
import { seed } from './seed.js';

/**
 * DB 초기화 스크립트. `npm run db:init`로 실행한다.
 * 기존 파일을 지우고 스키마 + seed를 새로 만든다. (WAL 부속 파일까지 정리)
 */
for (const suffix of ['', '-wal', '-shm']) {
  const f = config.dbFile + suffix;
  if (existsSync(f)) rmSync(f);
}

const db = createDb(config.dbFile);
applySchema(db);
seed(db);

const counts = {
  users: db.prepare('SELECT COUNT(*) n FROM users').get().n,
  buildings: db.prepare('SELECT COUNT(*) n FROM buildings').get().n,
  units: db.prepare('SELECT COUNT(*) n FROM units').get().n,
  reports: db.prepare('SELECT COUNT(*) n FROM reports').get().n,
  inspections: db.prepare('SELECT COUNT(*) n FROM inspections').get().n,
};
db.close();

console.log(`[db:init] ${config.dbFile} 생성 완료`);
console.log('[db:init] counts:', counts);
