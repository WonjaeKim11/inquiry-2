/**
 * 감사 로그 전용 Pino 로거 인스턴스.
 * 비즈니스 로그와 분리된 감사 전용 로그 채널을 제공한다.
 */

import pino from 'pino';

/**
 * 감사 로그 전용 Pino 인스턴스 생성.
 * 개발 환경에서는 pino-pretty로 가독성 있는 출력을,
 * 프로덕션 환경에서는 JSON 구조화 로그를 생성한다.
 * @returns 감사 전용 pino.Logger 인스턴스
 */
export function createAuditLogger(): pino.Logger {
  const isDev = process.env['NODE_ENV'] !== 'production';

  return pino({
    name: 'audit',
    level: 'info',
    ...(isDev
      ? {
          // 개발 환경: 컬러 포맷팅으로 가독성 향상
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname',
              messageFormat: '[AUDIT] {msg}',
            },
          },
        }
      : {
          // 프로덕션: JSON 구조화 로그 (ELK, CloudWatch 등에서 파싱 가능)
          formatters: {
            level(label: string) {
              return { level: label };
            },
          },
        }),
  });
}
