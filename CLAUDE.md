# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

**Implemented end-to-end.** `backend/` (Express + SQLite, 13 API endpoints, 107 tests) and `frontend/` (Vue 3 + Vite + Tailwind, full screens, 27 tests) are built and working. Sessions S00, B01–B08, F01–F08 are done; remaining work is integration polish (I01–I03). See `README.md` for the run guide, demo scenario, and presentation checklist.

The Korean planning documents remain the **source of truth** for the "스마트 점검 리포트" (Smart Inspection Report) project — a presentation demo built to actually work end-to-end (DB, API, AI, report generation, PDF, share links, comparison).

The documents (read these before implementing anything):

- `PRD_v1.0_스마트점검리포트.md` — product requirements, API list, DB schema draft, routes, AI response contract
- `기능명세서_v3.0_스마트점검리포트.md` — detailed functional spec (largest doc)
- `요구사항분석서_v3.0_스마트점검리포트.md` — requirements analysis
- `OMC_개발세션_분할계획.md` — session split plan (S00, B01–B08, F01–F08, I01–I03)
- `백엔드_PRD_세션별.md` / `프론트엔드_PRD_세션별.md` — per-session backend/frontend specs
- `개발_하네스_OMC_ClaudeCode.md` — the development harness: session command templates, validation checklists, error-handling table
- `와이어프레임_v3.0_스마트점검리포트.html` — wireframe (open in a browser)

When an API contract, DB schema, or response shape changes during implementation, update the relevant doc — the docs and code must stay in sync.

## Architecture

Monorepo with two packages:

- **`frontend/`** — Vue 3 + Vite + Tailwind CSS v4 + Vue Router. Dev on port **5173**. API base via `VITE_API_BASE_URL` (defaults to `http://localhost:3000`). Session in `src/stores/session.js` (localStorage). Pure logic in `src/lib/` (unit-tested); presentational components (`ReportSnapshotView`, `AiGuidePanel`) take data via props so the API call stays in the parent.
- **`backend/`** — Node.js + Express 5 + SQLite via **better-sqlite3**. Dev on port **3000**. Layered: `routes/` → `repositories/` (take `db` as first arg for test injection) → `db/`. Pure logic in `lib/` (`grading`, `validation`, `compare`, `aiSafety`). `createApp(db, { aiComplete })` accepts injected deps so tests use in-memory DB + a fake AI client. GPT key read **only** from `.env`; AI prompts in `backend/prompts/*.md`.

### Commands

```bash
# backend (port 3000)
cd backend && npm install
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
npm run db:init               # build app.db: schema + demo seed
npm run dev                   # node --watch
npm test                      # vitest (107)
npm test -- grading           # run a single test file by name

# frontend (port 5173)
cd frontend && npm install && npm run dev
npm test                      # vitest (27)
```

Health check: `curl http://localhost:3000/api/health`. When an API contract, DB schema, or response shape changes, update the relevant planning doc — docs and code must stay in sync.

> ⚠️ Windows live testing: a stale `node` process holding port 3000 will serve old data. Before manually starting a server, run `Stop-Process -Name node -Force`. Vitest does not use a port, so tests are unaffected.

## Testing

The docs do not mandate a test framework. Recommended approach (this is a demo — keep it light and test only logic whose failure would break the demo):

- **Tooling: Vitest on both packages** (`npm i -D vitest`; scripts `"test": "vitest run"`, `"test:watch": "vitest"`). Frontend component tests use `@vue/test-utils` + `happy-dom`; backend API tests use `supertest` with an in-memory DB (`new Database(':memory:')`).
- **Keep testable logic in pure functions** (e.g. `backend/lib/grading.js`, `backend/lib/validation.js`) rather than inline in route handlers, so it can be unit-tested without a DB.

Backend — priority order:
1. **Pure logic (highest value):** grade calculation (A–E rules), `inspectionFlow` mapping (whole vs issue), image limits (10MB / 5 per item / 20 per report), comparison constraints (same unit + same type, 수리 전/후 exception).
2. **API integration (supertest + in-memory SQLite):** editing/deleting a `reported` inspection → `400`/`403`; unauthorized report access → `403`; submit → report + snapshot created; **snapshot immutability** (mutating the source inspection after submit must not change the snapshot).

Frontend — minimal: only logic-bearing pieces (`PhotoUploader` size/count limits, API client attaching `userId`). Screens are verified manually via the harness checklist, not automated.

## Session-based development workflow

Development is split into single-responsibility sessions (`B01`–`B08` backend, `F01`–`F08` frontend, `I01`–`I03` integration). Each session must:

1. Read the relevant PRD/spec docs first and check prior sessions' output.
2. Stay within its assigned scope — do not modify out-of-scope files unnecessarily.
3. Leave a handoff report (구현 내용 / 수정 파일 / 실행 방법 / 검증 결과 / 다음 세션 주의사항).

Session command templates are in `개발_하네스_OMC_ClaudeCode.md` §3.

## Architectural invariants (non-obvious, enforce these)

These policies are easy to violate and are the core of the spec:

- **No login.** A demo user is selected and `selectedUserId` + `selectedRole` are stored in `localStorage`. The frontend sends `userId` on requests; the **backend re-checks permissions against the DB** (owner / tenant / contractor scopes). Never trust the role from the client alone. Unauthorized report access → `403`.
- **Reports are immutable.** Submitting an inspection (`POST /api/inspections/:id/submit`) auto-generates a report and writes a frozen **snapshot JSON** (`report_snapshots`). Once an inspection is `reported`, it cannot be edited or deleted (`400`/`403`). To "change" a report, create a new one. The snapshot must not change even if the underlying inspection later changes. Do **not** expose edit/delete UI for completed reports.
- **Inspection flow is derived from type.** 입주 전/정기 → `whole` flow; 퇴거 전/퇴거 후/긴급/수리 전/수리 후 → `issue` flow. Inspection status lifecycle: `draft` → `submitted` → `reported`.
- **AI never blocks the workflow.** AI failure (call error or JSON parse failure) must fall back to a default template or manual entry — it must never prevent submitting an inspection or writing the final opinion. AI output is **JSON only** (`summary`, `actionCards`, `requiredDocuments`, `cautionPhrases`, `opinionDraft`). The report shows only the contractor's **final opinion**, not the raw AI draft.
- **AI is forbidden from making judgments:** no legal liability, no tenant/landlord fault assignment, no deposit-deduction decisions, no litigation/precedent claims, and **no image analysis** (images are stored as Base64 only, never read by AI).
- **Image limits** (validated separately from the body-size limit): 1 image ≤ 10MB, ≤ 5 per item, ≤ 20 per report. Set Express body limit large enough for Base64 payloads.
- **Share links** (`POST /api/reports/:id/share` → `GET /api/share/:token`): creatable by contractor/owner/tenant, **never expire**, names are **not** masked on the shared view, and viewers cannot confirm/edit/delete.
- **Report comparison** (`GET /api/reports/compare?leftId=&rightId=`): same unit **and** same inspection type, exactly 2 reports; the only cross-type exception is 수리 전 ↔ 수리 후. No automatic analysis — return both snapshots + validation; condition mismatch → `400`.
- **PDF is client-side only** via `window.print()` on `/reports/:id/print` with `@media print` (no server-side PDF generation).
- Tenants can confirm and view reports but **cannot write opinions** — do not build that UI.
- Grades A–E are computed at submit time per the rules in `백엔드_PRD_세션별.md` §7 (differs for `whole` vs `issue` flows; 소방·안전 issues escalate to E).

## API surface (see PRD §19 for the full table)

`/api/health`, `/api/demo/users`, `/api/session/select-user`, `/api/units`, `/api/units/:id/reports`, `/api/inspections` (POST/GET/PATCH/DELETE + `/:id/submit`), `/api/ai/inspection-guide`, `/api/reports` (+ `/:id`, `/:id/confirm`, `/:id/share`, `/compare`), `/api/share/:token`. All responses use a consistent JSON envelope.

DB tables: `users`, `buildings`, `units`, `unit_users`, `inspections`, `inspection_items`, `inspection_observations`, `inspection_images`, `ai_guides`, `reports`, `report_snapshots`, `report_confirmations`, `share_links`.

## Notes

- The docs and UI copy are in Korean; keep user-facing strings and report content in Korean.
- `.omc/` is the oh-my-claudecode workspace (session/HUD state), not project source.
