import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Brevo (구 Sendinblue) 마케팅 연동 서비스.
 * BREVO_API_KEY 환경변수 미설정 시 no-op으로 동작한다.
 * fire-and-forget 방식으로 비즈니스 로직을 차단하지 않는다.
 */
@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly apiKey: string | null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY') || null;

    if (!this.apiKey) {
      this.logger.warn(
        'BREVO_API_KEY가 설정되지 않았습니다. Brevo 연동이 비활성화됩니다.'
      );
    }
  }

  get isEnabled(): boolean {
    return this.apiKey !== null;
  }

  /**
   * Brevo에 고객(Contact)을 생성한다.
   * fire-and-forget: 실패해도 비즈니스 로직에 영향 없음.
   */
  createContact(email: string, name: string): void {
    if (!this.apiKey) return;

    fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        attributes: { FIRSTNAME: name },
        updateEnabled: true,
      }),
    }).catch((error) => {
      this.logger.error(`Brevo 고객 생성 실패: ${email}`, error);
    });
  }
}
