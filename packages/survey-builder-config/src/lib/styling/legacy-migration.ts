import type { BaseStyling, StylingColor } from './types';

/**
 * v4.6 레거시 필드를 v4.7 신규 필드로 변환한다.
 * 신규 필드에 이미 값이 있으면 건너뛴다 (BR-09-01).
 * 레거시 필드가 없으면 빈 객체를 반환한다.
 */
export function migrateLegacyStyling(
  styling: BaseStyling
): Partial<BaseStyling> {
  const migrated: Partial<BaseStyling> = {};

  // questionColor -> 5개 필드 (headlineColor, descriptionColor, topLabelColor, inputTextColor, optionLabelColor)
  if (styling.questionColor) {
    const qc: StylingColor = styling.questionColor;
    if (!styling.headlineColor) migrated.headlineColor = qc;
    if (!styling.descriptionColor) migrated.descriptionColor = qc;
    if (!styling.topLabelColor) migrated.topLabelColor = qc;
    if (!styling.inputTextColor) migrated.inputTextColor = qc;
    if (!styling.optionLabelColor) migrated.optionLabelColor = qc;
  }

  // brandColor -> 4개 필드 (buttonBgColor, buttonTextColor, progressIndicatorColor, progressTrackBgColor)
  if (styling.brandColor) {
    const bc: StylingColor = styling.brandColor;
    if (!styling.buttonBgColor) migrated.buttonBgColor = bc;
    if (!styling.buttonTextColor) migrated.buttonTextColor = bc;
    if (!styling.progressIndicatorColor) migrated.progressIndicatorColor = bc;
    if (!styling.progressTrackBgColor) migrated.progressTrackBgColor = bc;
  }

  // inputColor (general) -> 1개 필드 (optionBgColor)
  if (styling.inputColor) {
    if (!styling.optionBgColor) migrated.optionBgColor = styling.inputColor;
  }

  return migrated;
}
