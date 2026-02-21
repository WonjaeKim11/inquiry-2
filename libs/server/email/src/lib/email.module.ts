import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * 이메일 서비스 글로벌 모듈.
 * @Global()로 등록하여 어디서든 EmailService를 주입받을 수 있다.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
