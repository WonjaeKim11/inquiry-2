import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PasswordValidationDto } from './password.dto';

/**
 * 이메일+비밀번호 회원가입 요청 DTO.
 * PasswordValidationDto를 상속하여 비밀번호 규칙을 재사용한다.
 */
export class SignupDto extends PasswordValidationDto {
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value
  )
  email!: string;

  @IsString()
  @IsNotEmpty({ message: '이름은 필수 입력입니다.' })
  @MaxLength(50)
  @Matches(/^[\p{L}\p{N}\s\-']+$/u, {
    message: '이름에 허용되지 않는 문자가 포함되어 있습니다.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  /** 초대 토큰 (조직 초대 수락 시) */
  @IsOptional()
  @IsString()
  inviteToken?: string;

  /** 사용자 로케일 설정 */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  userLocale?: string;

  /** Cloudflare Turnstile CAPTCHA 토큰 */
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
