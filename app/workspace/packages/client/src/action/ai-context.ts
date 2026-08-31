import { DemoState } from '../types';

export function getSingleAnnotationContext(
  demoState: DemoState[],
  currentAnnId: number | undefined,
  batchSize: number,
): DemoState[] {
  if (currentAnnId === undefined || Number.isNaN(currentAnnId)) {
    throw new Error('Current Annotation Id not found');
  }
  const targetIndex = demoState.findIndex(item => item.id === currentAnnId);
  if (targetIndex === -1) {
    throw new Error(`Annotation with id ${currentAnnId} not found`);
  }
  const startIndex = Math.max(0, targetIndex - 2);
  return demoState.slice(startIndex, startIndex + batchSize);
}
