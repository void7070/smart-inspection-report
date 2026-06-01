# 스마트 점검 리포트 (Smart Inspection Report)

Vue 3 + Express + SQLite 기반 점검 리포트 데모. 시공업자가 점검을 작성·제출하면
리포트가 자동 생성되고, 임대인/임차인이 조회·확인·비교·공유할 수 있다.
발표용 데모이지만 DB·API·AI·리포트·PDF·공유·비교까지 실제 동작한다.

> 기획 문서가 기준입니다: `PRD_v1.0_스마트점검리포트.md`, `기능명세서_v3.0_*.md`,
> 세션별 PRD, `개발_하네스_OMC_ClaudeCode.md`. 작업 규칙·아키텍처 불변 규칙은 `CLAUDE.md` 참고.

## 기술 스택

| 영역 | 스택 |
|---|---|
| 프론트엔드 | Vue 3 + Vite + Tailwind CSS v4 + Vue Router |
| 백엔드 | Node.js + Express 5 |
| DB | SQLite + better-sqlite3 |
| AI | GPT API (OpenAI) — 키 없으면 기본 템플릿으로 폴백 |
| 테스트 | Vitest (양쪽), supertest (백엔드 API) |

요구사항: **Node.js 20+** (개발은 Node 24 기준 — 백엔드 dev가 네이티브 `--watch` 사용).

## 프로젝트 구조

```
.
├─ backend/      Express API 서버 (포트 3000)
│   ├─ src/        app/config/db/domain/lib/middleware/repositories/routes/services
│   ├─ prompts/    AI 시스템 프롬프트 2개
│   └─ test/       Vitest (107 테스트)
├─ frontend/     Vue 3 앱 (포트 5173)
│   ├─ src/        views/components/stores/lib/domain/router
│   └─ test/       Vitest (27 테스트)
├─ CLAUDE.md      작업 규칙 / 아키텍처 불변 규칙
└─ *.md, *.html   기획 문서 (PRD, 명세서, 세션 계획, 와이어프레임)
```

## 실행 방법

### 1) 백엔드

```bash
cd backend
npm install
cp .env.example .env       # PowerShell: Copy-Item .env.example .env
npm run db:init            # SQLite 스키마 + 데모 seed 생성 (app.db)
npm run dev                # http://localhost:3000  (node --watch)
```

확인: `curl http://localhost:3000/api/health` → `{"success":true,...}`

### 2) 프론트엔드

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

브라우저에서 **http://localhost:5173** 접속. (백엔드가 함께 떠 있어야 함)

> AI(GPT)를 실제로 쓰려면 `backend/.env`의 `OPENAI_API_KEY`를 채우고 백엔드만 재시작.
> 키가 없으면 AI 도우미는 기본 템플릿으로 동작하며 점검 제출은 막히지 않는다.

## 테스트

```bash
cd backend  && npm test    # 107 (logic + API)
cd frontend && npm test    # 27  (logic + component)
```

핵심 로직(등급 산출·이미지 한도·비교 조건·AI 금지표현 필터·스냅샷 불변성)은 순수 함수로
분리해 단위 테스트하고, API는 supertest + in-memory SQLite로 검증한다. 자세한 방침은 `CLAUDE.md`.

## API 응답 형식

```jsonc
{ "success": true,  "data": { /* ... */ } }                      // 성공
{ "success": false, "error": { "code": "...", "message": "..." } } // 실패
```

데모 인증: 로그인 없이 `x-user-id` 헤더로 사용자를 식별하고, 권한은 **백엔드가 DB 기준으로** 판단한다.

## 발표 시연 시나리오

1. http://localhost:5173 접속 → 데모 사용자 선택
2. **이시공**(시공업자) 선택 → 시공업자 홈 (작성 중 1 / 제출 대기 1)
3. **새 점검 시작** → 유형(정기/입주 전) + 호실 선택 → 시작
4. 공간별 상태 입력 (거실 창호 → **주의** 선택 시 위치·설명 펼침) → **저장**
5. **AI 도우미 호출** → 카드 확인 → **초안 적용** → 최종 의견 작성
6. **사진 첨부** (파일 선택 → 미리보기)
7. **점검 제출** → 리포트 자동 생성
8. **사용자 변경** → **김임대**(임대인) → 리포트 목록(필터) → 상세 → **확인 완료** / **공유 링크** / **PDF 저장(인쇄)**
9. **리포트 비교** → 1203호 정기점검 2건 선택 → 나란히 비교 (B등급 vs A등급)
10. **박임차**(임차인) 전환 → 본인 호실(1203) 리포트만 표시

## 발표 체크리스트

- [ ] `npm run db:init`으로 데모 데이터 초기화 (시연 직전 권장)
- [ ] 백엔드(3000) + 프론트(5173) 모두 실행 중
- [ ] 사용자 3명 표시 (이시공/김임대/박임차)
- [ ] 시공업자 홈에 작성 중·제출 대기 점검 표시
- [ ] 점검 저장 후 재진입 시 입력값 유지
- [ ] AI 도우미 카드 표시 (키 없으면 폴백 안내)
- [ ] 제출 후 리포트 생성 + 점검 수정/삭제 차단됨
- [ ] 임대인: 리포트 3건, 임차인: 1203호 리포트만
- [ ] 확인 완료 저장, 공유 링크 비인증 조회
- [ ] 1203 정기점검 B vs A 비교 / 다른 호실 비교 시 오류
- [ ] 인쇄 화면에서 내비·버튼 숨김 (`@media print`)

## 데모 seed 데이터

사용자 3(이시공/김임대/박임차) · 건물 2 · 호실 3(1203·1204·201) · 리포트 3(1203 정기 B/A, 1204 입주전 A) ·
작성 중 점검 1(201 입주전) · 제출 대기 점검 1(1204 긴급, 누수). 임대인=3호실 소유, 임차인=1203호 거주.
