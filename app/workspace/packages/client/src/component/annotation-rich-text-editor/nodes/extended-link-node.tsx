/* eslint-disable class-methods-use-this */

import {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
} from 'lexical';
import { LinkNode, SerializedLinkNode } from '@lexical/link';
import { commonExportDOMOverride } from '../utils/extented-link-node-utils';

function convertExtendedLinkElement(domNode: HTMLElement): DOMConversionOutput | null {
  const options = domNode.getAttribute('data-extended-link-node-data');
  if (options !== null && options !== undefined) {
    const node = $createExtendedLinkNode(options);
    return { node };
  }
  return null;
}

export class ExtendedLinkNode extends LinkNode {
  static getType(): string {
    return 'extended-link';
  }

  static clone(node: ExtendedLinkNode): ExtendedLinkNode {
    return new ExtendedLinkNode(node.getURL());
  }

  static importJSON(serializedNode: SerializedLinkNode): ExtendedLinkNode {
    const node = $createExtendedLinkNode(serializedNode.url);
    return node;
  }

  exportJSON(): SerializedLinkNode {
    const json = super.exportJSON();
    return {
      ...json,
      type: 'extended-link',
      version: 1,
    };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-extended-link-node-data')) {
          return null;
        }

        return {
          conversion: convertExtendedLinkElement,
          priority: 2,
        };
      },
    };
  }

  exportDOM(): DOMExportOutput {
    return commonExportDOMOverride(this.getURL());
  }

  createDOM(): HTMLAnchorElement {
    const elem = document.createElement('a');
    elem.href = this.getURL();
    return elem;
  }

  updateDOM(): boolean {
    return false;
  }
}

export function $createExtendedLinkNode(url: string): ExtendedLinkNode {
  return new ExtendedLinkNode(url);
}

export function $isExtendedLinkNode(
  node: LexicalNode | null | undefined,
): node is ExtendedLinkNode {
  return node instanceof ExtendedLinkNode;
}
