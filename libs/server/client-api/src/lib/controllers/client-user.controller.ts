import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { ApiExceptionFilter, ZodValidationPipe } from '@inquiry/server-core';
import { ApiRateLimitGuard, ApiRateLimit } from '@inquiry/server-rate-limit';
import { EnvironmentIdGuard } from '../guards/environment-id.guard';
import { ClientUserService } from '../services/client-user.service';
import {
  IdentifyUserSchema,
  type IdentifyUserDto,
} from '../dto/identify-user.dto';

/**
 * 사용자 식별 API.
 * 클라이언트 SDK가 사용자를 식별하고 Contact을 생성/업데이트한다.
 */
@Controller(':environmentId/user')
@UseFilters(new ApiExceptionFilter())
@UseGuards(EnvironmentIdGuard, ApiRateLimitGuard)
@ApiRateLimit()
export class ClientUserController {
  constructor(private readonly userService: ClientUserService) {}

  /** POST /v1/client/:environmentId/user — 사용자 식별/Contact upsert */
  @Post()
  async identify(
    @Param('environmentId') environmentId: string,
    @Body(new ZodValidationPipe(IdentifyUserSchema)) dto: IdentifyUserDto
  ) {
    return this.userService.identifyUser(environmentId, dto);
  }
}
