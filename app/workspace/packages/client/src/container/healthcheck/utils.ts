import {
  IAnnotationButton,
  IAnnotationConfig,
  ITourEntityHotspot,
  TourData,
  TourScreenEntity
} from '@fable/common/dist/types';

export async function getData(url: string): Promise<TourData> {
  const res = await fetch(url);
  const data = await res.json();
  return data as TourData;
}

export function validate(data: TourData): string[] {
  const errors: string[] = [];

  // form annotations arr
  const anns = getAnnotationsFromTourData(data, errors);

  // validate main
  const isTourMainValid = isMainValid(data.opts.main, anns);
  if (!isTourMainValid) {
    errors.push('Main is not set or is invalid');
  }

  const startingPoints = getEndPointsOfTimelines(anns, 'start');
  const endingPoints = getEndPointsOfTimelines(anns, 'end');

  // go from first to last
  startingPoints.forEach((ann) => {
    checkTimeline(anns, ann, 'front-lo-last', errors);
  });

  // go to last from first
  endingPoints.forEach((ann) => {
    checkTimeline(anns, ann, 'last-to-front', errors);
  });

  return errors;
}

function checkTimeline(
  anns:IAnnotationConfig[],
  startAnn: IAnnotationConfig,
  dir: 'front-lo-last' | 'last-to-front',
  errors: string[]
): string[] {
  const type: BtnType = dir === 'front-lo-last' ? 'next' : 'prev';

  let ann: IAnnotationConfig | null | undefined = startAnn;

  const traversedRefIds: string[] = [];

  while (ann) {
    const currAnnRefId = ann.refId;

    // LOOP detection
    if (traversedRefIds.includes(currAnnRefId)) {
      errors.push(`Infinite loop detected for timeline with starting point of ${startAnn.refId}. 
      This ann is repeated ${currAnnRefId}`);
      return errors;
    }
    traversedRefIds.push(currAnnRefId);

    // Flow detection
    const adjacentBtn = getAnnotationBtn(ann, type);
    if (isNavigateHotspot(adjacentBtn.hotspot)) {
      const annRefId = getAnnIdFromActionValue(adjacentBtn.hotspot!.actionValue._val);
      ann = getAnnotationByRefId(anns, annRefId);
      if (!ann) {
        errors.push(`Annotation doesn't exist ${annRefId} for ${type} of ${currAnnRefId}`);
      }

      /**
       * The prev btn of the next ann should point to the current ann
       * OR
       * The next btn of the prev ann should point to the current ann
       */
      if (ann && !checkIfAdjacentAnnAndCurrentAnnAreLinked(currAnnRefId, ann, type)) {
        errors.push(`Next<> Prev not in sync: 
        Current ann: ${currAnnRefId}'s ${type} && ${ann.refId}'s ${getOppositeBtnType(type)} `);
      }
    } else {
      ann = null;
    }
  }

  return errors;
}

export const checkIfAdjacentAnnAndCurrentAnnAreLinked = (
  currAnnRefId: string,
  adjacentAnn: IAnnotationConfig,
  btnTypeOfCurrAnn: BtnType
): boolean => {
  const toCheckBtnTypeOfAdjAnn = getOppositeBtnType(btnTypeOfCurrAnn);
  const adjacentAnnBtn = getAnnotationBtn(adjacentAnn, toCheckBtnTypeOfAdjAnn);
  if (isNavigateHotspot(adjacentAnnBtn.hotspot)) {
    const annId = getAnnIdFromActionValue(adjacentAnnBtn.hotspot!.actionValue._val);
    if (annId === currAnnRefId) {
      return true;
    }
  }
  return false;
};

export function getEndPointsOfTimelines(anns: IAnnotationConfig[], pos: 'start' | 'end'): IAnnotationConfig[] {
  const btnType = pos === 'start' ? 'prev' : 'next';
  return anns.filter(ann => {
    const btn = getAnnotationBtn(ann, btnType);
    const isEndpoint = !btn.hotspot || btn.hotspot.actionType === 'open';
    return isEndpoint;
  });
}

export function getAnnotationsFromTourData(data: TourData, errors: string[]):IAnnotationConfig[] {
  const anns: IAnnotationConfig[] = [];
  for (const [screenId, entity] of Object.entries(data.entities)) {
    if (entity.type === 'screen') {
      for (const [annId, ann] of Object.entries((entity as TourScreenEntity).annotations)) {
        anns.push(ann as IAnnotationConfig);
      }
    } else {
      errors.push(`${entity.ref} is not of type screen`);
    }
  }
  return anns;
}

export function isMainValid(main: string, anns: IAnnotationConfig[]): boolean {
  if (main) {
    const mainAnnRefId = main.split('/')[1];
    if (getAnnotationByRefId(anns, mainAnnRefId)) {
      return true;
    }
  }
  return false;
}

export function getAnnotationByRefId(annotations: IAnnotationConfig[], refId: string): IAnnotationConfig | undefined {
  return annotations.find(ann => ann.refId === refId);
}

export function getAnnotationBtn(ann: IAnnotationConfig, type: BtnType): IAnnotationButton {
  // TODO: add to erros if button is not present
  return ann.buttons.find(btn => btn.type === type)!;
}

export const isNavigateHotspot = (hotspot: ITourEntityHotspot | null): boolean => {
  const result = Boolean((hotspot && hotspot.actionType === 'navigate'));
  return result;
};

export const getAnnIdFromActionValue = (actionValue: string): string => actionValue.split('/')[1];

export const getOppositeBtnType = (type: BtnType): BtnType => (type === 'next' ? 'prev' : 'next');

type BtnType = 'next' | 'prev';
