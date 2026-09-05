import { addPointerEventsAutoToEl } from '../../../../utils';
import { Update } from './types';
import { isSafeCaptureAttribute, sanitizeCapturedHtml } from '../captured-content-security';

export const applyFadeInTransitionToNode = (node: Node, originialOpacity: string): void => {
  if (node.nodeType === 1) {
    const element = node as HTMLElement;
    element.style.opacity = '0';
    element.style.transition = 'opacity 0.3s ease-out';
    const timer = setTimeout(() => {
      element.style.opacity = originialOpacity;
      clearTimeout(timer);
    }, 300);
  }
};

export function applyUpdateDiff(updates: Update[], el: Node): void {
  if (el && el.nodeType === Node.ELEMENT_NODE) {
    updates.forEach(update => {
      const tag = (el as Element).tagName.toLowerCase();
      const key = update.attrKey.toLowerCase();
      if (!isSafeCaptureAttribute(tag, key, update.attrNewVal || '')) return;
      if (tag === 'iframe' && ['sandbox', 'allow', 'referrerpolicy', 'src'].includes(key)) return;
      let value = update.attrNewVal;
      if (key === 'style' && !update.shouldRemove) {
        const allStyles = update.attrNewVal.split(';').filter(prop => !prop.match(/\s*transition/));
        value = allStyles.join(' ; ');
      }
      if (update.shouldRemove) {
        (el as Element).removeAttribute(update.attrKey);
      } else {
        if (tag === 'iframe' && key === 'srcdoc') {
          value = sanitizeCapturedHtml(value);
        }
        (el as Element).setAttribute(update.attrKey, value);
      }
    });
    (el as HTMLElement).style.transition = 'all 0.3s ease-out';
    if (el.nodeName.toLowerCase() === 'body') {
      addPointerEventsAutoToEl(el as HTMLBodyElement);
    }
  }
}
