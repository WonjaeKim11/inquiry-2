import { IsEmail, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** 비밀번호 재설정 요청 DTO (이메일로 재설정 링크 발송) */
export class ForgotPasswordDto {
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value
  )
  email!: string;
}
