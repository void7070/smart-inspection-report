import 'dotenv/config';

/**
 * 환경변수와 서버 설정을 한 곳에서 읽는다.
 * 다른 모듈은 process.env를 직접 읽지 말고 여기서 가져다 쓴다.
 */
export const config = {
  port: Number(process.env.PORT ?? 3000),
  // SQLite 파일 경로. 테스트는 ':memory:'를 직접 createDb에 넘긴다.
  dbFile: process.env.DB_FILE ?? 'app.db',
  // Base64 이미지가 본문에 실리므로 넉넉히. (개별 이미지/장수 제한은 IMAGE_LIMITS로 별도 검증)
  jsonLimit: process.env.JSON_BODY_LIMIT ?? '25mb',
  // GPT 연동(B06)에서 사용
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
};

/**
 * 이미지 제한. (기능명세/하네스 §7 기준)
 * - 이미지 1장 ≤ 10MB
 * - 점검 항목당 ≤ 5장
 * - 리포트 전체 ≤ 20장
 * 실제 검증은 lib/validation.js 가 이 상수를 사용한다.
 */
export const IMAGE_LIMITS = {
  maxBytesPerImage: 10 * 1024 * 1024,
  maxPerItem: 5,
  maxPerReport: 20,
};
