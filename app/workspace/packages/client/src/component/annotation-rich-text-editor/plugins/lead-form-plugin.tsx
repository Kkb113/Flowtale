import * as React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister, $wrapNodeInElement } from '@lexical/utils';
import {
  $createParagraphNode,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';
import { useEffect } from 'react';
import {
  $createLeadFormNode,
  createLeadFormOption,
  LeadFormNode,
} from '../nodes/lead-form-node';
import { CHANGE_LEAD_FORM_PRIMARY_KEY_COMMAND, INSERT_LEAD_FORM_COMMAND } from './toolbar-plugin';
import { LEAD_FORM_FIELDS, LeadFormPropertyType } from '../nodes/lead-form-component';

interface Props {
  lfPkf: string;
  updatePrimaryKey: (primaryKey: string) => void;
}

export default function LeadFormPlugin(props: Props): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([LeadFormNode])) {
      throw new Error('LeadFormPlugin: LeadFormNode not registered on editor');
    }

    const unregister = mergeRegister(
      editor.registerCommand<string>(
        INSERT_LEAD_FORM_COMMAND,
        (payload) => {
          const emailField = LEAD_FORM_FIELDS.find(field => field.type === 'email')!;

          const leadFormNode = $createLeadFormNode([
            createLeadFormOption(
              emailField.placeholder,
              emailField.type,
              emailField.autocompleteType,
              props.lfPkf === 'email' ? LeadFormPropertyType.PrimaryKey : LeadFormPropertyType.None,
            ),
          ]);

          $insertNodes([leadFormNode]);

          if ($isRootOrShadowRoot(leadFormNode.getParentOrThrow())) {
            $wrapNodeInElement(leadFormNode, $createParagraphNode).selectEnd();
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<string>(
        CHANGE_LEAD_FORM_PRIMARY_KEY_COMMAND,
        (pkField) => {
          props.updatePrimaryKey(pkField);

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      )
    );

    return () => {
      unregister();
    };
  }, [editor]);

  return null;
}
