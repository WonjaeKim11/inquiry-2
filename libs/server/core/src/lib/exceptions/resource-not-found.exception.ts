import { ApiErrorException } from './api-error.exception';

/**
 * 리소스를 찾을 수 없는 경우의 예외 (HTTP 404).
 * 요청한 리소스(엔티티)가 존재하지 않을 때 사용한다.
 */
export class ResourceNotFoundException extends ApiErrorException {
  constructor(
    /** 리소스 유형 (예: 'Survey', 'Organization') */
    resource: string,
    /** 리소스 식별자 (선택) */
    id?: string
  ) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super('ResourceNotFoundError', message, 404);
  }
}
