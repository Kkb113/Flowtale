import React from 'react';

interface Props {
    dir: 'up' | 'down';
    color?: string;
}

function CaretOutlined(props: Props): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="8"
      viewBox="0 0 14 8"
      fill="none"
      style={{ transform: `${props.dir === 'up' ? 'rotate(180deg)' : 'none'}` }}
    >
      <path
        d="M13 1L7 7L1 1"
        stroke={props.color || '#16023E'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CaretOutlined;
