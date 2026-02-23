import {
  Controller,
  Post,
  Put,
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
import { ClientResponseService } from '../services/client-response.service';
import {
  CreateResponseSchema,
  type CreateResponseDto,
} from '../dto/create-response.dto';
import {
  UpdateResponseSchema,
  type UpdateResponseDto,
} from '../dto/update-response.dto';

/**
 * 설문 응답 API.
 * 클라이언트에서 설문 응답을 생성하고 업데이트한다.
 */
@Controller(':environmentId/responses')
@UseFilters(new ApiExceptionFilter())
@UseGuards(EnvironmentIdGuard, ApiRateLimitGuard)
@ApiRateLimit()
export class ClientResponseController {
  constructor(private readonly responseService: ClientResponseService) {}

  /** POST /v1/client/:environmentId/responses — 응답 생성 */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('environmentId') environmentId: string,
    @Body(new ZodValidationPipe(CreateResponseSchema)) dto: CreateResponseDto
  ) {
    return this.responseService.createResponse(environmentId, dto);
  }

  /** PUT /v1/client/:environmentId/responses/:responseId — 응답 업데이트 */
  @Put(':responseId')
  async update(
    @Param('environmentId') environmentId: string,
    @Param('responseId') responseId: string,
    @Body(new ZodValidationPipe(UpdateResponseSchema)) dto: UpdateResponseDto
  ) {
    return this.responseService.updateResponse(environmentId, responseId, dto);
  }
}
