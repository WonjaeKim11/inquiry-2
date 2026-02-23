import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * AES-256-GCM 암호화/복호화 서비스.
 * ENCRYPTION_KEY 환경변수에서 32바이트 hex 키를 읽어 사용한다.
 * 키가 설정되지 않으면 no-op 모드로 동작하여 평문을 그대로 반환한다 (개발 환경 지원).
 *
 * 암호화 결과 형식: {iv}:{authTag}:{ciphertext} (모두 hex 인코딩)
 * - iv: 12바이트 초기화 벡터 (매 암호화마다 crypto.randomBytes로 생성)
 * - authTag: 16바이트 인증 태그 (무결성 검증)
 * - ciphertext: 암호화된 데이터
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);

  /** AES-256-GCM 알고리즘 */
  private static readonly ALGORITHM = 'aes-256-gcm';
  /** IV 길이 (12바이트, GCM 권장) */
  private static readonly IV_LENGTH = 12;
  /** AuthTag 길이 (16바이트) */
  private static readonly AUTH_TAG_LENGTH = 16;

  /** 암호화 키 (32바이트 Buffer). null이면 no-op 모드 */
  private encryptionKey: Buffer | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const keyHex = this.configService.get<string>('ENCRYPTION_KEY');
    if (!keyHex) {
      this.logger.warn(
        'ENCRYPTION_KEY가 설정되지 않았습니다. 암호화 없이 평문 모드로 동작합니다. 프로덕션에서는 반드시 설정하세요.'
      );
      return;
    }

    const keyBuffer = Buffer.from(keyHex, 'hex');
    if (keyBuffer.length !== 32) {
      this.logger.error(
        `ENCRYPTION_KEY는 32바이트(64자 hex)여야 합니다. 현재: ${keyBuffer.length}바이트. 평문 모드로 폴백합니다.`
      );
      return;
    }

    this.encryptionKey = keyBuffer;
    this.logger.log('AES-256-GCM 암호화 서비스가 초기화되었습니다.');
  }

  /**
   * 평문을 AES-256-GCM으로 암호화한다.
   * ENCRYPTION_KEY 미설정 시 평문을 그대로 반환한다.
   * @param plaintext - 암호화할 평문
   * @returns 암호화된 문자열 (iv:authTag:ciphertext, 모두 hex)
   */
  encrypt(plaintext: string): string {
    if (!this.encryptionKey) {
      return plaintext;
    }

    const iv = randomBytes(EncryptionService.IV_LENGTH);
    const cipher = createCipheriv(
      EncryptionService.ALGORITHM,
      this.encryptionKey,
      iv,
      { authTagLength: EncryptionService.AUTH_TAG_LENGTH }
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * AES-256-GCM으로 암호화된 문자열을 복호화한다.
   * ENCRYPTION_KEY 미설정 시 입력을 그대로 반환한다.
   * @param encrypted - 암호화된 문자열 (iv:authTag:ciphertext)
   * @returns 복호화된 평문
   */
  decrypt(encrypted: string): string {
    if (!this.encryptionKey) {
      return encrypted;
    }

    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      this.logger.warn(
        '암호화된 문자열 형식이 올바르지 않습니다. 평문으로 간주합니다.'
      );
      return encrypted;
    }

    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(
      EncryptionService.ALGORITHM,
      this.encryptionKey,
      iv,
      { authTagLength: EncryptionService.AUTH_TAG_LENGTH }
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
