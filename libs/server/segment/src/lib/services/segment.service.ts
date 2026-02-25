import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import { FilterTreeValidator } from '../validators/filter-tree.validator.js';
import type { FilterItem } from '@inquiry/shared-segment';
import type { CreateSegmentDto } from '../dto/create-segment.dto.js';
import type { UpdateSegmentDto } from '../dto/update-segment.dto.js';
import type { SegmentWithSurveyCount } from '../interfaces/segment.types.js';

/**
 * 세그먼트 CRUD + 복제 + 필터 초기화 서비스.
 * 필터 트리 유효성 검증과 순환참조 탐지를 포함한다.
 */
@Injectable()
export class SegmentService {
  private readonly logger = new Logger(SegmentService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly filterTreeValidator: FilterTreeValidator
  ) {}

  /**
   * 환경별 세그먼트 목록을 조회한다.
   * 연결된 설문 수를 포함한다.
   * @param environmentId - 환경 ID
   * @returns 세그먼트 목록 (설문 수 포함)
   */
  async findAll(environmentId: string): Promise<SegmentWithSurveyCount[]> {
    return this.prisma.segment.findMany({
      where: { environmentId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { surveys: true } },
      },
    }) as Promise<SegmentWithSurveyCount[]>;
  }

  /**
   * 세그먼트 단건을 조회한다.
   * @param segmentId - 세그먼트 ID
   * @returns 세그먼트 (설문 수 포함)
   * @throws NotFoundException 세그먼트를 찾을 수 없는 경우
   */
  async findById(segmentId: string): Promise<SegmentWithSurveyCount> {
    const segment = await this.prisma.segment.findUnique({
      where: { id: segmentId },
      include: {
        _count: { select: { surveys: true } },
      },
    });

    if (!segment) {
      throw new NotFoundException('세그먼트를 찾을 수 없습니다.');
    }

    return segment as SegmentWithSurveyCount;
  }

  /**
   * 새 세그먼트를 생성한다.
   * 필터 트리 유효성을 검증하고 순환참조를 탐지한다.
   * @param dto - 생성 요청 데이터
   * @param userId - 생성자 사용자 ID
   * @param ipAddress - 클라이언트 IP
   * @returns 생성된 세그먼트
   */
  async create(
    dto: CreateSegmentDto,
    userId: string,
    ipAddress?: string
  ): Promise<SegmentWithSurveyCount> {
    // 필터 검증
    if (dto.filters && dto.filters.length > 0) {
      this.filterTreeValidator.validate(dto.filters);
      await this.detectCircularReference(
        dto.environmentId,
        null,
        dto.filters as FilterItem[]
      );
    }

    // 제목 중복 확인
    const existing = await this.prisma.segment.findUnique({
      where: {
        environmentId_title: {
          environmentId: dto.environmentId,
          title: dto.title,
        },
      },
    });

    if (existing) {
      throw new ConflictException('같은 제목의 세그먼트가 이미 존재합니다.');
    }

    const segment = await this.prisma.segment.create({
      data: {
        title: dto.title,
        description: dto.description,
        isPrivate: dto.isPrivate ?? true,
        filters: (dto.filters ?? []) as unknown[],
        environmentId: dto.environmentId,
      },
      include: {
        _count: { select: { surveys: true } },
      },
    });

    this.auditLogService.logEvent({
      action: 'segment.created',
      userId,
      targetType: 'segment',
      targetId: segment.id,
      ipAddress,
      metadata: { title: segment.title, environmentId: dto.environmentId },
    });

    this.logger.debug(`세그먼트 생성 완료: ${segment.id}`);

    return segment as SegmentWithSurveyCount;
  }

  /**
   * 세그먼트를 수정한다.
   * @param segmentId - 수정할 세그먼트 ID
   * @param dto - 수정 요청 데이터
   * @param userId - 수정자 사용자 ID
   * @param ipAddress - 클라이언트 IP
   * @returns 수정된 세그먼트
   */
  async update(
    segmentId: string,
    dto: UpdateSegmentDto,
    userId: string,
    ipAddress?: string
  ): Promise<SegmentWithSurveyCount> {
    const existing = await this.findById(segmentId);

    // 제목 변경 시 중복 확인
    if (dto.title && dto.title !== existing.title) {
      const duplicate = await this.prisma.segment.findUnique({
        where: {
          environmentId_title: {
            environmentId: existing.environmentId,
            title: dto.title,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException('같은 제목의 세그먼트가 이미 존재합니다.');
      }
    }

    // 필터 변경 시 검증
    if (dto.filters) {
      this.filterTreeValidator.validate(dto.filters);
      await this.detectCircularReference(
        existing.environmentId,
        segmentId,
        dto.filters as FilterItem[]
      );
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData['title'] = dto.title;
    if (dto.description !== undefined)
      updateData['description'] = dto.description;
    if (dto.isPrivate !== undefined) updateData['isPrivate'] = dto.isPrivate;
    if (dto.filters !== undefined) updateData['filters'] = dto.filters;

    const updated = await this.prisma.segment.update({
      where: { id: segmentId },
      data: updateData,
      include: {
        _count: { select: { surveys: true } },
      },
    });

    this.auditLogService.logEvent({
      action: 'segment.updated',
      userId,
      targetType: 'segment',
      targetId: segmentId,
      ipAddress,
      metadata: { updatedFields: Object.keys(updateData) },
    });

    this.logger.debug(`세그먼트 수정 완료: ${segmentId}`);

    return updated as SegmentWithSurveyCount;
  }

  /**
   * 세그먼트를 삭제한다.
   * 연결된 설문이 있으면 삭제를 차단한다.
   * @param segmentId - 삭제할 세그먼트 ID
   * @param userId - 삭제자 사용자 ID
   * @param ipAddress - 클라이언트 IP
   * @returns 삭제된 세그먼트 ID
   */
  async delete(
    segmentId: string,
    userId: string,
    ipAddress?: string
  ): Promise<{ id: string }> {
    const segment = await this.findById(segmentId);

    if (segment._count.surveys > 0) {
      throw new BadRequestException(
        `이 세그먼트에 연결된 설문이 ${segment._count.surveys}개 있습니다. 먼저 설문에서 세그먼트를 해제하세요.`
      );
    }

    await this.prisma.segment.delete({ where: { id: segmentId } });

    this.auditLogService.logEvent({
      action: 'segment.deleted',
      userId,
      targetType: 'segment',
      targetId: segmentId,
      ipAddress,
      metadata: { title: segment.title },
    });

    this.logger.debug(`세그먼트 삭제 완료: ${segmentId}`);

    return { id: segmentId };
  }

  /**
   * 세그먼트를 복제한다.
   * 제목에 "Copy of {title}" 또는 "Copy of {title} (n)" 형식을 사용한다.
   * @param segmentId - 복제할 세그먼트 ID
   * @param userId - 복제자 사용자 ID
   * @param ipAddress - 클라이언트 IP
   * @returns 복제된 세그먼트
   */
  async clone(
    segmentId: string,
    userId: string,
    ipAddress?: string
  ): Promise<SegmentWithSurveyCount> {
    const original = await this.findById(segmentId);

    // 복제 제목 생성
    const cloneTitle = await this.generateCloneTitle(
      original.environmentId,
      original.title
    );

    const cloned = await this.prisma.segment.create({
      data: {
        title: cloneTitle,
        description: original.description,
        isPrivate: original.isPrivate,
        filters: original.filters as unknown[],
        environmentId: original.environmentId,
      },
      include: {
        _count: { select: { surveys: true } },
      },
    });

    this.auditLogService.logEvent({
      action: 'segment.cloned',
      userId,
      targetType: 'segment',
      targetId: cloned.id,
      ipAddress,
      metadata: { originalId: segmentId, title: cloneTitle },
    });

    this.logger.debug(`세그먼트 복제 완료: ${segmentId} -> ${cloned.id}`);

    return cloned as SegmentWithSurveyCount;
  }

  /**
   * 세그먼트의 필터를 초기화한다 (빈 배열로 리셋).
   * @param segmentId - 초기화할 세그먼트 ID
   * @param userId - 초기화 수행자 사용자 ID
   * @param ipAddress - 클라이언트 IP
   * @returns 초기화된 세그먼트
   */
  async reset(
    segmentId: string,
    userId: string,
    ipAddress?: string
  ): Promise<SegmentWithSurveyCount> {
    await this.findById(segmentId);

    const updated = await this.prisma.segment.update({
      where: { id: segmentId },
      data: { filters: [] },
      include: {
        _count: { select: { surveys: true } },
      },
    });

    this.auditLogService.logEvent({
      action: 'segment.reset',
      userId,
      targetType: 'segment',
      targetId: segmentId,
      ipAddress,
    });

    this.logger.debug(`세그먼트 필터 초기화: ${segmentId}`);

    return updated as SegmentWithSurveyCount;
  }

  /**
   * 복제 제목을 생성한다.
   * "Copy of {title}", "Copy of {title} (2)", "Copy of {title} (3)" ...
   * @param environmentId - 환경 ID
   * @param originalTitle - 원본 제목
   * @returns 중복되지 않는 복제 제목
   */
  private async generateCloneTitle(
    environmentId: string,
    originalTitle: string
  ): Promise<string> {
    const baseTitle = `Copy of ${originalTitle}`;

    const existingSegments = await this.prisma.segment.findMany({
      where: {
        environmentId,
        title: { startsWith: baseTitle },
      },
      select: { title: true },
    });

    const existingTitles = new Set(existingSegments.map((s) => s.title));

    if (!existingTitles.has(baseTitle)) return baseTitle;

    let counter = 2;
    while (existingTitles.has(`${baseTitle} (${counter})`)) {
      counter++;
    }

    return `${baseTitle} (${counter})`;
  }

  /**
   * 필터 트리에서 순환참조를 DFS로 탐지한다.
   * segment 리소스를 가진 필터가 자기 자신이나 이미 방문한 세그먼트를 참조하면 에러.
   * @param environmentId - 환경 ID
   * @param currentSegmentId - 현재 세그먼트 ID (신규 생성 시 null)
   * @param filters - 검증할 필터 트리
   * @param visited - 이미 방문한 세그먼트 ID 집합 (순환 탐지용)
   */
  private async detectCircularReference(
    environmentId: string,
    currentSegmentId: string | null,
    filters: FilterItem[],
    visited: Set<string> = new Set()
  ): Promise<void> {
    if (currentSegmentId) {
      visited.add(currentSegmentId);
    }

    for (const filter of filters) {
      if (filter.children) {
        await this.detectCircularReference(
          environmentId,
          currentSegmentId,
          filter.children,
          visited
        );
        continue;
      }

      if (filter.resource === 'segment' && filter.segmentId) {
        if (filter.segmentId === currentSegmentId) {
          throw new BadRequestException(
            '세그먼트가 자기 자신을 참조할 수 없습니다.'
          );
        }

        if (visited.has(filter.segmentId)) {
          throw new BadRequestException(
            '세그먼트 간 순환참조가 감지되었습니다.'
          );
        }

        // 참조된 세그먼트의 필터도 재귀 검사
        const referenced = await this.prisma.segment.findUnique({
          where: { id: filter.segmentId },
          select: { filters: true },
        });

        if (
          referenced &&
          Array.isArray(referenced.filters) &&
          (referenced.filters as unknown[]).length > 0
        ) {
          await this.detectCircularReference(
            environmentId,
            filter.segmentId,
            referenced.filters as unknown as FilterItem[],
            new Set(visited)
          );
        }
      }
    }
  }
}
