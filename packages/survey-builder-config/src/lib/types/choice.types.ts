import { z } from 'zod';
import type { LocalizedString } from './localized-string';

/** 텍스트 선택지 — 다국어 라벨을 가진 기본 선택 항목 */
export interface Choice {
  id: string;
  label: LocalizedString;
}

/** 이미지 선택지 — 이미지 URL을 가진 선택 항목 */
export interface PictureChoice {
  id: string;
  imageUrl: string;
}

/** 행렬 선택지 — 행렬(Matrix) 질문의 행/열 항목 */
export interface MatrixChoice {
  id: string;
  label: LocalizedString;
}

/** 텍스트 선택지 Zod 스키마 */
export const choiceSchema = z.object({
  id: z.string().min(1),
  label: z.record(z.string(), z.string()),
});

/** 이미지 선택지 Zod 스키마 */
export const pictureChoiceSchema = z.object({
  id: z.string().min(1),
  imageUrl: z.string().min(1),
});

/** 행렬 선택지 Zod 스키마 */
export const matrixChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.record(z.string(), z.string()),
});
