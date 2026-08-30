import React, { useState } from 'react';
import { ArrowRightOutlined, RightOutlined } from '@ant-design/icons';
import { openProductUrl } from '../../utils';
import Input from '../input';
import * as Tags from './styled';
import Button from '../button';

export default function ProductUrlInput(): JSX.Element {
  const [url, setUrl] = useState('');
  return (
    <Tags.OpenUrlContainer>
      <Input
        value={url}
        label="Enter product url"
        containerStyle={{
          fontSize: '1rem',
          flex: '1 0 auto'
        }}
        onChange={(e) => {
          setUrl(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && url.trim()) {
            openProductUrl(url);
          }
        }}
      />
      <Button
        onClick={() => openProductUrl(url)}
        intent="primary"
        size="small"
        style={{
          padding: '0.5rem'
        }}
      >
        <ArrowRightOutlined />
      </Button>
    </Tags.OpenUrlContainer>
  );
}
