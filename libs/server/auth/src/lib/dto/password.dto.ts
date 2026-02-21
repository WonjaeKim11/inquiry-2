import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

/**
 * 비밀번호 유효성 검사 공통 DTO.
 * 회원가입, 비밀번호 재설정 등에서 상속하여 재사용한다.
 *
 * - 최소 8자, 최대 128자 (bcrypt DoS 방지)
 * - 대문자 1자 이상 필수
 * - 숫자 1자 이상 필수
 */
export class PasswordValidationDto {
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(128, { message: '비밀번호는 최대 128자까지 가능합니다.' })
  @Matches(/[A-Z]/, {
    message: '비밀번호에 대문자가 1자 이상 포함되어야 합니다.',
  })
  @Matches(/[0-9]/, {
    message: '비밀번호에 숫자가 1자 이상 포함되어야 합니다.',
  })
  password!: string;
}
