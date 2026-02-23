import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { generateCuid2 } from '@inquiry/server-core';

/**
 * Client API Storage 서비스.
 * 로컬 파일 시스템에 파일을 저장한다.
 * STORAGE_PATH 환경변수로 저장 경로를 설정할 수 있다 (기본값: ./uploads).
 */
@Injectable()
export class ClientStorageService {
  private readonly logger = new Logger(ClientStorageService.name);
  private readonly storagePath: string;

  constructor(private readonly configService: ConfigService) {
    this.storagePath =
      this.configService.get<string>('STORAGE_PATH') || './uploads';
  }

  /**
   * 파일 업로드 (로컬 FS).
   * base64 인코딩된 파일 데이터를 디코딩하여 로컬 파일 시스템에 저장한다.
   * @param environmentId - 파일이 속할 환경 ID (디렉토리 분리용)
   * @param input - fileName, fileData(base64), contentType
   * @returns 저장된 파일의 접근 URL
   */
  async uploadFile(
    environmentId: string,
    input: {
      fileName: string;
      fileData: string; // base64 encoded
      contentType?: string;
    }
  ): Promise<{ url: string }> {
    const dirPath = path.join(this.storagePath, environmentId);

    // 디렉토리 생성 (재귀적)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const ext = path.extname(input.fileName);
    const storedName = `${generateCuid2()}${ext}`;
    const filePath = path.join(dirPath, storedName);

    // base64 → Buffer → 파일 저장
    const buffer = Buffer.from(input.fileData, 'base64');
    fs.writeFileSync(filePath, buffer);

    this.logger.log(`파일 저장 완료: ${filePath}`);

    return {
      url: `/storage/${environmentId}/${storedName}`,
    };
  }
}
