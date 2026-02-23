import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Req,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { UpdateLocaleSchema } from './dto/update-locale.dto';
import type { UpdateLocaleDto } from './dto/update-locale.dto';
import { ZodValidationPipe } from '@inquiry/server-core';
import type { Request } from 'express';

/**
 * 사용자 컨트롤러.
 * JWT 인증이 필요한 사용자 관련 엔드포인트를 제공한다.
 */
@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * PATCH /api/users/me/locale
   * 현재 로그인한 사용자의 선호 언어를 변경한다.
   */
  @Patch('me/locale')
  @UsePipes(new ZodValidationPipe(UpdateLocaleSchema))
  async updateLocale(
    @Body() dto: UpdateLocaleDto,
    @Req() req: Request
  ): Promise<{ locale: string }> {
    const user = req.user as { id: string };
    return this.userService.updateLocale(user.id, dto.locale, req.ip);
  }
}
