import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

/**
 * 암호화 글로벌 모듈.
 * @Global()로 등록하여 어디서든 EncryptionService를 주입받을 수 있다.
 * AES-256-GCM 기반 암호화/복호화를 제공한다.
 */
@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class CryptoModule {}
