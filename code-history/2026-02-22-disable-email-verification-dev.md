# 개발 환경 이메일 인증 비활성화 설정

## Overview
회원가입 시 이메일 인증 메일이 전송되지 않는 문제를 조사한 결과, SMTP 환경 변수가 미설정 상태임을 확인했다.
`EmailService`는 SMTP 설정이 없으면 no-op 모드로 동작하여 이메일 발송을 스킵하도록 설계되어 있으므로,
개발 환경에서는 `EMAIL_VERIFICATION_DISABLED=true`로 설정하여 이메일 인증을 건너뛰도록 조치했다.

## Changed Files
- `.env` — `EMAIL_VERIFICATION_DISABLED=true` 추가 (gitignore 대상, 커밋 미포함)

## Major Changes

### 문제 원인
`.env` 파일에서 SMTP 관련 환경 변수(`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`)가 모두 주석 처리되어 있었다.

`libs/server/email/src/lib/email.service.ts`의 `onModuleInit()`에서 SMTP 설정이 없으면 transporter를 생성하지 않으며,
`send()` 메서드에서 transporter가 null이면 `[No-op] 이메일 발송 스킵` 로그만 남기고 return한다.

```typescript
// email.service.ts - onModuleInit()
if (!host || !user || !pass) {
  this.logger.warn('SMTP 설정이 없습니다. 이메일 발송이 비활성화됩니다.');
  return;
}
```

### 적용한 해결책
`.env` 파일에 아래 설정을 주석 해제하여 이메일 인증을 비활성화했다:

```bash
EMAIL_VERIFICATION_DISABLED=true   # 이메일 검증 생략 (개발 환경)
```

이 설정이 적용되면 `server-auth.service.ts`의 `signup()` 메서드에서
이메일 발송 대신 `emailVerified` 필드를 즉시 현재 시각으로 업데이트한다:

```typescript
// server-auth.service.ts - signup()
if (!emailVerificationDisabled) {
  // SMTP가 설정되어 있으면 이메일 발송
  const token = this.generateEmailVerificationToken(user.id, user.email);
  await this.emailService.sendVerificationEmail(user.email, user.name, token);
} else {
  // 이메일 검증 비활성화 시 즉시 검증 처리
  await this.prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });
}
```

## How to use it
1. `.env` 파일에서 `EMAIL_VERIFICATION_DISABLED=true` 설정 확인
2. 서버 재시작
3. 회원가입 시 이메일 인증 없이 즉시 로그인 가능

### 프로덕션 배포 시
프로덕션 환경에서는 반드시 아래 환경 변수를 설정해야 한다:
```bash
EMAIL_VERIFICATION_DISABLED=false  # 또는 생략 (기본값 false)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-smtp-user"
SMTP_PASSWORD="your-smtp-password"
EMAIL_FROM="noreply@yourdomain.com"
```

## Related Components/Modules
- `libs/server/email/src/lib/email.service.ts` — nodemailer 기반 SMTP 이메일 발송 서비스
- `libs/server/auth/src/lib/server-auth.service.ts` — 회원가입 로직 및 이메일 검증 토큰 생성
- `libs/client/auth/src/lib/verify-email.tsx` — 이메일 검증 클라이언트 컴포넌트
- `packages/db/prisma/schema.prisma` — User 모델의 `emailVerified` 필드

## Precautions
- `.env` 파일은 `.gitignore` 대상이므로 팀원은 각자 로컬 환경에서 설정해야 함
- `EMAIL_VERIFICATION_DISABLED=true`는 **개발 환경 전용** 설정이며, 프로덕션에서는 반드시 SMTP를 설정하고 이메일 인증을 활성화해야 함
- 추후 MailHog 등 로컬 SMTP 서버를 Docker Compose에 추가하면 개발 환경에서도 이메일 플로우를 테스트할 수 있음
