/**
 * 필터 연결자: AND 또는 OR.
 * 같은 레벨의 필터들을 어떻게 결합할지 결정한다.
 */
export type FilterConnector = 'and' | 'or';

/**
 * 필터 리소스 유형.
 * - attribute: 연락처 속성(EAV) 기반 필터
 * - person: 연락처 행동/활동 기반 필터
 * - segment: 다른 세그먼트 포함/제외
 * - device: 디바이스 유형 기반 필터
 */
export type FilterResource = 'attribute' | 'person' | 'segment' | 'device';

/**
 * 필터 데이터 유형.
 * attribute 필터의 값 타입을 지정한다.
 */
export type FilterType = 'string' | 'number' | 'date';

/** 디바이스 유형 */
export type DeviceType = 'desktop' | 'phone' | 'tablet';

/** 시간 단위 (날짜 연산용) */
export type TimeUnit = 'day' | 'week' | 'month' | 'year';

/**
 * 필터 연산자 22종.
 * 데이터 타입에 따라 사용 가능한 연산자가 다르다.
 */
export type FilterOperator =
  // 문자열 연산자
  | 'equals'
  | 'doesNotEqual'
  | 'contains'
  | 'doesNotContain'
  | 'startsWith'
  | 'endsWith'
  | 'isSet'
  | 'isNotSet'
  // 숫자 연산자
  | 'lessThan'
  | 'lessEqual'
  | 'greaterThan'
  | 'greaterEqual'
  // 날짜 연산자
  | 'isBefore'
  | 'isAfter'
  | 'isExactly'
  | 'isWithinLast'
  | 'isNotWithinLast'
  | 'isToday'
  | 'isYesterday'
  // 세그먼트 연산자
  | 'userIsIn'
  | 'userIsNotIn'
  // 디바이스 연산자
  | 'isDevice';

/**
 * 개별 필터 항목.
 * 리프 노드이거나 그룹(중첩 필터)일 수 있다.
 */
export interface FilterItem {
  /** 고유 식별자 (클라이언트에서 생성, cuid 등) */
  id: string;
  /** 필터 연결자 (같은 레벨에서 다음 필터와의 관계) */
  connector: FilterConnector;
  /** 필터 리소스 유형 */
  resource: FilterResource;
  /** 필터 연산자 */
  operator?: FilterOperator;
  /** 필터 값 (단일 값 또는 듀얼 값 - isWithinLast 등) */
  value?: string | number;
  /** 시간 단위 (날짜 범위 연산자용) */
  timeUnit?: TimeUnit;
  /** 속성 키 (attribute 리소스일 때) */
  attributeKey?: string;
  /** 데이터 타입 (attribute 리소스일 때) */
  filterType?: FilterType;
  /** 대상 세그먼트 ID (segment 리소스일 때) */
  segmentId?: string;
  /** 디바이스 유형 (device 리소스일 때) */
  deviceType?: DeviceType;
  /** 중첩 필터 그룹 (재귀 구조) */
  children?: FilterItem[];
}
