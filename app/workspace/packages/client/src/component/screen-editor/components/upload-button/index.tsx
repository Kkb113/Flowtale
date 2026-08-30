import React from 'react';
import { CloudUploadOutlined } from '@ant-design/icons';
import * as Tags from './styled';

interface Props {
  accept: string;
  onChange: (...args: any[]) => void;
}

export default function UploadButton({ accept, onChange }: Props): JSX.Element {
  return (
    <Tags.ImgUploadLabel>
      <CloudUploadOutlined />
      Click to upload
      <input
        style={{ display: 'none' }}
        onChange={onChange}
        type="file"
        accept={accept}
      />
    </Tags.ImgUploadLabel>
  );
}
