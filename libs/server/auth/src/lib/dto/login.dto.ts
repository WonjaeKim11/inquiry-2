import {
  IsEmail,
  IsString,
  IsOptional,
  MaxLength,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** 이메일+비밀번호 로그인 요청 DTO */
export class LoginDto {
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value
  )
  email!: string;

  @IsString()
  @MaxLength(128, { message: '비밀번호는 최대 128자까지 가능합니다.' })
  password!: string;

  /** 2FA TOTP 코드 (6자리 숫자) */
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'TOTP 코드는 6자리여야 합니다.' })
  @Matches(/^\d{6}$/, { message: 'TOTP 코드는 숫자 6자리여야 합니다.' })
  totpCode?: string;

  /** 2FA Backup Code (xxxx-xxxx 형식) */
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{4}-[a-f0-9]{4}$/, {
    message: 'Backup Code 형식이 올바르지 않습니다. (xxxx-xxxx)',
  })
  backupCode?: string;
}
