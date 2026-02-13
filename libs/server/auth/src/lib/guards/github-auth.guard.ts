import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** GitHub OAuth 인증 가드 */
@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {}
