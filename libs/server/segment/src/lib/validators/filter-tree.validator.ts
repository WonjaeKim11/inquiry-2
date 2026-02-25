import { Injectable, BadRequestException } from '@nestjs/common';
import type { FilterItem } from '@inquiry/shared-segment';
import {
  getOperatorsForType,
  VALUE_LESS_OPERATORS,
} from '@inquiry/shared-segment';
import {
  MAX_FILTER_DEPTH,
  MAX_FILTERS_PER_SEGMENT,
} from '../constants/segment.constants.js';
import { getFilterDepth, countFilters } from '@inquiry/shared-segment';

/**
 * 필터 트리 구조 검증기.
 * 재귀적으로 필터 배열을 순회하며 구조적 유효성을 확인한다.
 * - 각 리프 노드의 타입-연산자 조합 검증
 * - 그룹 connector 일관성 확인
 * - 최대 깊이/필터 수 제한 검증
 */
@Injectable()
export class FilterTreeValidator {
  /**
   * 필터 트리의 유효성을 검증한다.
   * @param filters - 검증할 필터 배열
   * @throws BadRequestException - 유효하지 않은 필터 구조
   */
  validate(filters: unknown[]): void {
    const items = filters as FilterItem[];

    // 깊이 제한
    const depth = getFilterDepth(items);
    if (depth > MAX_FILTER_DEPTH) {
      throw new BadRequestException(
        `필터 중첩 깊이가 최대 ${MAX_FILTER_DEPTH}를 초과합니다.`
      );
    }

    // 총 필터 수 제한
    const count = countFilters(items);
    if (count > MAX_FILTERS_PER_SEGMENT) {
      throw new BadRequestException(
        `필터 수가 최대 ${MAX_FILTERS_PER_SEGMENT}개를 초과합니다.`
      );
    }

    // 각 항목 검증
    this.validateItems(items, 1);
  }

  /**
   * 필터 항목들을 재귀적으로 검증한다.
   * @param items - 필터 항목 배열
   * @param depth - 현재 깊이 (재귀 추적용)
   */
  private validateItems(items: FilterItem[], depth: number): void {
    for (const item of items) {
      if (!item.id) {
        throw new BadRequestException('모든 필터에는 id가 필요합니다.');
      }

      if (!item.connector || !['and', 'or'].includes(item.connector)) {
        throw new BadRequestException(
          `필터 '${item.id}'의 connector가 유효하지 않습니다.`
        );
      }

      if (item.children && item.children.length > 0) {
        // 그룹 노드: 재귀 검증
        this.validateItems(item.children, depth + 1);
      } else if (item.operator) {
        // 리프 노드: 타입-연산자 조합 검증
        this.validateLeaf(item);
      }
    }
  }

  /**
   * 리프 필터 노드의 리소스-연산자 조합을 검증한다.
   * @param item - 검증할 리프 필터
   */
  private validateLeaf(item: FilterItem): void {
    const { resource, operator, filterType } = item;

    if (!resource) {
      throw new BadRequestException(
        `필터 '${item.id}'에 resource가 필요합니다.`
      );
    }

    switch (resource) {
      case 'attribute': {
        if (!filterType) break; // 아직 설정되지 않은 경우 허용
        const validOps = getOperatorsForType(filterType);
        if (operator && !validOps.includes(operator)) {
          throw new BadRequestException(
            `필터 '${item.id}': '${filterType}' 타입에 '${operator}' 연산자는 사용할 수 없습니다.`
          );
        }
        // 값이 필요한 연산자인데 값이 없는 경우 (경고만, 프론트에서 주로 처리)
        if (
          operator &&
          !VALUE_LESS_OPERATORS.has(operator) &&
          item.value === undefined
        ) {
          // 값 검증은 프론트에서 처리하므로 서버에서는 경고만
        }
        break;
      }
      case 'segment': {
        if (operator && !['userIsIn', 'userIsNotIn'].includes(operator)) {
          throw new BadRequestException(
            `필터 '${item.id}': segment 리소스에 '${operator}' 연산자는 사용할 수 없습니다.`
          );
        }
        break;
      }
      case 'device': {
        if (operator && operator !== 'isDevice') {
          throw new BadRequestException(
            `필터 '${item.id}': device 리소스에 '${operator}' 연산자는 사용할 수 없습니다.`
          );
        }
        break;
      }
      case 'person':
        // person은 향후 확장
        break;
    }
  }
}
