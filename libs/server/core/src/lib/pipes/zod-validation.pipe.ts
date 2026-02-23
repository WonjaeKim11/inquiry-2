import { PipeTransform, BadRequestException } from '@nestjs/common';
import type { ZodSchema, ZodError } from 'zod';

/**
 * Zod 스키마 기반 ValidationPipe.
 * DTO를 Zod 스키마로 검증하고, 실패 시 BadRequestException을 던진다.
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const zodError = result.error as ZodError;
      const details: Record<string, string[]> = {};
      for (const issue of zodError.issues) {
        const path = issue.path.join('.') || '_root';
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(issue.message);
      }
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: '입력값 검증에 실패했습니다.',
        details,
      });
    }
    return result.data;
  }
}
