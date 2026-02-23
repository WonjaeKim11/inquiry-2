import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { timingSafeEqual, randomBytes } from 'crypto';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { EncryptionService } from '@inquiry/server-crypto';
import { AuditLogService } from '@inquiry/server-audit-log';

/**
 * 2단계 인증(2FA) 서비스.
 * TOTP(Time-based One-Time Password) 기반 2FA와 Backup Code를 관리한다.
 *
 * - TOTP Secret: otplib의 authenticator로 생성/검증
 * - Backup Code: xxxx-xxxx 형식 10개 생성, timing-safe comparison으로 검증
 * - 암호화: EncryptionService(AES-256-GCM)로 Secret/Backup Codes 암호화 저장
 */
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  /** Backup Code 생성 개수 */
  private static readonly BACKUP_CODE_COUNT = 10;
  /** TOTP 앱 이름 (QR 코드에 표시) */
  private static readonly TOTP_ISSUER = 'Inquiry';

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly auditLogService: AuditLogService
  ) {
    // TOTP 설정: 30초 윈도우, delta -1 ~ 0 (현재 + 이전 1개)
    authenticator.options = {
      window: [1, 0],
    };
  }

  /**
   * TOTP Secret을 생성하고 QR 코드 URI를 반환한다.
   * @param email - 사용자 이메일 (QR 코드 라벨에 사용)
   * @returns secret과 QR 코드 URI
   */
  generateTotpSecret(email: string): { secret: string; qrCodeUri: string } {
    const secret = authenticator.generateSecret();
    const qrCodeUri = authenticator.keyuri(
      email,
      TwoFactorService.TOTP_ISSUER,
      secret
    );

    return { secret, qrCodeUri };
  }

  /**
   * TOTP 코드를 검증한다.
   * 암호화된 Secret을 복호화한 후 코드의 유효성을 확인한다.
   * @param encryptedSecret - 암호화된 TOTP Secret
   * @param code - 사용자가 입력한 6자리 TOTP 코드
   * @returns 검증 성공 여부
   */
  verifyTotpCode(encryptedSecret: string, code: string): boolean {
    try {
      const secret = this.encryptionService.decrypt(encryptedSecret);
      return authenticator.verify({ token: code, secret });
    } catch (error) {
      this.logger.error('TOTP 코드 검증 중 오류 발생', error);
      return false;
    }
  }

  /**
   * Backup Code 10개를 생성한다.
   * 형식: xxxx-xxxx (8자리 영숫자, 하이픈 구분)
   * @returns 생성된 Backup Code 배열
   */
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < TwoFactorService.BACKUP_CODE_COUNT; i++) {
      // 4바이트 랜덤 → 8자리 hex → xxxx-xxxx 형식
      const raw = randomBytes(4).toString('hex');
      const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
      codes.push(code);
    }
    return codes;
  }

  /**
   * Backup Code를 검증하고 사용된 코드를 소진 처리한다.
   * timing-safe comparison(crypto.timingSafeEqual)을 사용하여 타이밍 공격을 방지한다.
   * @param encryptedCodes - 암호화된 Backup Codes (JSON 배열)
   * @param code - 사용자가 입력한 Backup Code
   * @returns valid: 검증 결과, updatedEncryptedCodes: 사용된 코드 제거 후 재암호화된 코드 (null이면 변경 없음)
   */
  verifyBackupCode(
    encryptedCodes: string,
    code: string
  ): { valid: boolean; updatedEncryptedCodes: string | null } {
    try {
      const decrypted = this.encryptionService.decrypt(encryptedCodes);
      const codes: string[] = JSON.parse(decrypted);

      // 입력 코드를 정규화 (소문자, 공백 제거)
      const normalizedInput = code.toLowerCase().trim();
      let matchedIndex = -1;

      // 모든 코드에 대해 timing-safe comparison 수행
      // 조기 반환하지 않고 전체를 비교하여 타이밍 공격 방지
      for (let i = 0; i < codes.length; i++) {
        const storedCode = codes[i].toLowerCase();
        if (this.timingSafeCompare(normalizedInput, storedCode)) {
          matchedIndex = i;
        }
      }

      if (matchedIndex === -1) {
        return { valid: false, updatedEncryptedCodes: null };
      }

      // 사용된 코드 제거
      codes.splice(matchedIndex, 1);
      const updatedEncryptedCodes = this.encryptionService.encrypt(
        JSON.stringify(codes)
      );

      return { valid: true, updatedEncryptedCodes };
    } catch (error) {
      this.logger.error('Backup Code 검증 중 오류 발생', error);
      return { valid: false, updatedEncryptedCodes: null };
    }
  }

  /**
   * 2FA를 활성화한다.
   * TOTP Secret과 Backup Codes를 생성하고 암호화하여 DB에 저장한다.
   * @param userId - 사용자 ID
   * @returns secret, QR 코드 URI, Backup Codes (최초 1회만 평문으로 반환)
   */
  async enableTwoFactor(userId: string): Promise<{
    secret: string;
    qrCodeUri: string;
    backupCodes: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('이미 2단계 인증이 활성화되어 있습니다.');
    }

    // TOTP Secret 생성
    const { secret, qrCodeUri } = this.generateTotpSecret(user.email);

    // Backup Codes 생성
    const backupCodes = this.generateBackupCodes();

    // Secret과 Backup Codes를 암호화하여 저장
    const encryptedSecret = this.encryptionService.encrypt(secret);
    const encryptedBackupCodes = this.encryptionService.encrypt(
      JSON.stringify(backupCodes)
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorEnabled: true,
        backupCodes: encryptedBackupCodes,
      },
    });

    // 감사 로그
    this.auditLogService.logEvent({
      action: 'user.2fa-enabled',
      userId,
      targetType: 'user',
      targetId: userId,
    });

    return { secret, qrCodeUri, backupCodes };
  }

  /**
   * 2FA를 비활성화한다.
   * Secret과 Backup Codes를 null로 초기화한다.
   * @param userId - 사용자 ID
   */
  async disableTwoFactor(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2단계 인증이 활성화되어 있지 않습니다.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        backupCodes: null,
      },
    });

    // 감사 로그
    this.auditLogService.logEvent({
      action: 'user.2fa-disabled',
      userId,
      targetType: 'user',
      targetId: userId,
    });
  }

  /**
   * 2FA 상태를 조회한다.
   * @param userId - 사용자 ID
   * @returns enabled: 2FA 활성화 여부
   */
  async getTwoFactorStatus(userId: string): Promise<{ enabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    return { enabled: user.twoFactorEnabled };
  }

  /**
   * Timing-safe 문자열 비교.
   * crypto.timingSafeEqual을 사용하여 타이밍 공격을 방지한다.
   * 길이가 다른 경우에도 동일한 시간에 비교가 완료되도록 한다.
   * @param a - 비교 대상 문자열 1
   * @param b - 비교 대상 문자열 2
   * @returns 동일 여부
   */
  private timingSafeCompare(a: string, b: string): boolean {
    // 길이가 다르면 더 긴 문자열 기준으로 패딩하여 비교 시간을 균일하게 유지
    const maxLength = Math.max(a.length, b.length);
    const bufA = Buffer.alloc(maxLength);
    const bufB = Buffer.alloc(maxLength);
    bufA.write(a);
    bufB.write(b);

    // 길이가 다르면 무조건 false (타이밍 정보 노출 방지를 위해 비교는 여전히 수행)
    const lengthMatch = a.length === b.length;
    return timingSafeEqual(bufA, bufB) && lengthMatch;
  }
}
