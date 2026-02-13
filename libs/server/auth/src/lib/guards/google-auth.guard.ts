import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Google OAuth 인증 가드 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
