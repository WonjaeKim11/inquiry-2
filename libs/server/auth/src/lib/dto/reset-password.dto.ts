import { IsString, IsNotEmpty } from 'class-validator';
import { PasswordValidationDto } from './password.dto';

/**
 * 비밀번호 재설정 실행 DTO.
 * PasswordValidationDto를 상속하여 비밀번호 규칙을 재사용한다.
 */
export class ResetPasswordDto extends PasswordValidationDto {
  @IsString()
  @IsNotEmpty({ message: '재설정 토큰은 필수입니다.' })
  token!: string;
}
