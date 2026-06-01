import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import defaultDb from './db/index.js';
import { responseEnvelope } from './middleware/responseEnvelope.js';
import { requestLogger } from './middleware/logger.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { createApiRouter } from './routes/api.js';
import { createOpenAiComplete } from './services/ai/openaiClient.js';

/**
 * Express 앱을 생성해 반환한다.
 * 서버 시작(listen)은 index.js가 담당하고, 이 함수는 supertest 등에서
 * 그대로 import 해 테스트할 수 있도록 app만 만들어 export 한다.
 *
 * @param {object} db   주입할 DB 핸들. 생략 시 런타임 싱글톤(app.db). 테스트는 in-memory.
 * @param {object} deps 주입 의존성. deps.aiComplete 생략 시 config 기반 OpenAI 클라이언트.
 *                      테스트는 가짜 aiComplete를 넘겨 네트워크 없이 동작시킨다.
 *
 * 미들웨어 순서: cors -> json -> 응답봉투 -> 로깅 -> 라우트 -> 404 -> 에러핸들러
 */
export function createApp(db = defaultDb, deps = {}) {
  const app = express();
  const aiComplete = deps.aiComplete ?? createOpenAiComplete(config);

  app.use(cors());
  app.use(express.json({ limit: config.jsonLimit }));
  app.use(responseEnvelope);
  app.use(requestLogger);

  // --- 라우트 ---
  app.get('/api/health', (req, res) => {
    res.ok({ status: 'ok', service: 'smart-inspection-backend' });
  });
  app.use('/api', createApiRouter(db, { aiComplete }));

  // --- 마무리 (반드시 라우트 뒤에) ---
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
