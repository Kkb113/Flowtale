/* eslint-disable class-methods-use-this */

import {
  DOMExportOutput,
  LexicalNode,
} from 'lexical';
import { AutoLinkNode, SerializedAutoLinkNode } from '@lexical/link';
import { commonExportDOMOverride } from '../utils/extented-link-node-utils';

export class ExtendedAutoLinkNode extends AutoLinkNode {
  static getType(): string {
    return 'extended-auto-link';
  }

  static clone(node: ExtendedAutoLinkNode): ExtendedAutoLinkNode {
    return new ExtendedAutoLinkNode(node.getURL());
  }

  static importJSON(serializedNode: SerializedAutoLinkNode): ExtendedAutoLinkNode {
    const node = $createExtendedAutoLinkNode(serializedNode.url);
    return node;
  }

  exportJSON(): SerializedAutoLinkNode {
    const json = super.exportJSON();
    return {
      ...json,
      type: 'extended-auto-link',
      version: 1,
    };
  }

  static importDOM(): null {
    return null;
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

export function $createExtendedAutoLinkNode(url: string): ExtendedAutoLinkNode {
  return new ExtendedAutoLinkNode(url);
}

export function $isExtendedAutoLinkNode(
  node: LexicalNode | null | undefined,
): node is ExtendedAutoLinkNode {
  return node instanceof ExtendedAutoLinkNode;
}
