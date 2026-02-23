import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * 이메일 발송 서비스.
 * SMTP 환경변수가 미설정되면 no-op으로 동작하여 개발 환경에서 에러 없이 사용 가능.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private emailFrom: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    this.emailFrom = this.configService.get<string>('EMAIL_FROM') || null;

    if (!host || !user || !pass) {
      this.logger.warn('SMTP 설정이 없습니다. 이메일 발송이 비활성화됩니다.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    this.logger.log(`이메일 서비스 초기화 완료 (${host}:${port})`);
  }

  /** SMTP가 설정되어 있는지 확인 */
  get isEnabled(): boolean {
    return this.transporter !== null;
  }

  /**
   * 이메일 검증 메일 발송.
   * @param locale - 사용자 언어 (향후 다국어 이메일 템플릿에 사용)
   */
  async sendVerificationEmail(
    to: string,
    name: string,
    token: string,
    locale?: string
  ): Promise<void> {
    const clientUrl = this.configService.get<string>(
      'CLIENT_URL',
      'http://localhost:4200'
    );
    const verifyUrl = `${clientUrl}/auth/verify-email?token=${token}`;

    await this.send({
      to,
      subject: '이메일 주소를 확인해주세요',
      html: `
        <h2>안녕하세요, ${name}님!</h2>
        <p>아래 링크를 클릭하여 이메일 주소를 확인해주세요:</p>
        <p><a href="${verifyUrl}" style="padding: 12px 24px; background: #0070f3; color: white; text-decoration: none; border-radius: 4px;">이메일 확인하기</a></p>
        <p>이 링크는 24시간 후 만료됩니다.</p>
        <p>본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
      `,
    });
  }

  /**
   * 비밀번호 재설정 메일 발송.
   * @param locale - 사용자 언어 (향후 다국어 이메일 템플릿에 사용)
   */
  async sendPasswordResetEmail(
    to: string,
    name: string,
    token: string,
    locale?: string
  ): Promise<void> {
    const clientUrl = this.configService.get<string>(
      'CLIENT_URL',
      'http://localhost:4200'
    );
    const resetUrl = `${clientUrl}/auth/reset-password?token=${token}`;

    await this.send({
      to,
      subject: '비밀번호 재설정 요청',
      html: `
        <h2>안녕하세요, ${name}님!</h2>
        <p>비밀번호 재설정이 요청되었습니다. 아래 링크를 클릭하여 비밀번호를 변경해주세요:</p>
        <p><a href="${resetUrl}" style="padding: 12px 24px; background: #0070f3; color: white; text-decoration: none; border-radius: 4px;">비밀번호 재설정</a></p>
        <p>이 링크는 1시간 후 만료됩니다.</p>
        <p>본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
      `,
    });
  }

  /**
   * 비밀번호 변경 완료 알림 메일 발송.
   * @param locale - 사용자 언어 (향후 다국어 이메일 템플릿에 사용)
   */
  async sendPasswordChangedNotification(
    to: string,
    name: string,
    locale?: string
  ): Promise<void> {
    await this.send({
      to,
      subject: '비밀번호가 변경되었습니다',
      html: `
        <h2>안녕하세요, ${name}님!</h2>
        <p>비밀번호가 성공적으로 변경되었습니다.</p>
        <p>본인이 변경하지 않았다면 즉시 비밀번호를 재설정하거나 관리자에게 문의해주세요.</p>
      `,
    });
  }

  /** 공통 이메일 발송 메서드. SMTP 미설정 시 로그만 남기고 반환 */
  private async send(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.transporter || !this.emailFrom) {
      this.logger.debug(
        `[No-op] 이메일 발송 스킵: ${options.to} — ${options.subject}`
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.emailFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`이메일 발송 완료: ${options.to} — ${options.subject}`);
    } catch (error) {
      this.logger.error(
        `이메일 발송 실패: ${options.to} — ${options.subject}`,
        error
      );
    }
  }
}
