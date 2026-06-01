import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb, applySchema } from '../src/db/connection.js';
import { seed } from '../src/db/seed.js';
import { createApp } from '../src/app.js';
import { canCompare } from '../src/lib/compare.js';

describe('canCompare (순수)', () => {
  it('같은 호실 + 같은 유형 → ok', () => {
    expect(canCompare({ unit_id: 1, type: 'periodic' }, { unit_id: 1, type: 'periodic' }).ok).toBe(true);
  });
  it('호실 다르면 UNIT_MISMATCH', () => {
    const r = canCompare({ unit_id: 1, type: 'periodic' }, { unit_id: 2, type: 'periodic' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('UNIT_MISMATCH');
  });
  it('유형 다르면 TYPE_MISMATCH', () => {
    const r = canCompare({ unit_id: 1, type: 'periodic' }, { unit_id: 1, type: 'move_in' });
    expect(r.code).toBe('TYPE_MISMATCH');
  });
  it('수리 전↔수리 후는 예외 허용', () => {
    const r = canCompare({ unit_id: 1, type: 'repair_pre' }, { unit_id: 1, type: 'repair_post' });
    expect(r.ok).toBe(true);
    expect(r.isRepairBeforeAfter).toBe(true);
  });
});

describe('GET /api/reports/compare', () => {
  let app;
  let db;
  let ids;

  beforeEach(() => {
    db = createDb(':memory:');
    applySchema(db);
    seed(db);
    app = createApp(db);
    const idByName = (n) => db.prepare('SELECT id FROM users WHERE name = ?').get(n).id;
    const unit1203 = db.prepare("SELECT id FROM units WHERE name='1203호'").get().id;
    const unit1204 = db.prepare("SELECT id FROM units WHERE name='1204호'").get().id;
    const onUnit = (uid) => db.prepare('SELECT id FROM reports WHERE unit_id=? ORDER BY id').all(uid).map((r) => r.id);
    ids = {
      contractor: idByName('이시공'),
      owner: idByName('김임대'),
      tenant: idByName('박임차'),
      r1203: onUnit(unit1203), // periodic 2개
      r1204: onUnit(unit1204)[0], // move_in 1개
      unit1203,
    };
  });

  const as = (req, userId) => req.set('x-user-id', String(userId));

  it('같은 호실+같은 유형 2개 비교 → 200, 두 snapshot 반환', async () => {
    const [a, b] = ids.r1203;
    const res = await as(request(app).get(`/api/reports/compare?leftId=${a}&rightId=${b}`), ids.owner);
    expect(res.status).toBe(200);
    expect(res.body.data.left.grade).toBeTruthy();
    expect(res.body.data.right.grade).toBeTruthy();
    expect(res.body.data.validation.ok).toBe(true);
    expect(res.body.data.compareMeta.sameType).toBe(true);
  });

  it('호실 다르면 400 UNIT_MISMATCH', async () => {
    const res = await as(
      request(app).get(`/api/reports/compare?leftId=${ids.r1203[0]}&rightId=${ids.r1204}`),
      ids.owner
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNIT_MISMATCH');
  });

  it('동일 ID 2개면 400 COMPARE_SAME', async () => {
    const res = await as(
      request(app).get(`/api/reports/compare?leftId=${ids.r1203[0]}&rightId=${ids.r1203[0]}`),
      ids.owner
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('COMPARE_SAME');
  });

  it('파라미터 누락 시 400 VALIDATION', async () => {
    const res = await as(request(app).get(`/api/reports/compare?leftId=${ids.r1203[0]}`), ids.owner);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  it('없는 리포트면 404', async () => {
    const res = await as(request(app).get(`/api/reports/compare?leftId=${ids.r1203[0]}&rightId=99999`), ids.owner);
    expect(res.status).toBe(404);
  });

  it('접근 불가 리포트 포함 시 403 (tenant가 1204 포함)', async () => {
    const res = await as(
      request(app).get(`/api/reports/compare?leftId=${ids.r1203[0]}&rightId=${ids.r1204}`),
      ids.tenant
    );
    expect(res.status).toBe(403);
  });

  it('수리 전↔수리 후 예외 비교 → 200', async () => {
    // 같은 호실에 repair_pre / repair_post 점검을 만들고 제출
    const mkReport = async (type) => {
      const c = await as(request(app).post('/api/inspections'), ids.contractor).send({
        unitId: ids.unit1203,
        type,
        items: [{ name: '누수', state: 'repair' }],
      });
      const id = c.body.data.inspection.id;
      const s = await as(request(app).post(`/api/inspections/${id}/submit`), ids.contractor);
      return s.body.data.reportId;
    };
    const pre = await mkReport('repair_pre');
    const post = await mkReport('repair_post');

    const res = await as(
      request(app).get(`/api/reports/compare?leftId=${pre}&rightId=${post}`),
      ids.contractor
    );
    expect(res.status).toBe(200);
    expect(res.body.data.compareMeta.isRepairBeforeAfter).toBe(true);
    expect(res.body.data.validation.ok).toBe(true);
  });
});
