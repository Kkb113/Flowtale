import { GuideStatus } from './user-guide-details';
import { LocalStoreUserGuideProps } from '../../user-guides/utils';

export const getTourGuideCardColor = (guideIdx: number): string => {
  const bgColor: string[] = ['#f5f5ff', '#F5FFF9', '#FFFBF5'];
  return bgColor[guideIdx % 3];
};

export const getUserGuideType = (guide: LocalStoreUserGuideProps): GuideStatus => {
  if (guide.isCompleted) {
    return 'completed';
  }
  if (guide.isSkipped) {
    return 'skipped';
  }
  return 'remaining';
};
