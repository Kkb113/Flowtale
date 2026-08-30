import { SerNode } from '@fable/common/dist/types';

export const hideChildren = (el: HTMLElement): void => {
  Array.from(el.children).forEach(child => {
    const originalStyleAttrs = child.getAttribute('style');
    child.setAttribute(
      'style',
      `${originalStyleAttrs || ''}
      visibility: hidden !important;`
    );
  });
};

export const hideChildrenInSerDom = (node: SerNode): void => {
  node.chldrn.forEach(child => {
    const originalStyleAttrs = child.attrs.style;
    child.attrs.style = `
    ${originalStyleAttrs || ''};
    visibility: hidden !important;
    `;
  });
};

export const unhideChildren = (el: HTMLElement): void => {
  Array.from(el.children).forEach(child => {
    const newStyleAttrs = child.getAttribute('style')?.replace('visibility: hidden !important;', '') || '';
    child.setAttribute('style', newStyleAttrs);
  });
};

export const addImgMask = (el: HTMLElement, resizedImgSrc: string, originalImgSrc: string): string => {
  const originalStyleAttrs = el.getAttribute('style');
  const maskStyles = `${originalStyleAttrs || ''};
  background-image: url(${resizedImgSrc}), url(${originalImgSrc}) !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  background-size: cover !important;
  `;

  el.setAttribute(
    'style',
    maskStyles
  );

  return maskStyles;
};

type HTMLTagNames = keyof HTMLElementTagNameMap;

export const restrictCrtlType = (el: HTMLElement, elType: HTMLTagNames[]): boolean => {
  const nodeName = el.nodeName.toLowerCase();
  return !elType.includes(nodeName as HTMLTagNames);
};
