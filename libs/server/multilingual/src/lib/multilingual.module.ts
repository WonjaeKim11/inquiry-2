import { Module } from '@nestjs/common';
import { MultilingualValidationService } from './multilingual-validation.service.js';

/**
 * 다국어 모듈.
 * MultilingualValidationService를 제공한다.
 * ServerPrismaModule은 @Global()이므로 별도 import 불필요.
 */
@Module({
  providers: [MultilingualValidationService],
  exports: [MultilingualValidationService],
})
export class MultilingualModule {}
