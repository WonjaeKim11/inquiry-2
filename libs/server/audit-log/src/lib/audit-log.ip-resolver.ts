/**
 * 클라이언트 IP 주소 추출 유틸리티.
 * Express Request 객체에서 프록시 헤더를 고려하여 실제 클라이언트 IP를 추출한다.
 */

import type { Request } from 'express';

/**
 * Express Request에서 클라이언트 IP를 추출.
 * X-Forwarded-For 헤더를 우선 확인하고, 없으면 socket 정보를 사용한다.
 * 리버스 프록시(Nginx, CloudFlare 등) 뒤에서도 정확한 IP를 반환한다.
 * @param request - Express Request 객체
 * @returns 추출된 클라이언트 IP 주소 (알 수 없으면 'unknown')
 */
export function resolveIp(request: Request): string {
  // X-Forwarded-For: 프록시 체인의 첫 번째 IP가 원본 클라이언트
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }
  // 직접 연결: request.ip 또는 소켓 주소 사용
  return request.ip || request.socket?.remoteAddress || 'unknown';
}
