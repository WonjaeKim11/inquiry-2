import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { ResourceNotFoundException } from '@inquiry/server-core';
import * as crypto from 'crypto';

/**
 * 개인화된 설문 링크 서비스.
 * Contact별 고유 URL 토큰을 HMAC-SHA256으로 생성한다.
 */
@Injectable()
export class PersonalizedLinkService {
  private readonly logger = new Logger(PersonalizedLinkService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly configService: ConfigService
  ) {}

  /**
   * 개인화된 설문 링크를 생성한다.
   * 동일 contactId + surveyId 조합에 대해 기존 링크가 있으면 만료일만 갱신하고,
   * 없으면 새 토큰을 발급한다.
   * @param surveyId - 설문 ID
   * @param contactIds - 대상 연락처 ID 배열
   * @param expirationDays - 만료일 (null이면 영구)
   */
  async createLinks(
    surveyId: string,
    contactIds: string[],
    expirationDays?: number | null
  ) {
    // 설문 존재 확인
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      select: { id: true, environmentId: true },
    });

    if (!survey) {
      throw new ResourceNotFoundException('Survey', surveyId);
    }

    // 연락처 존재 확인 (같은 환경에 속하는지 검증)
    const contacts = await this.prisma.contact.findMany({
      where: {
        id: { in: contactIds },
        environmentId: survey.environmentId,
      },
      select: { id: true },
    });

    const existingIds = new Set(contacts.map((c) => c.id));
    const invalidIds = contactIds.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `존재하지 않는 연락처 ID: ${invalidIds.join(', ')}`
      );
    }

    const expiresAt = expirationDays
      ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
      : null;

    const links = [];

    for (const contactId of contactIds) {
      // 기존 링크가 있으면 만료일만 갱신, 없으면 새로 생성
      const existing = await this.prisma.personalizedLink.findFirst({
        where: { contactId, surveyId },
      });

      if (existing) {
        const updated = await this.prisma.personalizedLink.update({
          where: { id: existing.id },
          data: { expiresAt },
        });
        links.push(updated);
      } else {
        const token = this.generateToken(contactId, surveyId);
        const created = await this.prisma.personalizedLink.create({
          data: {
            contactId,
            surveyId,
            token,
            expiresAt,
          },
        });
        links.push(created);
      }
    }

    this.logger.log(
      `개인화 링크 ${links.length}건 생성 완료 (surveyId: ${surveyId})`
    );

    return { data: links };
  }

  /**
   * 토큰으로 개인화 링크를 조회하고 유효성을 검증한다.
   * @param token - 검증할 토큰 문자열
   * @throws ResourceNotFoundException - 토큰에 해당하는 링크가 없을 때
   * @throws BadRequestException - 링크가 만료되었을 때
   */
  async validateToken(token: string) {
    const link = await this.prisma.personalizedLink.findUnique({
      where: { token },
      include: {
        contact: true,
        survey: { select: { id: true, status: true } },
      },
    });

    if (!link) {
      throw new ResourceNotFoundException('PersonalizedLink', token);
    }

    // 만료 확인
    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new BadRequestException('이 링크는 만료되었습니다.');
    }

    return link;
  }

  /**
   * HMAC-SHA256 기반 토큰을 생성한다.
   * payload = contactId:surveyId:timestamp(base36):random(hex)
   * 토큰 = base64url(payload) + '.' + hmac 앞 16자
   * @param contactId - 연락처 ID
   * @param surveyId - 설문 ID
   */
  private generateToken(contactId: string, surveyId: string): string {
    const secret = this.configService.get<string>(
      'PERSONALIZED_LINK_SECRET',
      'default-secret-change-me'
    );
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    const payload = `${contactId}:${surveyId}:${timestamp}:${random}`;

    const hmac = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // 토큰 = payload base64url + hmac 앞 16자 (~100자)
    const encodedPayload = Buffer.from(payload).toString('base64url');
    return `${encodedPayload}.${hmac.slice(0, 16)}`;
  }
}
