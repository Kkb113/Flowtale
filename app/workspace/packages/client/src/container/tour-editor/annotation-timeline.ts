import { AnnotationPerScreen, IAnnotationConfigWithScreen, Timeline } from '../../types';

/** Build editor rows without requiring a well-formed navigation graph to open a demo. */
export function buildAnnotationTimeline(screens: AnnotationPerScreen[]): Timeline {
  const annotations = new Map<string, IAnnotationConfigWithScreen>();
  screens.forEach(({ screen, annotations: items }) => {
    items.forEach(annotation => annotations.set(`${screen.id}/${annotation.refId}`, {
      ...annotation, screen, stepNumber: ''
    }));
  });
  const destination = (annotation: IAnnotationConfigWithScreen, type: 'prev' | 'next'): string | undefined => {
    const hotspot = annotation.buttons?.find(button => button.type === type)?.hotspot;
    if (!hotspot || hotspot.actionType === 'open') return undefined;
    const value = hotspot.actionValue?._val;
    return typeof value === 'string' && annotations.has(value) ? value : undefined;
  };
  const visited = new Set<string>();
  const timeline: Timeline = [];
  const appendPath = (start: string): void => {
    const path: IAnnotationConfigWithScreen[] = [];
    let current: string | undefined = start;
    while (current && !visited.has(current)) {
      const annotation = annotations.get(current);
      if (!annotation) break;
      visited.add(current);
      path.push(annotation);
      current = destination(annotation, 'next');
    }
    if (path.length) timeline.push(path);
  };
  // Preserve ordinary start-to-end ordering, then expose disconnected/cyclic steps for repair.
  annotations.forEach((annotation, key) => {
    if (!destination(annotation, 'prev')) appendPath(key);
  });
  annotations.forEach((_, key) => appendPath(key));
  return timeline;
}
