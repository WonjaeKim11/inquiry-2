import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * PrismaClient를 확장한 NestJS 서비스.
 * Prisma 7.x에서는 PrismaPg 어댑터를 통해 DB에 연결한다.
 * 모듈 생명주기에 맞춰 DB 연결을 자동 관리한다.
 */
@Injectable()
export class ServerPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env['DATABASE_URL']!,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
