import { IsEmail, IsString } from 'class-validator';

/** 이메일+비밀번호 로그인 요청 DTO */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
