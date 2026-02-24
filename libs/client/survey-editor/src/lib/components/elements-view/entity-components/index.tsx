import { BlockComponent } from '../BlockComponent';
import { OpenTextComponent } from './OpenTextComponent';
import { ConsentComponent } from './ConsentComponent';
import { CTAComponent } from './CTAComponent';
import { DateComponent } from './DateComponent';
import { CalComponent } from './CalComponent';
import {
  MultipleChoiceSingleComponent,
  MultipleChoiceMultiComponent,
} from './MultipleChoiceComponent';
import { NPSComponent } from './NPSComponent';
import { RatingComponent } from './RatingComponent';
import { PictureSelectionComponent } from './PictureSelectionComponent';
import { RankingComponent } from './RankingComponent';
import { FileUploadComponent } from './FileUploadComponent';
import { MatrixComponent } from './MatrixComponent';
import { AddressComponent } from './AddressComponent';
import { ContactInfoComponent } from './ContactInfoComponent';

/**
 * Entity Type -> Component 매핑.
 * BuilderEntities의 components prop에 전달한다.
 * block + 15종 Element 모두 실제 컴포넌트로 구현 완료.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const entityComponentMap: Record<string, any> = {
  block: BlockComponent,
  openText: OpenTextComponent,
  multipleChoiceSingle: MultipleChoiceSingleComponent,
  multipleChoiceMulti: MultipleChoiceMultiComponent,
  nps: NPSComponent,
  cta: CTAComponent,
  rating: RatingComponent,
  consent: ConsentComponent,
  pictureSelection: PictureSelectionComponent,
  date: DateComponent,
  fileUpload: FileUploadComponent,
  cal: CalComponent,
  matrix: MatrixComponent,
  address: AddressComponent,
  ranking: RankingComponent,
  contactInfo: ContactInfoComponent,
};
