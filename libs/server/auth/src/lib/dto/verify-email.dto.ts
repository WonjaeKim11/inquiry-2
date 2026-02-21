import { IsString, IsNotEmpty } from 'class-validator';

/** 이메일 검증 요청 DTO */
export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: '검증 토큰은 필수입니다.' })
  token!: string;
}
