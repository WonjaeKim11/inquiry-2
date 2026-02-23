import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  allowMultipleFilesAttribute,
  maxSizeInMBAttribute,
  allowedFileExtensionsAttribute,
  validationConfigAttribute,
} from '../attributes/index';

/**
 * FileUpload 질문 엔티티: 파일 업로드 질문.
 * 복수 파일 허용, 최대 파일 크기, 허용 확장자, 검증 규칙을 지원한다.
 */
export const fileUploadEntity = createEntity({
  name: 'fileUpload',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    allowMultipleFilesAttribute,
    maxSizeInMBAttribute,
    allowedFileExtensionsAttribute,
    validationConfigAttribute,
  ],
  parentRequired: true,
});
