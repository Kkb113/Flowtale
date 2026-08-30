import React from 'react';
import { EntryProps } from '../type';
import BaseEntry from './base-entry';

interface Props extends EntryProps {
  isVisible: boolean;
}

function TextEntry(props: Props): JSX.Element {
  return (
    <BaseEntry
      entryBaseData={props.entryData}
      isVisible={props.isVisible}
      hideContinue={props.isLast}
      hideSkip={props.isLast}
      goToNext={props.goToNext}
      onSkip={props.onSkip}
      hideEndCTA={!props.isLast}
    >
      <div />
    </BaseEntry>
  );
}

export default TextEntry;
