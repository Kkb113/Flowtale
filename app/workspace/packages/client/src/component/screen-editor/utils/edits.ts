import { ScreenData, SerNode } from '@fable/common/dist/types';
import { nanoid } from 'nanoid';
import {
  EditItem,
  EditValueEncoding,
  ElEditType,
  ElIdentifierType,
  EncodingTypeBlur,
  EncodingTypeDisplay,
  EncodingTypeImage,
  EncodingTypeInput,
  EncodingTypeInputValue,
  EncodingTypeMask,
  EncodingTypeText,
  IdxEditEncodingText,
  IdxEditItem,
  IdxEncodingTypeBlur,
  IdxEncodingTypeDisplay,
  IdxEncodingTypeImage,
  IdxEncodingTypeInput,
  IdxEncodingTypeMask,
  IdxEncodingTypeText
} from '../../../types';
import { hideChildren, hideChildrenInSerDom, unhideChildren } from './creator-actions';
import { getSerNodesElPathFromFids } from '../../../utils';
import { EMPTY_EL_PATH } from '../../../constants';

export const showOrHideEditsFromEl = (e: EditItem, isShowEdits: boolean, el: HTMLElement): void => {
  if (el.dataset.deleted === 'true') return;
  const encoding = e[IdxEditItem.ENCODING];
  const elType = e[IdxEditItem.TYPE];

  switch (elType) {
    case ElEditType.Text: {
      const tEncoding = encoding as EditValueEncoding[ElEditType.Text];
      el.textContent = isShowEdits
        ? tEncoding[IdxEditEncodingText.NEW_VALUE]
        : tEncoding[IdxEditEncodingText.OLD_VALUE];
      break;
    }

    case ElEditType.Input: {
      const tEncoding = encoding as EditValueEncoding[ElEditType.Input];
      (el as HTMLInputElement).placeholder = (isShowEdits
        ? tEncoding[IdxEncodingTypeInput.NEW_VALUE]
        : tEncoding[IdxEncodingTypeInput.OLD_VALUE])!;
      break;
    }

    case ElEditType.InputValue: {
      const tEncoding = encoding as EditValueEncoding[ElEditType.InputValue];
      (el as HTMLInputElement).value = (isShowEdits
        ? tEncoding[IdxEncodingTypeInput.NEW_VALUE]
        : tEncoding[IdxEncodingTypeInput.OLD_VALUE])!;
      break;
    }

    case ElEditType.Image: {
      const tEncoding = encoding as EditValueEncoding[ElEditType.Image];

      if (isShowEdits) {
        (el as HTMLImageElement).setAttribute(
          'style',
          ` height: ${encoding[IdxEncodingTypeImage.HEIGHT]} !important; 
              width: ${encoding[IdxEncodingTypeImage.WIDTH]} !important; 
              object-fit: cover !important;
            `
        );
        (el as HTMLImageElement).src = tEncoding[IdxEncodingTypeImage.NEW_VALUE]!;
        (el as HTMLImageElement).srcset = tEncoding[IdxEncodingTypeImage.NEW_VALUE]!;
      } else {
        (el as HTMLImageElement).setAttribute(
          'style',
          ` height: ${encoding[IdxEncodingTypeImage.HEIGHT]} !important; 
              width: ${encoding[IdxEncodingTypeImage.WIDTH]} !important; 
            `
        );
        (el as HTMLImageElement).src = tEncoding[IdxEncodingTypeImage.OLD_VALUE]!;
        (el as HTMLImageElement).srcset = tEncoding[IdxEncodingTypeImage.OLD_VALUE]!;
      }

      break;
    }

    case ElEditType.Blur: {
      const tEncoding = encoding as EditValueEncoding[ElEditType.Blur];
      el.style.filter = isShowEdits
        ? tEncoding[IdxEncodingTypeBlur.NEW_FILTER_VALUE]!
        : tEncoding[IdxEncodingTypeBlur.OLD_FILTER_VALUE]!;
      break;
    }

    case ElEditType.Display: {
      const tEncoding = encoding as EditValueEncoding[ElEditType.Display];
      el.style.display = isShowEdits
        ? tEncoding[IdxEncodingTypeDisplay.NEW_VALUE]!
        : tEncoding[IdxEncodingTypeDisplay.OLD_VALUE]!;
      break;
    }

    case ElEditType.Mask: {
      const tEncoding = encoding as EditValueEncoding[ElEditType.Mask];

      if (isShowEdits) {
        el.setAttribute(
          'style',
          `${tEncoding[IdxEncodingTypeMask.NEW_STYLE]}`
        );

        hideChildren(el);
      } else {
        el.setAttribute(
          'style',
          `${tEncoding[IdxEncodingTypeMask.OLD_STYLE]}`
        );

        unhideChildren(el);
      }

      break;
    }

    default:
      break;
  }
};

export const getSerNodeFromPath = (path: string, docTree: SerNode): SerNode => {
  const pathArray = path.split('.');
  let serNode = docTree;

  if (path === '1') return serNode;

  for (const id of pathArray.slice(1)) {
    serNode = serNode.chldrn[+id];
  }

  return serNode;
};

export const applyEditsToSerDom = (allEdits: EditItem[], screenData: ScreenData): ScreenData => {
  const mem: Record<string, SerNode> = {};
  const fids: string[] = allEdits
    .filter(item => (
      item[IdxEditItem.FID]
      && (item[IdxEditItem.EL_IDENTIFIER_TYPE] === ElIdentifierType.FID)
      && item[IdxEditItem.PATH] === EMPTY_EL_PATH))
    .map(item => item[IdxEditItem.FID]!);
  const fidSerNodeMap = getSerNodesElPathFromFids(screenData.docTree, fids);

  for (const edit of allEdits) {
    const path = edit[IdxEditItem.PATH];
    let node: SerNode;
    if (path === EMPTY_EL_PATH) {
      const fid = edit[IdxEditItem.FID] || '-1';
      const item = fidSerNodeMap[fid];
      if (!item) {
        continue;
      }
      node = item.serNode;
    } else if (path in mem) {
      node = mem[path];
    } else {
      node = getSerNodeFromPath(path, screenData.docTree);
      mem[path] = node;
    }

    if (edit[IdxEditItem.TYPE] === ElEditType.Text) {
      const txtEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeText;
      node.chldrn = [];

      const commentSerNode: SerNode = {
        type: Node.COMMENT_NODE,
        name: '#comment',
        attrs: {},
        props: {
          proxyUrlMap: {},
          textContent: `textfid/${nanoid()}==ftext/${txtEncodingVal[IdxEncodingTypeText.NEW_VALUE]}`
        },
        chldrn: [],
        sv: 2
      };

      const textSerNode: SerNode = {
        type: Node.TEXT_NODE,
        name: '#text',
        attrs: {},
        props: {
          proxyUrlMap: {},
          textContent: txtEncodingVal[IdxEncodingTypeText.NEW_VALUE]
        },
        chldrn: [],
        sv: 2
      };

      node.chldrn.push(commentSerNode);
      node.chldrn.push(textSerNode);
    }

    if (edit[IdxEditItem.TYPE] === ElEditType.Input) {
      const inputEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeInput;
      node.attrs.placeholder = inputEncodingVal[IdxEncodingTypeInput.NEW_VALUE]!;
    }

    if (edit[IdxEditItem.TYPE] === ElEditType.InputValue) {
      const inputEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeInputValue;
      if (node.attrs.value) {
        node.attrs.value = inputEncodingVal[IdxEncodingTypeInput.NEW_VALUE]!;
      }
      if (node.props.nodeProps && node.props.nodeProps.value) {
        node.props.nodeProps.value = inputEncodingVal[IdxEncodingTypeInput.NEW_VALUE]!;
      }
    }

    if (edit[IdxEditItem.TYPE] === ElEditType.Image) {
      const imgEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeImage;

      node.attrs.src = imgEncodingVal[IdxEncodingTypeImage.NEW_VALUE]!;
      node.attrs.srcset = imgEncodingVal[IdxEncodingTypeImage.NEW_VALUE]!;

      const originalStyleAttrs = node.attrs.style;
      node.attrs.style = `${originalStyleAttrs || ''};
      height: ${imgEncodingVal[IdxEncodingTypeImage.HEIGHT]} !important;
      width: ${imgEncodingVal[IdxEncodingTypeImage.WIDTH]} !important;
      object-fit: cover !important;
      `;
    }

    if (edit[IdxEditItem.TYPE] === ElEditType.Blur) {
      const blurEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeBlur;

      const originalStyleAttrs = node.attrs.style;
      node.attrs.style = `${originalStyleAttrs || ''};
        filter: ${blurEncodingVal[IdxEncodingTypeBlur.NEW_FILTER_VALUE]!};
      `;
    }

    if (edit[IdxEditItem.TYPE] === ElEditType.Display) {
      const dispEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeDisplay;

      const originalStyleAttrs = node.attrs.style;
      node.attrs.style = `${originalStyleAttrs || ''};
        display: ${dispEncodingVal[IdxEncodingTypeDisplay.NEW_VALUE]!};
      `;
    }

    if (edit[IdxEditItem.TYPE] === ElEditType.Mask) {
      const maskEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeMask;
      const maskStyled = maskEncodingVal[IdxEncodingTypeMask.NEW_STYLE]!;

      hideChildrenInSerDom(node);
      node.attrs.style = maskStyled;
    }
  }

  return screenData;
};
