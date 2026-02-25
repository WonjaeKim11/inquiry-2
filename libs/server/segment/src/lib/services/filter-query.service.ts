import { Injectable } from '@nestjs/common';
import type { FilterItem } from '@inquiry/shared-segment';
import { VALUE_LESS_OPERATORS } from '@inquiry/shared-segment';
import {
  subtractTimeUnit,
  startOfDay,
  endOfDay,
} from '@inquiry/shared-segment';

/**
 * 필터 트리를 Prisma Contact where 절로 변환하는 서비스.
 * ContactAttributeValue (EAV) 모델 기반 쿼리를 생성한다.
 */
@Injectable()
export class FilterQueryService {
  /**
   * 필터 트리를 Prisma where 절로 변환한다.
   * @param filters - 필터 트리
   * @returns Prisma where 객체
   */
  buildWhereClause(filters: FilterItem[]): Record<string, unknown> {
    if (!filters || filters.length === 0) return {};

    const conditions = filters.map((filter) => this.buildCondition(filter));

    if (conditions.length === 1) return conditions[0];

    // 첫 번째 필터의 connector는 무시하고, 두 번째부터의 connector로 결합
    // 동일 레벨에서는 같은 connector를 사용한다고 가정
    const connector = filters.length > 1 ? filters[1].connector : 'and';

    return connector === 'and' ? { AND: conditions } : { OR: conditions };
  }

  /**
   * 단일 필터 조건을 Prisma where 절로 변환한다.
   * 그룹이면 재귀적으로 처리하고, 리프이면 리소스별 조건을 생성한다.
   */
  private buildCondition(filter: FilterItem): Record<string, unknown> {
    if (filter.children && filter.children.length > 0) {
      return this.buildWhereClause(filter.children);
    }

    if (!filter.operator) return {};

    switch (filter.resource) {
      case 'attribute':
        return this.buildAttributeCondition(filter);
      case 'segment':
        return this.buildSegmentCondition(filter);
      case 'device':
        return this.buildDeviceCondition(filter);
      default:
        return {};
    }
  }

  /**
   * 속성 기반 필터를 EAV 쿼리로 변환한다.
   * Contact -> ContactAttributeValue -> ContactAttributeKey 조인 구조.
   */
  private buildAttributeCondition(filter: FilterItem): Record<string, unknown> {
    const { operator, attributeKey, filterType, value, timeUnit } = filter;
    if (!operator || !attributeKey) return {};

    // isSet / isNotSet은 특별 처리
    if (operator === 'isSet') {
      return {
        attributeValues: {
          some: {
            contactAttributeKey: { key: attributeKey },
            value: { not: '' },
          },
        },
      };
    }

    if (operator === 'isNotSet') {
      return {
        NOT: {
          attributeValues: {
            some: {
              contactAttributeKey: { key: attributeKey },
              value: { not: '' },
            },
          },
        },
      };
    }

    switch (filterType) {
      case 'string':
        return this.buildStringQuery(
          attributeKey,
          operator,
          String(value ?? '')
        );
      case 'number':
        return this.buildNumberQuery(
          attributeKey,
          operator,
          Number(value ?? 0)
        );
      case 'date':
        return this.buildDateQuery(attributeKey, operator, value, timeUnit);
      default:
        return this.buildStringQuery(
          attributeKey,
          operator,
          String(value ?? '')
        );
    }
  }

  /**
   * 문자열 타입 속성에 대한 Prisma where 절을 생성한다.
   * 대소문자 구분 없이 비교한다.
   */
  private buildStringQuery(
    attributeKey: string,
    operator: string,
    value: string
  ): Record<string, unknown> {
    const baseWhere = { contactAttributeKey: { key: attributeKey } };

    switch (operator) {
      case 'equals':
        return {
          attributeValues: {
            some: {
              ...baseWhere,
              value: { equals: value, mode: 'insensitive' },
            },
          },
        };
      case 'doesNotEqual':
        return {
          NOT: {
            attributeValues: {
              some: {
                ...baseWhere,
                value: { equals: value, mode: 'insensitive' },
              },
            },
          },
        };
      case 'contains':
        return {
          attributeValues: {
            some: {
              ...baseWhere,
              value: { contains: value, mode: 'insensitive' },
            },
          },
        };
      case 'doesNotContain':
        return {
          NOT: {
            attributeValues: {
              some: {
                ...baseWhere,
                value: { contains: value, mode: 'insensitive' },
              },
            },
          },
        };
      case 'startsWith':
        return {
          attributeValues: {
            some: {
              ...baseWhere,
              value: { startsWith: value, mode: 'insensitive' },
            },
          },
        };
      case 'endsWith':
        return {
          attributeValues: {
            some: {
              ...baseWhere,
              value: { endsWith: value, mode: 'insensitive' },
            },
          },
        };
      default:
        return {};
    }
  }

  /**
   * 숫자 타입 속성에 대한 Prisma where 절을 생성한다.
   * numberValue 필드를 대상으로 비교 연산을 수행한다.
   */
  private buildNumberQuery(
    attributeKey: string,
    operator: string,
    value: number
  ): Record<string, unknown> {
    const baseWhere = { contactAttributeKey: { key: attributeKey } };

    switch (operator) {
      case 'equals':
        return {
          attributeValues: {
            some: { ...baseWhere, numberValue: { equals: value } },
          },
        };
      case 'doesNotEqual':
        return {
          NOT: {
            attributeValues: {
              some: { ...baseWhere, numberValue: { equals: value } },
            },
          },
        };
      case 'lessThan':
        return {
          attributeValues: {
            some: { ...baseWhere, numberValue: { lt: value } },
          },
        };
      case 'lessEqual':
        return {
          attributeValues: {
            some: { ...baseWhere, numberValue: { lte: value } },
          },
        };
      case 'greaterThan':
        return {
          attributeValues: {
            some: { ...baseWhere, numberValue: { gt: value } },
          },
        };
      case 'greaterEqual':
        return {
          attributeValues: {
            some: { ...baseWhere, numberValue: { gte: value } },
          },
        };
      default:
        return {};
    }
  }

  /**
   * 날짜 타입 속성에 대한 Prisma where 절을 생성한다.
   * dateValue 필드를 대상으로 범위/비교 연산을 수행한다.
   */
  private buildDateQuery(
    attributeKey: string,
    operator: string,
    value: string | number | undefined,
    timeUnit?: string
  ): Record<string, unknown> {
    const baseWhere = { contactAttributeKey: { key: attributeKey } };
    const now = new Date();

    switch (operator) {
      case 'isBefore':
        return {
          attributeValues: {
            some: { ...baseWhere, dateValue: { lt: new Date(String(value)) } },
          },
        };
      case 'isAfter':
        return {
          attributeValues: {
            some: { ...baseWhere, dateValue: { gt: new Date(String(value)) } },
          },
        };
      case 'isExactly': {
        const target = new Date(String(value));
        return {
          attributeValues: {
            some: {
              ...baseWhere,
              dateValue: {
                gte: startOfDay(target),
                lte: endOfDay(target),
              },
            },
          },
        };
      }
      case 'isToday':
        return {
          attributeValues: {
            some: {
              ...baseWhere,
              dateValue: {
                gte: startOfDay(now),
                lte: endOfDay(now),
              },
            },
          },
        };
      case 'isYesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          attributeValues: {
            some: {
              ...baseWhere,
              dateValue: {
                gte: startOfDay(yesterday),
                lte: endOfDay(yesterday),
              },
            },
          },
        };
      }
      case 'isWithinLast': {
        const amount = Number(value ?? 1);
        const unit = (timeUnit as 'day' | 'week' | 'month' | 'year') || 'day';
        const threshold = startOfDay(subtractTimeUnit(now, amount, unit));
        return {
          attributeValues: {
            some: {
              ...baseWhere,
              dateValue: {
                gte: threshold,
                lte: endOfDay(now),
              },
            },
          },
        };
      }
      case 'isNotWithinLast': {
        const amount = Number(value ?? 1);
        const unit = (timeUnit as 'day' | 'week' | 'month' | 'year') || 'day';
        const threshold = startOfDay(subtractTimeUnit(now, amount, unit));
        return {
          attributeValues: {
            some: {
              ...baseWhere,
              dateValue: { lt: threshold },
            },
          },
        };
      }
      default:
        return {};
    }
  }

  /**
   * 세그먼트 조건을 생성한다.
   * 세그먼트 포함/제외는 서비스 레이어에서 별도 처리한다.
   */
  private buildSegmentCondition(_filter: FilterItem): Record<string, unknown> {
    // 세그먼트 조건은 서비스 레이어에서 별도 처리
    return {};
  }

  /**
   * 디바이스 조건을 EAV 쿼리로 변환한다.
   * device 속성 키를 기반으로 디바이스 유형을 비교한다.
   */
  private buildDeviceCondition(filter: FilterItem): Record<string, unknown> {
    if (!filter.deviceType) return {};

    return {
      attributeValues: {
        some: {
          contactAttributeKey: { key: 'device' },
          value: { equals: filter.deviceType, mode: 'insensitive' },
        },
      },
    };
  }
}
