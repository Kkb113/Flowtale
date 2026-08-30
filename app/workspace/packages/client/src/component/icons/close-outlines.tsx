import React from 'react';

interface Props {
  color?: string;
  bgColor?: string;
}

function CloseOutlined(props: Props): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      style={{ backgroundColor: `${props.bgColor || 'transparent'}` }}
    >
      <path
        d="M21.5893 8.45703L15.932 14.113L10.276 8.45703L8.39062
            10.3424L14.0466 15.9984L8.39062 21.6544L10.276 23.5397L15.932
            17.8837L21.5893 23.5397L23.4746 21.6544L17.8186 15.9984L23.4746 10.3424L21.5893 8.45703Z"
        fill={`${props.color || '#808080'}`}
      />
    </svg>
  );
}

export default CloseOutlined;
