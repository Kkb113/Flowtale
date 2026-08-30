import React from 'react';
import * as Tags from './styled';

interface Props {
  bgColor: string;
}

function SoundWavePlaceholder(props: Props): JSX.Element {
  return (
    <Tags.SoundWavePlaceholderCon bgColor={props.bgColor}>
      <div className="box box1" />
      <div className="box box2" />
      <div className="box box3" />
      <div className="box box4" />
      <div className="box box5" />
    </Tags.SoundWavePlaceholderCon>
  );
}

export default SoundWavePlaceholder;
