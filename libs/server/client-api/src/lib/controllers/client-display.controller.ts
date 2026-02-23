import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiExceptionFilter, ZodValidationPipe } from '@inquiry/server-core';
import { ApiRateLimitGuard, ApiRateLimit } from '@inquiry/server-rate-limit';
import { EnvironmentIdGuard } from '../guards/environment-id.guard';
import { ClientDisplayService } from '../services/client-display.service';
import {
  CreateDisplaySchema,
  type CreateDisplayDto,
} from '../dto/create-display.dto';

/**
 * Display 이벤트 기록 API.
 * 설문이 사용자에게 노출될 때 Display 이벤트를 생성한다.
 */
@Controller(':environmentId/displays')
@UseFilters(new ApiExceptionFilter())
@UseGuards(EnvironmentIdGuard, ApiRateLimitGuard)
@ApiRateLimit()
export class ClientDisplayController {
  constructor(private readonly displayService: ClientDisplayService) {}

  /** POST /v1/client/:environmentId/displays — Display 이벤트 생성 */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('environmentId') environmentId: string,
    @Body(new ZodValidationPipe(CreateDisplaySchema)) dto: CreateDisplayDto
  ) {
    return this.displayService.createDisplay({
      surveyId: dto.surveyId,
      environmentId,
    });
  }
}
