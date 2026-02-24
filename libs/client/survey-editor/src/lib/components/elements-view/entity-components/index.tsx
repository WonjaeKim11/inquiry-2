import { createEntityComponent } from '@coltorapps/builder-react';
import {
  openTextEntity,
  multipleChoiceSingleEntity,
  multipleChoiceMultiEntity,
  npsEntity,
  ctaEntity,
  ratingEntity,
  consentEntity,
  pictureSelectionEntity,
  dateEntity,
  fileUploadEntity,
  calEntity,
  matrixEntity,
  addressEntity,
  rankingEntity,
  contactInfoEntity,
} from '@inquiry/survey-builder-config';
import { BlockComponent } from '../BlockComponent';

/**
 * 임시 Element placeholder 컴포넌트 팩토리.
 * Phase 4에서 각 Entity 타입별 실제 컴포넌트로 교체된다.
 * headline 속성이 있으면 미리보기로 표시한다.
 *
 * @param entity - @coltorapps/builder의 Entity 정의
 * @param label - placeholder에 표시할 타입 라벨
 * @returns createEntityComponent로 생성된 Entity 컴포넌트
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPlaceholderComponent(entity: any, label: string) {
  return createEntityComponent(entity, ({ entity: e }) => {
    // headline 속성의 default 값을 미리보기로 표시
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attrs = e.attributes as Record<string, any>;
    const headline = attrs?.headline;
    const headlineText =
      typeof headline === 'object' && headline !== null
        ? (headline['default'] as string) ?? ''
        : typeof headline === 'string'
        ? headline
        : '';

    return (
      <div className="rounded-md border border-dashed p-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {headlineText && <p className="mt-1 text-sm">{headlineText}</p>}
      </div>
    );
  });
}

/** Element Entity placeholder 컴포넌트들 - Phase 4에서 실제 컴포넌트로 교체 예정 */
const OpenTextPlaceholder = createPlaceholderComponent(
  openTextEntity,
  'Open Text'
);
const MultipleChoiceSinglePlaceholder = createPlaceholderComponent(
  multipleChoiceSingleEntity,
  'Multiple Choice (Single)'
);
const MultipleChoiceMultiPlaceholder = createPlaceholderComponent(
  multipleChoiceMultiEntity,
  'Multiple Choice (Multi)'
);
const NPSPlaceholder = createPlaceholderComponent(npsEntity, 'NPS');
const CTAPlaceholder = createPlaceholderComponent(ctaEntity, 'CTA');
const RatingPlaceholder = createPlaceholderComponent(ratingEntity, 'Rating');
const ConsentPlaceholder = createPlaceholderComponent(consentEntity, 'Consent');
const PictureSelectionPlaceholder = createPlaceholderComponent(
  pictureSelectionEntity,
  'Picture Selection'
);
const DatePlaceholder = createPlaceholderComponent(dateEntity, 'Date');
const FileUploadPlaceholder = createPlaceholderComponent(
  fileUploadEntity,
  'File Upload'
);
const CalPlaceholder = createPlaceholderComponent(calEntity, 'Cal');
const MatrixPlaceholder = createPlaceholderComponent(matrixEntity, 'Matrix');
const AddressPlaceholder = createPlaceholderComponent(addressEntity, 'Address');
const RankingPlaceholder = createPlaceholderComponent(rankingEntity, 'Ranking');
const ContactInfoPlaceholder = createPlaceholderComponent(
  contactInfoEntity,
  'Contact Info'
);

/**
 * Entity Type -> Component 매핑.
 * BuilderEntities의 components prop에 전달한다.
 * block은 실제 BlockComponent, 나머지 15종 Element는 임시 placeholder.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const entityComponentMap: Record<string, any> = {
  block: BlockComponent,
  openText: OpenTextPlaceholder,
  multipleChoiceSingle: MultipleChoiceSinglePlaceholder,
  multipleChoiceMulti: MultipleChoiceMultiPlaceholder,
  nps: NPSPlaceholder,
  cta: CTAPlaceholder,
  rating: RatingPlaceholder,
  consent: ConsentPlaceholder,
  pictureSelection: PictureSelectionPlaceholder,
  date: DatePlaceholder,
  fileUpload: FileUploadPlaceholder,
  cal: CalPlaceholder,
  matrix: MatrixPlaceholder,
  address: AddressPlaceholder,
  ranking: RankingPlaceholder,
  contactInfo: ContactInfoPlaceholder,
};
