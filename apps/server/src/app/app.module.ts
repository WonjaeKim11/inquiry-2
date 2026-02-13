import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServerPrismaModule } from '@inquiry/server-prisma';
import { ServerAuthModule } from '@inquiry/server-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * 루트 애플리케이션 모듈.
 * libs에서 제공하는 모듈들만 import하여 조합한다.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ServerPrismaModule, ServerAuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
