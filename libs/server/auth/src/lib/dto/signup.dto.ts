import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

/** 이메일+비밀번호 회원가입 요청 DTO */
export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(100)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;
}
