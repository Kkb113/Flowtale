import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { BLUR_COMMAND, COMMAND_PRIORITY_EDITOR } from 'lexical';
import { useEffect } from 'react';
import { $generateHtmlFromNodes } from '@lexical/html';
import { $rootTextContent } from '@lexical/text';
import { amplitudeAnnotationEdited } from '../../../amplitude';

export function EditorBlurPlugin({ updatedText }: {updatedText : string}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => editor.registerCommand(
    BLUR_COMMAND,
    (payload) => {
      if ($generateHtmlFromNodes(editor) !== updatedText) {
        amplitudeAnnotationEdited('text', $rootTextContent());
      }
      return true;
    },
    COMMAND_PRIORITY_EDITOR
    // COMMAND_PRIORITY_HIGH
  ), [editor]);

  return null;
}
