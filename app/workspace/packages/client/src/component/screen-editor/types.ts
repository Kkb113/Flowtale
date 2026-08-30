import { RespScreen } from '@fable/common/dist/api-contract';
import { IAnnotationConfig } from '@fable/common/dist/types';
import { AnnAdd } from '../../action/creator';

export type AddScreenFn = (screen: RespScreen, annAdd: AnnAdd) => void;

export type ApplyDiffAndGoToAnn = (
    currAnnRefId: string,
    goToAnnIdWithScreenId: string,
) => Promise<void>;

export type DisplayCSSPropValue = 'block' | 'inline' | 'inline-block' | 'flex' |
'grid' | 'none' | 'table' | 'table-cell' | 'table-row' | 'initial' | 'inherit';

export type NavToAnnByRefIdFn = (annRefId: string) => void;

export const StyleKeysToBeStored: Array<keyof IAnnotationConfig> = [
  'hideAnnotation',
  'showOverlay',
  'buttonLayout',
  'selectionShape',
  'selectionEffect',
  'targetElCssStyle',
  'annCSSStyle',
  'annotationSelectionColor'
];

export type StyleObjForFormatPaste = Partial<{ [key in typeof StyleKeysToBeStored[number]]: any }>;

export interface StoredStyleForFormatPaste {
  tourId: number;
  tourRid: string
  screnId: number;
  annotationId: string;
  style: StyleObjForFormatPaste;
}
