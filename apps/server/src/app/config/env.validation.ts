import { z } from 'zod';
import { Logger } from '@nestjs/common';

/**
 * 환경변수 검증 스키마.
 * 서버 부트스트랩 시 모든 필수 환경변수가 올바르게 설정되었는지 검증한다.
 */
const envSchema = z.object({
  // 필수: 데이터베이스
  DATABASE_URL: z.string().min(1, 'DATABASE_URL은 필수입니다.'),

  // 필수: JWT 시크릿
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET은 필수입니다.'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET은 필수입니다.'),

  // 필수: 클라이언트 URL
  CLIENT_URL: z.string().url().default('http://localhost:4200'),

  // 선택: 서버 포트
  PORT: z.coerce.number().int().positive().default(3000),

  // 선택: Redis
  REDIS_URL: z.string().optional(),

  // 선택: Rate Limiting 비활성화
  RATE_LIMIT_DISABLED: z.enum(['true', 'false']).optional().default('false'),

  // 선택: OAuth - Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // 선택: OAuth - GitHub
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // 선택: SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // 선택: Sentry
  SENTRY_DSN: z.string().optional(),

  // 선택: 로그 레벨
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .optional(),

  // 선택: 라이선스
  LICENSE_KEY: z.string().optional(),

  // 선택: 기능 토글
  MULTI_ORG_ENABLED: z.enum(['true', 'false']).optional().default('true'),
  EMAIL_VERIFICATION_DISABLED: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),
  SESSION_MAX_DURATION: z.coerce.number().int().positive().optional(),

  // 선택: 외부 서비스
  TURNSTILE_SECRET_KEY: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),

  // 선택: CORS 추가 허용 도메인 (쉼표 구분)
  CORS_ALLOWED_ORIGINS: z.string().optional(),

  // 선택: 파일 저장 경로 (기본: ./uploads)
  STORAGE_PATH: z.string().optional().default('./uploads'),

  // 노드 환경
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development'),
});

/** 검증된 환경변수 타입 */
export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * 환경변수 검증 함수.
 * 부트스트랩 시 호출하여 필수 환경변수가 올바르게 설정되었는지 확인한다.
 * 검증 실패 시 에러 로그를 출력하고 프로세스를 종료한다.
 */
export function validateEnv(): ValidatedEnv {
  const logger = new Logger('EnvValidation');

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    logger.error('환경변수 검증 실패:');
    for (const issue of result.error.issues) {
      logger.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  logger.log('환경변수 검증 완료');
  return result.data;
}
