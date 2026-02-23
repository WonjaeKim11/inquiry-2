/**
 * 파일 업로드 시 허용되는 확장자 목록 (26가지).
 * 이미지, 문서, 데이터, 미디어, 압축 파일 형식을 포함한다.
 */
export const ALLOWED_FILE_EXTENSIONS = [
  // 이미지
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'tiff',
  'webp',
  'svg',
  'ico',
  // 문서
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  // 데이터
  'csv',
  'txt',
  'json',
  'xml',
  // 미디어
  'mp3',
  'mp4',
  'wav',
  'avi',
  'mov',
  // 압축
  'zip',
] as const;

/** 허용 파일 확장자 유니온 타입 */
export type AllowedFileExtension = (typeof ALLOWED_FILE_EXTENSIONS)[number];
