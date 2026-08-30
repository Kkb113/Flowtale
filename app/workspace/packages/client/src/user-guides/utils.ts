/* eslint-disable class-methods-use-this */
import { sentryCaptureException } from '@fable/common/dist/sentry';
import {
  Guide,
  GuideInfo,
  GuideProps,
  TourStepPropsWithElHotspotConfig,
  USER_GUIDE_LOCAL_STORE_KEY,
  UserGuideCustomPosition
} from './types';
import { insertAllUserGuides } from '.';

export interface LocalStoreUserGuideProps {
  groupId: string;
  totalSteps: number;
  stepsTaken: number;
  isCompleted: boolean;
  isSkipped: boolean;
  name: string;
  id: string;
  partId: number;
  desc: { toursCreated: string; toursNotCreated: string; };
  serialId: number;
}

type LocalStoreUserGuide = Record<string, LocalStoreUserGuideProps>;

const reinitializeLocalStorage = (): LocalStoreUserGuide => {
  insertAllUserGuides();
  const FABLE_USER_GUIDE = localStorage.getItem(USER_GUIDE_LOCAL_STORE_KEY);
  return JSON.parse(FABLE_USER_GUIDE!);
};

const getFableUserGuide = (): LocalStoreUserGuide => {
  const FABLE_USER_GUIDE = localStorage.getItem(USER_GUIDE_LOCAL_STORE_KEY);
  return FABLE_USER_GUIDE ? JSON.parse(FABLE_USER_GUIDE) as LocalStoreUserGuide : reinitializeLocalStorage();
};

const saveFableUserGuide = (userGuide: LocalStoreUserGuide): void => {
  localStorage.setItem(USER_GUIDE_LOCAL_STORE_KEY, JSON.stringify(userGuide));
};

const updateGuideProps = (
  newGuide: LocalStoreUserGuideProps,
  localStoreGuide: LocalStoreUserGuide
): LocalStoreUserGuide => {
  const updatedLocalStorageGuide: LocalStoreUserGuide = { ...localStoreGuide };
  Object.entries(newGuide).forEach(([key, value]) => {
    if (
      (
        updatedLocalStorageGuide[newGuide.id][key as keyof LocalStoreUserGuideProps] === undefined
        || updatedLocalStorageGuide[newGuide.id][key as keyof LocalStoreUserGuideProps] !== value
      )
      && key !== 'isSkipped'
      && key !== 'isCompleted'
      && key !== 'stepsTaken'
    ) {
      // @ts-ignore
      updatedLocalStorageGuide[newGuide.id][key as keyof LocalStoreUserGuideProps] = value;
    }
  });

  return updatedLocalStorageGuide;
};

export const removeDeprecatedTours = (
  guides: { guideInfo: GuideInfo; component: (props: GuideProps) => JSX.Element }[]
): void => {
  const FABLE_USER_GUIDE = getFableUserGuide();
  const UPDATED_FABLE_USER_GUIDE: LocalStoreUserGuide = {};
  guides.forEach(guide => UPDATED_FABLE_USER_GUIDE[guide.guideInfo.id] = FABLE_USER_GUIDE[guide.guideInfo.id]);
  saveFableUserGuide(UPDATED_FABLE_USER_GUIDE);
};

export const upsertFableUserGuide = (
  guide: LocalStoreUserGuideProps
): void => {
  let FABLE_USER_GUIDE = getFableUserGuide();

  if (!FABLE_USER_GUIDE[guide.id]) {
    FABLE_USER_GUIDE[guide.id] = guide;
  } else {
    FABLE_USER_GUIDE = updateGuideProps(guide, FABLE_USER_GUIDE);
  }

  saveFableUserGuide(FABLE_USER_GUIDE);
};

export const insertFableUserGuide = (
  guides: { guideInfo: GuideInfo; component: (props: GuideProps) => JSX.Element }[]
): void => {
  const FABLE_USER_GUIDE: LocalStoreUserGuide = {};
  guides.forEach(guide => FABLE_USER_GUIDE[guide.guideInfo.id] = guide.guideInfo);
  saveFableUserGuide(FABLE_USER_GUIDE);
};

export const shouldShowGuide = (guideId: string): boolean => {
  const FABLE_USER_GUIDE = getFableUserGuide();
  const guide = FABLE_USER_GUIDE[guideId];
  if (!guide) return false;

  const isCurrGuideDone = !guide.isSkipped && !guide.isCompleted;

  if (guide.partId === 0) {
    return isCurrGuideDone;
  }

  const prevGuide = Object.values(FABLE_USER_GUIDE).find(g => (
    g.groupId === guide.groupId && g.partId === guide.partId - 1
  ));

  if (prevGuide) {
    return prevGuide.isCompleted && isCurrGuideDone;
  }

  return false;
};

export const updateStepsTaken = (guideId: string, stepsTaken: number): void => {
  const FABLE_USER_GUIDE = getFableUserGuide();
  const guide = FABLE_USER_GUIDE[guideId];
  if (!guide) return;

  if (guide.stepsTaken < stepsTaken) {
    guide.stepsTaken = stepsTaken;
    saveFableUserGuide(FABLE_USER_GUIDE);
  }
};

export const getDOMElement = (
  guide: Guide,
  domQuery: () => HTMLElement | null,
  shouldCloseUserGuide = true,
  shouldSkipUserGuide = true
): HTMLElement | null => {
  try {
    const el = domQuery();
    if (el) return el;
    throw new Error('El not found');
  } catch (e) {
    if (shouldCloseUserGuide && shouldSkipUserGuide) {
      console.error(e);
      closeUserGuide();
      skipUserGuide(guide);
      sentryCaptureException(e as Error);
    }
  }
  return null;
};

export const closeUserGuide = (): void => {
  const closeBtn = document.getElementsByClassName('ant-tour-close').item(0) as HTMLSpanElement;
  if (closeBtn) closeBtn.click();
};

export const skipUserGuide = (guide: Guide): void => {
  const FABLE_USER_GUIDE = getFableUserGuide();

  for (const g of Object.values(FABLE_USER_GUIDE)) {
    if (g.groupId === guide.name) {
      g.isSkipped = true;
    }
  }

  saveFableUserGuide(FABLE_USER_GUIDE);
};

export const resetSkippedOrCompletedStatus = (groupId: string): void => {
  const FABLE_USER_GUIDE = getFableUserGuide();

  for (const guide of Object.values(FABLE_USER_GUIDE)) {
    if (guide.groupId === groupId) {
      guide.isCompleted = false;
      guide.isSkipped = false;
      guide.stepsTaken = 0;
    }
  }

  saveFableUserGuide(FABLE_USER_GUIDE);
};

export const completeUserGuide = (guideId: string): void => {
  const FABLE_USER_GUIDE = getFableUserGuide();

  const guide = FABLE_USER_GUIDE[guideId];

  if (!guide) return;

  guide.isCompleted = true;

  saveFableUserGuide(FABLE_USER_GUIDE);
};

export const getUserGuideCompletionProgressInModules = (): {
  completedModules: number;
  totalmodules: number;
} => {
  const FABLE_USER_GUIDE = groupUserGuidesByGroupId(getFableUserGuide());

  return Object.values(FABLE_USER_GUIDE).reduce((acc, curr) => {
    if (curr.isCompleted || curr.isSkipped) {
      acc.completedModules += 1;
    }
    acc.totalmodules += 1;
    return acc;
  }, { completedModules: 0, totalmodules: 0 });
};

export const getUserGuidesInArray = (): LocalStoreUserGuideProps[] => {
  const FABLE_USER_GUIDE = getFableUserGuide();
  const USER_GUIDES: LocalStoreUserGuideProps[] = [];
  for (const [_, guide] of Object.entries(FABLE_USER_GUIDE)) {
    USER_GUIDES[guide.serialId - 1] = guide;
  }

  return USER_GUIDES;
};

const groupUserGuidesByGroupId = (guides: LocalStoreUserGuide): LocalStoreUserGuide => {
  const groupedGuides: Record<string, LocalStoreUserGuideProps[]> = {};

  for (const guide of Object.values(guides)) {
    const groupId = guide.groupId;

    if (groupedGuides[groupId]) {
      groupedGuides[groupId].push(guide);
    } else {
      groupedGuides[groupId] = [guide];
    }
  }

  const compositeGuide: Record<string, LocalStoreUserGuideProps> = {};

  for (const [groupId, groupedGuide] of Object.entries(groupedGuides)) {
    let isCompleted = true;
    let isSkipped = false;
    let stepsTaken = 0;
    let totalSteps = 0;
    const id = groupId;

    for (const guide of groupedGuide) {
      stepsTaken += guide.stepsTaken;
      totalSteps += guide.totalSteps;
      if (!guide.isCompleted) isCompleted = false;
      if (guide.isSkipped) isSkipped = true;
    }

    compositeGuide[id] = {
      id,
      groupId,
      stepsTaken,
      totalSteps,
      isCompleted,
      isSkipped,
      name: groupId,
      partId: 0,
      desc: groupedGuide[0].desc,
      serialId: groupedGuide[0].serialId
    };
  }

  return compositeGuide;
};

export const emulateHotspotClick = (target: HTMLElement): void => {
  if (!target.getAttribute('clicked')) {
    target.click();
  } else {
    target.removeAttribute('clicked');
  }
};

export class UserGuideHotspotManager {
  public hotspotEl: HTMLElement | null = null;

  private steps: TourStepPropsWithElHotspotConfig[];

  private POLL_INTERVAL = 300;

  private DEFAULT_WIDTH = '20rem';

  private POLL_DURATION = 2500;

  constructor(steps: TourStepPropsWithElHotspotConfig[]) {
    this.steps = steps;
  }

  private emulateNextClick(e: MouseEvent): void {
    const el = e.currentTarget as HTMLElement;
    el.setAttribute('clicked', 'true');

    const nextBtn = document.getElementsByClassName('ant-tour-next-btn')[0] as HTMLElement;
    nextBtn.click();
  }

  private addHotspot = (target: HTMLElement): void => {
    target.addEventListener('click', this.emulateNextClick);
  };

  private removeHotspot = (target: HTMLElement): void => {
    target.removeEventListener('click', this.emulateNextClick);
  };

  private getHotspotEl = (currentStep: TourStepPropsWithElHotspotConfig): HTMLElement | null => {
    const result = currentStep.hotspot
      ? ((currentStep.hotspotTarget || currentStep.target) as () => HTMLElement | null).call(this) || null
      : null;

    return result;
  };

  applyWidth = (width: string): void => {
    let timeElapsed = 0;
    const intervalId = setInterval(() => {
      const guideCard = document.getElementsByClassName('ant-tour').item(0) as HTMLElement;

      timeElapsed += this.POLL_INTERVAL;

      if (guideCard) guideCard.style.setProperty('width', width, 'important');

      if (timeElapsed > this.POLL_DURATION || guideCard) clearInterval(intervalId);
    }, this.POLL_INTERVAL);
  };

  applyCustomPosition = (customPosition: UserGuideCustomPosition): void => {
    let timeElapsed = 0;
    const intervalId = setInterval(() => {
      const guideCard = document.getElementsByClassName('ant-tour').item(0) as HTMLElement;

      timeElapsed += this.POLL_INTERVAL;

      if (guideCard) {
        setTimeout(() => {
          const guideCardRect = guideCard.getBoundingClientRect();
          switch (customPosition) {
            case 'bottom-left':
              guideCard.style.setProperty(
                'transform',
                `translate(-${guideCardRect.x - 16}px, ${window.innerHeight - (guideCardRect.top + guideCardRect.height) - 16}px)`,
                'important'
              );

              break;
            default:
              break;
          }
        }, 250);
      }

      if (timeElapsed > this.POLL_DURATION || guideCard) clearInterval(intervalId);
    }, this.POLL_INTERVAL);
  };

  cleanupHotspot = (): void => {
    if (this.hotspotEl) this.removeHotspot(this.hotspotEl!);
  };

  updateHotspot(index: number): void {
    if (this.hotspotEl) this.removeHotspot(this.hotspotEl!);

    const currentStep = this.steps[index];

    let timeElapsed = 0;
    const intervalId = setInterval(() => {
      this.hotspotEl = this.getHotspotEl(currentStep);

      timeElapsed += this.POLL_INTERVAL;

      if (this.hotspotEl) this.addHotspot(this.hotspotEl);

      if (timeElapsed > this.POLL_DURATION || this.hotspotEl) clearInterval(intervalId);
    }, this.POLL_INTERVAL);

    if (currentStep.hideNavButtons) {
      document.getElementsByClassName('ant-tour-buttons').item(0)?.setAttribute('style', 'display: none !important');
    }

    this.applyWidth(currentStep.width || this.DEFAULT_WIDTH);
    if (currentStep.customPosition) this.applyCustomPosition(currentStep.customPosition);
  }
}
