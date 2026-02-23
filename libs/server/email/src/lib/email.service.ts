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

  /**
   * 초대 이메일 발송.
   * JWT 초대 토큰이 포함된 수락 링크를 제공한다.
   *
   * @param to - 초대 대상 이메일
   * @param name - 초대 대상자 이름 (없으면 이메일 사용)
   * @param token - JWT 초대 토큰
   * @param organizationName - 초대하는 조직 이름
   */
  async sendInviteEmail(
    to: string,
    name: string | undefined,
    token: string,
    organizationName: string
  ): Promise<void> {
    const clientUrl = this.configService.get<string>(
      'CLIENT_URL',
      'http://localhost:4200'
    );
    const acceptUrl = `${clientUrl}/invite/accept?token=${encodeURIComponent(
      token
    )}`;
    const displayName = name || to;

    await this.send({
      to,
      subject: `${organizationName}에 초대되었습니다`,
      html: `
        <h2>안녕하세요, ${displayName}님!</h2>
        <p><strong>${organizationName}</strong> 조직에 멤버로 초대되었습니다.</p>
        <p>아래 버튼을 클릭하여 초대를 수락해주세요:</p>
        <p><a href="${acceptUrl}" style="padding: 12px 24px; background: #0070f3; color: white; text-decoration: none; border-radius: 4px;">초대 수락하기</a></p>
        <p>이 초대 링크는 7일 후 만료됩니다.</p>
        <p>본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
      `,
    });
  }

  /**
   * 초대 수락 알림 이메일 발송.
   * 초대 생성자에게 대상자가 초대를 수락했음을 알린다.
   *
   * @param to - 초대 생성자 이메일
   * @param creatorName - 초대 생성자 이름
   * @param acceptorEmail - 수락한 사용자 이메일
   * @param organizationName - 조직 이름
   */
  async sendInviteAcceptedNotification(
    to: string,
    creatorName: string,
    acceptorEmail: string,
    organizationName: string
  ): Promise<void> {
    await this.send({
      to,
      subject: `${acceptorEmail}님이 초대를 수락했습니다`,
      html: `
        <h2>안녕하세요, ${creatorName}님!</h2>
        <p><strong>${acceptorEmail}</strong>님이 <strong>${organizationName}</strong> 조직 초대를 수락했습니다.</p>
        <p>이제 해당 사용자가 조직의 멤버로 활동할 수 있습니다.</p>
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
