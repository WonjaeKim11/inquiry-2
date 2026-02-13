import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** 이메일+비밀번호 로컬 인증 가드 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
