import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';
import { ALLOWED_FILE_EXTENSIONS } from '../../constants/allowed-file-extensions';

/**
 * allowedFileExtensions 속성 — 업로드 허용 파일 확장자 목록.
 * ALLOWED_FILE_EXTENSIONS에 정의된 확장자만 허용된다.
 * 빈 배열이면 모든 허용 확장자를 사용할 수 있음을 의미한다.
 */
export const allowedFileExtensionsAttribute = createAttribute({
  name: 'allowedFileExtensions',
  validate(value) {
    return z
      .array(z.string())
      .refine(
        (exts) =>
          exts.every((ext) =>
            (ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext)
          ),
        { message: '허용되지 않은 파일 확장자가 포함되어 있습니다' }
      )
      .parse(value);
  },
});
