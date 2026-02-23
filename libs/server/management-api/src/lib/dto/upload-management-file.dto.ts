import { z } from 'zod';

/**
 * Management API 파일 업로드 요청 스키마.
 * base64로 인코딩된 파일 데이터를 전달한다.
 */
export const UploadManagementFileSchema = z.object({
  /** 원본 파일명 (확장자 포함) */
  fileName: z.string().min(1, { message: 'File name is required' }),
  /** base64 인코딩된 파일 데이터 */
  fileData: z.string().min(1, { message: 'File data is required' }),
  /** 파일 MIME 타입 */
  contentType: z.string().optional(),
});

export type UploadManagementFileDto = z.infer<
  typeof UploadManagementFileSchema
>;
