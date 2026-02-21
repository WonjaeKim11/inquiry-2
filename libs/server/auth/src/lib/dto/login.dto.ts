import { IsEmail, IsString, MaxLength } from 'class-validator';
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
}
