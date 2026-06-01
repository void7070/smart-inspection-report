-- 스마트 점검 리포트 DB 스키마 (SQLite)
-- PRD §20 / 백엔드_PRD §4 기준. 재실행이 안전하도록 DROP 후 CREATE.
-- 계층: users → unit_users → units → inspections → (items/observations/images/ai_guides)
--                                        └→ reports → (snapshots/confirmations/share_links)

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS share_links;
DROP TABLE IF EXISTS report_confirmations;
DROP TABLE IF EXISTS report_snapshots;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS ai_guides;
DROP TABLE IF EXISTS inspection_images;
DROP TABLE IF EXISTS inspection_observations;
DROP TABLE IF EXISTS inspection_items;
DROP TABLE IF EXISTS inspections;
DROP TABLE IF EXISTS unit_users;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS buildings;
DROP TABLE IF EXISTS users;

-- 데모 사용자 (로그인 없음)
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('contractor', 'owner', 'tenant')),
  org        TEXT,                       -- 시공업자 소속 등 표시용
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE buildings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  address    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE units (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,             -- 예: '1203호'
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 호실-사용자 권한 연결 (owner/tenant가 어떤 호실에 연결되는지)
CREATE TABLE unit_users (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL CHECK (role IN ('owner', 'tenant')),
  UNIQUE (unit_id, user_id, role)
);

-- 작성 중/제출 전/리포트 완료 점검
CREATE TABLE inspections (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id    INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  type       TEXT NOT NULL,             -- domain/inspectionTypes.js 코드
  flow       TEXT NOT NULL CHECK (flow IN ('whole', 'issue')),
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reported')),
  final_opinion TEXT,                   -- 시공업자 최종 의견
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 전체 점검(공간별) 또는 문제 항목
CREATE TABLE inspection_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  category      TEXT,                    -- whole: 공간(거실/주방...) / issue: 분야(설비·배관...)
  name          TEXT,                    -- 항목명(창호/벽지...)
  state         TEXT,                    -- whole: normal/caution/repair
  location      TEXT,
  description   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 현장 확인 항목 (있음/없음/확인 필요)
CREATE TABLE inspection_observations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  item_id       INTEGER REFERENCES inspection_items(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  value         TEXT NOT NULL CHECK (value IN ('present', 'absent', 'uncertain')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Base64 이미지 (AI 판독하지 않고 저장만)
CREATE TABLE inspection_images (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  item_id       INTEGER REFERENCES inspection_items(id) ON DELETE CASCADE,
  data_base64   TEXT NOT NULL,
  kind          TEXT,                    -- 사진 유형
  caption       TEXT,
  byte_size     INTEGER,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- AI 점검 도우미 결과 (JSON 원본 보관)
CREATE TABLE ai_guides (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  payload_json  TEXT NOT NULL,           -- { summary, actionCards, requiredDocuments, cautionPhrases, opinionDraft }
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 생성 완료 리포트 메타 (1 inspection : 1 report)
CREATE TABLE reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id INTEGER NOT NULL UNIQUE REFERENCES inspections(id),
  unit_id       INTEGER NOT NULL REFERENCES units(id),
  type          TEXT NOT NULL,           -- 비교 매칭용(같은 호실+같은 유형)
  flow          TEXT NOT NULL,
  grade         TEXT NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'E')),
  created_by    INTEGER NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 리포트 고정 스냅샷 (생성 시점 JSON, 이후 불변)
CREATE TABLE report_snapshots (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id     INTEGER NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 임대인/임차인 확인 완료 이력
CREATE TABLE report_confirmations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id    INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  role         TEXT NOT NULL CHECK (role IN ('owner', 'tenant')),
  confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (report_id, user_id)
);

-- 공유 링크 (만료 없음, 시공업자/임대인/임차인 모두 생성 가능)
CREATE TABLE share_links (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id  INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_unit_users_user ON unit_users(user_id);
CREATE INDEX idx_inspections_unit ON inspections(unit_id);
CREATE INDEX idx_inspections_creator ON inspections(created_by);
CREATE INDEX idx_reports_unit ON reports(unit_id);
