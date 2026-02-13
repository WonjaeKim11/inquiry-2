import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient를 확장한 NestJS 서비스.
 * 모듈 생명주기에 맞춰 DB 연결을 자동 관리한다.
 */
@Injectable()
export class ServerPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
