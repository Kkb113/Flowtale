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
import { getSerNodesElPathFromFids } from '../../../utils';
import { EMPTY_EL_PATH } from '../../../constants';
import { redactSerializedNode, setElementRedacted } from './redaction';

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
      setElementRedacted(el, isShowEdits && (tEncoding[IdxEncodingTypeBlur.NEW_BLUR_VALUE] || 0) > 0);
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

      setElementRedacted(
        el,
        isShowEdits && tEncoding[IdxEncodingTypeMask.NEW_STYLE] != null,
        tEncoding[IdxEncodingTypeMask.NEW_STYLE] || ''
      );

      break;
    }

    default:
      break;
  }
};

export const getSerNodeFromPath = (path: string, docTree: SerNode): SerNode | undefined => {
  const pathArray = path.split('.');
  if (pathArray[0] !== '1') return undefined;
  let serNode: SerNode | undefined = docTree;

  if (path === '1') return serNode;

  for (const id of pathArray.slice(1)) {
    if (!/^\d+$/.test(id)) return undefined;
    serNode = serNode?.chldrn[+id];
  }

  return serNode;
};

export const applyEditsToSerDom = (allEdits: EditItem[], screenData: ScreenData, authoring = false): ScreenData => {
  const mem: Record<string, SerNode> = {};
  const redactions: { node: SerNode; rect?: { width: number; height: number }; hidden: boolean; maskStyle?: string }[] = [];
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
      const resolved = getSerNodeFromPath(path, screenData.docTree);
      if (!resolved) continue;
      node = resolved;
      mem[path] = node;
    }

    if (edit[IdxEditItem.TYPE] === ElEditType.Text) {
      const txtEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeText;
      if (node.type === Node.TEXT_NODE) {
        node.props.textContent = txtEncodingVal[IdxEncodingTypeText.NEW_VALUE];
        continue;
      }
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
      const value = inputEncodingVal[IdxEncodingTypeInput.NEW_VALUE] ?? '';
      node.attrs.value = value;
      node.props.nodeProps = { ...node.props.nodeProps, value };
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
      if ((blurEncodingVal[IdxEncodingTypeBlur.NEW_BLUR_VALUE] || 0) > 0) {
        redactions.push({ node, rect: blurEncodingVal[IdxEncodingTypeBlur.REDACTION_RECT], hidden: false });
      }
    }

    if (edit[IdxEditItem.TYPE] === ElEditType.Display) {
      const dispEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeDisplay;

      const originalStyleAttrs = node.attrs.style;
      node.attrs.style = `${originalStyleAttrs || ''};
        display: ${dispEncodingVal[IdxEncodingTypeDisplay.NEW_VALUE]!};
      `;
      if (dispEncodingVal[IdxEncodingTypeDisplay.NEW_VALUE]?.trim().toLowerCase() === 'none') {
        redactions.push({ node, hidden: true });
      }
    }

    if (edit[IdxEditItem.TYPE] === ElEditType.Mask) {
      const maskEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeMask;
      const maskStyled = maskEncodingVal[IdxEncodingTypeMask.NEW_STYLE]!;

      if (maskStyled !== null && maskStyled !== undefined) redactions.push({ node, hidden: false, maskStyle: maskStyled });
    }
  }

  for (const { node, rect, hidden, maskStyle } of redactions) {
    if (authoring && !hidden) {
      node.attrs['data-fable-pending-redaction'] = 'true';
      if (maskStyle) node.attrs['data-fable-pending-mask'] = maskStyle;
    } else if (!authoring) redactSerializedNode(node, rect || node.props.rect, hidden, maskStyle);
  }

  return screenData;
};
