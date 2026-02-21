import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Cloudflare Turnstile CAPTCHA 검증 서비스.
 * TURNSTILE_SECRET_KEY 환경변수 미설정 시 검증을 건너뛴다.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);
  private readonly secretKey: string | null;

  constructor(private readonly configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>('TURNSTILE_SECRET_KEY') || null;

    if (!this.secretKey) {
      this.logger.warn(
        'TURNSTILE_SECRET_KEY가 설정되지 않았습니다. CAPTCHA 검증이 비활성화됩니다.'
      );
    }
  }

  get isEnabled(): boolean {
    return this.secretKey !== null;
  }

  /**
   * Turnstile 토큰을 Cloudflare API로 검증한다.
   * 비활성 상태면 항상 통과 처리.
   */
  async verify(token: string | undefined): Promise<void> {
    if (!this.secretKey) return;
    if (!token) {
      throw new BadRequestException('CAPTCHA 인증이 필요합니다.');
    }

    try {
      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: this.secretKey,
            response: token,
          }),
        }
      );

      const data = (await response.json()) as { success: boolean };
      if (!data.success) {
        throw new BadRequestException('CAPTCHA 인증에 실패했습니다.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Turnstile 검증 중 오류 발생', error);
      // 외부 서비스 장애 시에는 통과 처리 (graceful degradation)
    }
  }
}
