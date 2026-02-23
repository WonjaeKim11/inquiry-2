/**
 * PII(개인식별정보) Redaction 유틸리티.
 * 감사 로그에 저장되는 민감 정보를 마스킹 처리한다.
 */

import { AUDIT_CONSTANTS } from './audit-log.types';

/**
 * 이메일 마스킹 처리.
 * @param email - 원본 이메일 주소
 * @returns 마스킹된 이메일 (예: abc@example.com → a***@e***.com)
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const [domainName, tld] = domain.split('.');
  return `${local[0]}***@${domainName[0]}***.${tld}`;
}

/**
 * IP 주소 마스킹 처리.
 * IPv4는 마지막 두 옥텟을, IPv6는 뒷부분을 마스킹한다.
 * @param ip - 원본 IP 주소
 * @returns 마스킹된 IP (예: 192.168.1.100 → 192.168.*.*)
 */
export function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  // IPv6 부분 마스킹: 앞 두 블록만 유지
  const ipv6Parts = ip.split(':');
  if (ipv6Parts.length > 2) {
    return `${ipv6Parts[0]}:${ipv6Parts[1]}:***`;
  }
  return '***';
}

/**
 * Record 내 PII 필드를 재귀적으로 마스킹.
 * AUDIT_CONSTANTS.PII_FIELDS에 정의된 필드명과 일치하는 키를 찾아
 * 값의 형태에 따라 적절한 마스킹을 적용한다.
 * @param data - 마스킹 대상 객체
 * @returns PII가 마스킹된 새 객체 (원본은 변경되지 않음)
 */
export function redactPii(
  data: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (AUDIT_CONSTANTS.PII_FIELDS.includes(key)) {
      // PII 필드 감지: 값 유형에 따라 적절한 마스킹 적용
      if (typeof value === 'string' && value.includes('@')) {
        result[key] = maskEmail(value);
      } else if (
        typeof value === 'string' &&
        (key === 'ip' || key === 'ipAddress')
      ) {
        result[key] = maskIp(value);
      } else {
        result[key] = '[REDACTED]';
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // 중첩 객체는 재귀적으로 처리
      result[key] = redactPii(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
