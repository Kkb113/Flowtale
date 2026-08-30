import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Button from '../../../button';
import { P_RespDemoHub } from '../../../../types';

interface Props {
    demoHub:P_RespDemoHub;
    isPublishing:boolean;
    setIsPublishing: (isPublishing: boolean) => void;
    setIsPublishFailed: (isPublishing: boolean) => void;
    openModal:() => void;
    publishDemoHub : (demoHub: P_RespDemoHub) => Promise<boolean>;
    disabled?: boolean;
    size?: 'medium' | 'large';
    minWidth?: string;
}

function PublishDemoBtn(props : Props) : JSX.Element {
  const [buttonTitle, setButtonTitle] = useState('Publish');

  const handleClick = async (): Promise<void> => {
    props.setIsPublishing(true);
    props.setIsPublishFailed(false);
    props.openModal();

    const res = await props.publishDemoHub(props.demoHub);
    props.setIsPublishing(false);

    if (!res) {
      props.setIsPublishFailed(true);
    }
  };
  useEffect(() => {
    if (props.isPublishing) {
      setButtonTitle('Publishing...');
    } else {
      setButtonTitle('Publish');
    }
  }, [props.isPublishing]);
  return (
    <Button
      size={props.size || 'large'}
      disabled={props.disabled || !props.demoHub}
      onClick={handleClick}
      style={
        {
          height: '30px',
          paddingLeft: '1.2rem',
          paddingRight: '1.2rem',
          minWidth: props.minWidth || '240px'
        }
    }
    >
      {buttonTitle}
    </Button>
  );
}

export default PublishDemoBtn;
