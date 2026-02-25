import { Injectable } from '@nestjs/common';

/**
 * 속성 값의 데이터 타입을 탐지하는 서비스.
 * CSV와 SDK에서 서로 다른 탐지 규칙을 적용한다.
 */
@Injectable()
export class TypeDetectorService {
  /**
   * 단일 값의 데이터 타입을 탐지한다.
   * @param value - 탐지 대상 값
   * @param mode - 'csv' | 'sdk'
   *   - csv: 문자열 "42" -> NUMBER, ISO날짜/DD-MM-YYYY -> DATE
   *   - sdk: typeof 기반. "42"(string) -> STRING, 42(number) -> NUMBER
   */
  detectType(
    value: unknown,
    mode: 'csv' | 'sdk'
  ): 'STRING' | 'NUMBER' | 'DATE' {
    if (value === null || value === undefined || value === '') {
      return 'STRING';
    }

    if (mode === 'sdk') {
      return this.detectSdkType(value);
    }

    return this.detectCsvType(value);
  }

  /**
   * CSV 값의 타입 탐지.
   * 문자열을 파싱하여 숫자/날짜 여부를 판별한다.
   */
  private detectCsvType(value: unknown): 'STRING' | 'NUMBER' | 'DATE' {
    const str = String(value).trim();
    if (str === '') return 'STRING';

    // 숫자 탐지: 정수/실수 ("+", "-" 포함, 공백 불허)
    if (/^[+-]?\d+(\.\d+)?$/.test(str) && !isNaN(Number(str))) {
      return 'NUMBER';
    }

    // 날짜 탐지: ISO 8601, YYYY-MM-DD, DD-MM-YYYY, MM-DD-YYYY
    if (this.isDateString(str)) {
      return 'DATE';
    }

    return 'STRING';
  }

  /**
   * SDK 값의 타입 탐지.
   * JavaScript typeof 기반으로 판별한다.
   */
  private detectSdkType(value: unknown): 'STRING' | 'NUMBER' | 'DATE' {
    if (typeof value === 'number' && !isNaN(value)) {
      return 'NUMBER';
    }

    if (value instanceof Date) {
      return 'DATE';
    }

    // ISO 8601 문자열만 DATE로 인식
    if (typeof value === 'string' && this.isIso8601(value)) {
      return 'DATE';
    }

    return 'STRING';
  }

  /**
   * 문자열이 날짜 형식인지 확인한다.
   * ISO 8601, YYYY-MM-DD 지원.
   */
  private isDateString(str: string): boolean {
    // ISO 8601: 2026-02-25T00:00:00Z, 2026-02-25T00:00:00.000Z
    if (this.isIso8601(str)) return true;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const date = new Date(str);
      return !isNaN(date.getTime());
    }

    return false;
  }

  /** ISO 8601 형식 확인 */
  private isIso8601(str: string): boolean {
    // 엄격한 ISO 8601: YYYY-MM-DDTHH:mm:ss.sssZ 또는 변형
    const iso8601Regex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})$/;
    if (!iso8601Regex.test(str)) return false;
    const date = new Date(str);
    return !isNaN(date.getTime());
  }

  /**
   * 컬럼의 전체 값들로부터 최종 데이터 타입을 결정한다.
   * 값이 혼재되면 STRING으로 downgrade한다.
   */
  determineColumnType(
    values: unknown[],
    mode: 'csv' | 'sdk'
  ): 'STRING' | 'NUMBER' | 'DATE' {
    const nonEmpty = values.filter(
      (v) => v !== null && v !== undefined && String(v).trim() !== ''
    );

    if (nonEmpty.length === 0) return 'STRING';

    const types = new Set(nonEmpty.map((v) => this.detectType(v, mode)));

    // 단일 타입이면 그대로 반환
    if (types.size === 1) {
      return types.values().next().value!;
    }

    // 혼재 -> STRING
    return 'STRING';
  }
}
