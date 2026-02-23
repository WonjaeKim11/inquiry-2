import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

/** API 키 생성 요청 DTO */
export class CreateApiKeyDto {
  /** API 키 라벨 (용도 식별용) */
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label!: string;

  /** 환경 ID (연결할 환경) */
  @IsString()
  environmentId!: string;

  /** 만료일 (선택, ISO 8601) */
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
