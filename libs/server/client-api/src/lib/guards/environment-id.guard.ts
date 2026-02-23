import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ServerPrismaService } from '@inquiry/server-prisma';
import {
  isValidCuid2,
  ResourceNotFoundException,
  InvalidInputException,
} from '@inquiry/server-core';

/**
 * Environment ID 검증 가드.
 * 경로 파라미터의 environmentId가 유효한 CUID2 형식이고, DB에 존재하는지 확인한다.
 */
@Injectable()
export class EnvironmentIdGuard implements CanActivate {
  constructor(private readonly prisma: ServerPrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const environmentId = request.params['environmentId'];

    // CUID2 형식 검증
    if (!environmentId || !isValidCuid2(environmentId)) {
      throw new InvalidInputException('Invalid environment ID format');
    }

    // DB 존재 여부 확인
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { id: true },
    });

    if (!environment) {
      throw new ResourceNotFoundException('Environment', environmentId);
    }

    return true;
  }
}
