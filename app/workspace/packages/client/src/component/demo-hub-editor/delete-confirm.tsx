import React from 'react';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Modal } from 'antd';

const { confirm } = Modal;

export const showDeleteConfirm = (
  onDelete: () => void,
  title: string,
  content: React.ReactNode = '',
): void => {
  confirm({
    title,
    icon: <ExclamationCircleOutlined />,
    okText: 'Delete',
    okType: 'danger',
    onOk: () => {
      onDelete();
    },
    content,
  });
};
