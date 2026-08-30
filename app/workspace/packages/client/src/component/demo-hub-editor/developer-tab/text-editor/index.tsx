import React from 'react';
import * as Tags from './styled';
import { useEditorCtx } from '../../ctx';

interface Props {
    onFocusEvent : () => void
    changeHandler : (value : string) => void;
    value : string
}

function TextEditor(props : Props) : JSX.Element {
  return (
    <div>
      <Tags.EditorCon>
        <textarea
          onFocus={() => {
            props.onFocusEvent();
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          wrap="off"
          value={props.value}
          onChange={(e) => props.changeHandler(e.target.value)}
        />
      </Tags.EditorCon>
    </div>
  );
}

export default TextEditor;
