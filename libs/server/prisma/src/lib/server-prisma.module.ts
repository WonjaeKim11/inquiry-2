import { Module, Global } from '@nestjs/common';
import { ServerPrismaService } from './server-prisma.service';

@Global()
@Module({
  controllers: [],
  providers: [ServerPrismaService],
  exports: [ServerPrismaService],
})
export class ServerPrismaModule {}
