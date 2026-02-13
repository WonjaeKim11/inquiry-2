import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 현재 인증된 사용자 정보를 컨트롤러 파라미터로 주입하는 데코레이터.
 * JwtAuthGuard가 적용된 라우트에서만 사용 가능.
 */
export const CurrentUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  // data가 지정되면 해당 필드만 반환 (e.g., @CurrentUser('id'))
  return data ? user?.[data] : user;
});
