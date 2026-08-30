import { SCREEN_DIFFS_SUPPORTED_VERSION, SCREEN_EDITOR_ID } from '../../constants';

export function scrollIframeEls(version: string, doc: Document): Promise<void> {
  return new Promise((resolve, reject) => {
    switch (version) {
      case SCREEN_DIFFS_SUPPORTED_VERSION:
      case '2023-01-10': {
        // Apply original scroll positins to elements
        const allDocEls = doc.querySelectorAll('*');
        for (let i = 0; i < allDocEls.length; i++) {
          const el = allDocEls[i];
          if (el.nodeName.toLowerCase() === 'iframe') {
            const iframeEl = el as HTMLIFrameElement;
            const contentDoc = iframeEl.contentDocument;
            if (contentDoc) scrollIframeEls(version, iframeEl.contentDocument);
          }
          const scrollTopFactor = allDocEls[i].getAttribute('fable-stf') || '0';
          const scrollLeftFactor = allDocEls[i].getAttribute('fable-slf') || '0';
          const scrollTop = calculateScrollTopFromScrollFactor(scrollTopFactor, el);
          const scrollLeft = calculateScrollLeftFromScrollFactor(scrollLeftFactor, el);
          el.scroll({ top: scrollTop, left: scrollLeft });
        }
        break;
      }

      default:
        break;
    }
    setTimeout(() => resolve(), 0);
  });
}

function calculateScrollTopFromScrollFactor(scrollFactor: string, el: Element): number {
  return parseFloat(scrollFactor) * (el.scrollHeight - el.clientHeight);
}

function calculateScrollLeftFromScrollFactor(scrollFactor: string, el: Element): number {
  return parseFloat(scrollFactor) * (el.scrollWidth - el.clientWidth);
}

export function isLinkButtonInViewport(buttonId: string): boolean {
  const showButton = document.getElementById(buttonId);
  const editorialModal = document.getElementById(SCREEN_EDITOR_ID);
  if (!showButton || !editorialModal) return true;

  const sbBoundingRect = showButton.getBoundingClientRect();
  if (sbBoundingRect.bottom > window.innerHeight - 10) {
    return false;
  }

  const emBoundingRect = editorialModal.getBoundingClientRect();
  if (emBoundingRect.top > sbBoundingRect.top) {
    return false;
  }
  return true;
}

export function calculatePopoverPlacement(buttonId: string): 'leftBottom' | 'left' | 'leftTop' {
  const showButton = document.getElementById(buttonId);
  const editorialModal = document.getElementById(SCREEN_EDITOR_ID);
  if (!showButton || !editorialModal) return 'leftBottom';
  const sbBoundingRect = showButton.getBoundingClientRect();
  const emBoundingRect = editorialModal.getBoundingClientRect();
  if (sbBoundingRect.top < emBoundingRect.top + emBoundingRect.height / 3) {
    return 'leftTop';
  }
  if (sbBoundingRect.top < emBoundingRect.top + emBoundingRect.height / 2) {
    return 'left';
  }
  return 'leftBottom';
}
