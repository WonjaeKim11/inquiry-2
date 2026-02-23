import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isValidCuid2 } from '../utils/cuid2.util';

/**
 * 경로 파라미터가 유효한 CUID2 형식인지 검증하는 파이프.
 * @Param('id', Cuid2ValidationPipe) 형태로 사용한다.
 *
 * @example
 * ```typescript
 * @Get(':id')
 * findOne(@Param('id', Cuid2ValidationPipe) id: string) {
 *   return this.service.findOne(id);
 * }
 * ```
 */
@Injectable()
export class Cuid2ValidationPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isValidCuid2(value)) {
      throw new BadRequestException(`Invalid CUID2 format: ${value}`);
    }
    return value;
  }
}
