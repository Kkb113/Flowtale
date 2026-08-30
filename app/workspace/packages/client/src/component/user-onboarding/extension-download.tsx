import React, { useEffect } from 'react';
import { Button as AntdBtn } from 'antd';
import { ChromeFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Button from '../button';

interface Props {
}

export default function ExtensionDownload(props: Props): JSX.Element {
  const navigate = useNavigate();

  const handleSkip = (): void => {
    navigate('/demos', { replace: true });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(480px - 4rem)',
        marginTop: '36px',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '5rem',
      }}
    >
      <div
        className="typ-h1"
        style={{
          fontWeight: 600
        }}
      >Create stunning interactive demos in 5 mins
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '2rem'
        }}
      >
        <div className="type-reg">
          Download Fable's chrome extension to
          create stunning interactive demo in 5 mins.
        </div>
        <a
          href="https://chromewebstore.google.com/detail/fable-create-step-by-step/ekmabenadlgfkjplmpldkjkhiikobaoc"
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <Button><ChromeFilled /> Download Fable's extension</Button>
        </a>
      </div>
      <AntdBtn
        type="link"
        onClick={handleSkip}
        style={{
          color: 'gray'
        }}
      >
        Skip
      </AntdBtn>

    </div>
  );
}
