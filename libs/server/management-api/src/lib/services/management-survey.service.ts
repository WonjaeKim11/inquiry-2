import { Injectable } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { ResourceNotFoundException } from '@inquiry/server-core';
import type { CreateSurveyDto } from '../dto/create-survey.dto';
import type { UpdateSurveyDto } from '../dto/update-survey.dto';

/** 설문 조회 시 select할 필드 목록 */
const SURVEY_SELECT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  type: true,
  status: true,
  environmentId: true,
  creatorId: true,
  schema: true,
  welcomeCard: true,
  endings: true,
  hiddenFields: true,
  variables: true,
  followUps: true,
  triggers: true,
  displayOption: true,
  displayLimit: true,
  displayPercentage: true,
  delay: true,
  autoClose: true,
  autoComplete: true,
  recontactDays: true,
  pin: true,
  singleUse: true,
  slug: true,
  styling: true,
  projectOverwrites: true,
  surveyMetadata: true,
  languages: true,
  isVerifyEmailEnabled: true,
  isSingleResponsePerEmailEnabled: true,
  isBackButtonHidden: true,
  isIpCollectionEnabled: true,
} as const;

/**
 * Management API Survey CRUD 서비스.
 * 환경(Environment) 단위로 설문 조사를 관리한다.
 */
@Injectable()
export class ManagementSurveyService {
  constructor(private readonly prisma: ServerPrismaService) {}

  /**
   * 환경별 설문 목록 조회.
   * 최신순으로 정렬하여 반환한다.
   * @param environmentId - 대상 환경 ID
   */
  async list(environmentId: string) {
    return this.prisma.survey.findMany({
      where: { environmentId },
      select: SURVEY_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 설문 생성.
   * @param environmentId - 설문이 속할 환경 ID
   * @param input - 설문 생성 데이터
   */
  async create(environmentId: string, input: CreateSurveyDto) {
    return this.prisma.survey.create({
      data: {
        environmentId,
        name: input.name,
        ...(input.type !== undefined && { type: input.type as any }),
        ...(input.status !== undefined && { status: input.status as any }),
        ...(input.schema !== undefined && { schema: input.schema as any }),
        ...(input.welcomeCard !== undefined && {
          welcomeCard: input.welcomeCard as any,
        }),
        ...(input.endings !== undefined && {
          endings: input.endings as any,
        }),
        ...(input.hiddenFields !== undefined && {
          hiddenFields: input.hiddenFields as any,
        }),
        ...(input.variables !== undefined && {
          variables: input.variables as any,
        }),
        ...(input.displayOption !== undefined && {
          displayOption: input.displayOption as any,
        }),
        ...(input.displayLimit !== undefined && {
          displayLimit: input.displayLimit,
        }),
        ...(input.delay !== undefined && { delay: input.delay }),
        ...(input.autoClose !== undefined && {
          autoClose: input.autoClose,
        }),
        ...(input.autoComplete !== undefined && {
          autoComplete: input.autoComplete,
        }),
      },
      select: SURVEY_SELECT,
    });
  }

  /**
   * 설문 단건 조회.
   * 응답(responses)과 노출(displays) ID 목록을 함께 반환한다.
   * @param environmentId - 대상 환경 ID (소유권 검증용)
   * @param surveyId - 조회 대상 설문 ID
   * @throws ResourceNotFoundException - 해당 환경에 설문이 없을 때
   */
  async findById(environmentId: string, surveyId: string) {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, environmentId },
      select: {
        ...SURVEY_SELECT,
        responses: { select: { id: true } },
        displays: { select: { id: true } },
      },
    });

    if (!survey) {
      throw new ResourceNotFoundException('Survey', surveyId);
    }

    return survey;
  }

  /**
   * 설문 수정.
   * 전달된 필드만 업데이트한다 (partial update).
   * @param environmentId - 대상 환경 ID (소유권 검증용)
   * @param surveyId - 수정 대상 설문 ID
   * @param input - 수정할 필드들
   * @throws ResourceNotFoundException - 해당 환경에 설문이 없을 때
   */
  async update(
    environmentId: string,
    surveyId: string,
    input: UpdateSurveyDto
  ) {
    // 해당 환경에 속한 설문인지 확인
    const existing = await this.prisma.survey.findFirst({
      where: { id: surveyId, environmentId },
    });

    if (!existing) {
      throw new ResourceNotFoundException('Survey', surveyId);
    }

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData['name'] = input.name;
    if (input.type !== undefined) updateData['type'] = input.type;
    if (input.status !== undefined) updateData['status'] = input.status;
    if (input.schema !== undefined) updateData['schema'] = input.schema;
    if (input.welcomeCard !== undefined)
      updateData['welcomeCard'] = input.welcomeCard;
    if (input.endings !== undefined) updateData['endings'] = input.endings;
    if (input.hiddenFields !== undefined)
      updateData['hiddenFields'] = input.hiddenFields;
    if (input.variables !== undefined)
      updateData['variables'] = input.variables;
    if (input.displayOption !== undefined)
      updateData['displayOption'] = input.displayOption;
    if (input.displayLimit !== undefined)
      updateData['displayLimit'] = input.displayLimit;
    if (input.delay !== undefined) updateData['delay'] = input.delay;
    if (input.autoClose !== undefined)
      updateData['autoClose'] = input.autoClose;
    if (input.autoComplete !== undefined)
      updateData['autoComplete'] = input.autoComplete;

    return this.prisma.survey.update({
      where: { id: surveyId },
      data: updateData,
      select: SURVEY_SELECT,
    });
  }

  /**
   * 설문 삭제.
   * @param environmentId - 대상 환경 ID (소유권 검증용)
   * @param surveyId - 삭제 대상 설문 ID
   * @throws ResourceNotFoundException - 해당 환경에 설문이 없을 때
   */
  async remove(environmentId: string, surveyId: string) {
    // 해당 환경에 속한 설문인지 확인
    const existing = await this.prisma.survey.findFirst({
      where: { id: surveyId, environmentId },
    });

    if (!existing) {
      throw new ResourceNotFoundException('Survey', surveyId);
    }

    await this.prisma.survey.delete({ where: { id: surveyId } });
  }
}
