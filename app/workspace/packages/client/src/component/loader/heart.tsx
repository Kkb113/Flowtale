import React from 'react';
import './heart.css';

interface Props { }

export default function Loader(props: Props) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
    >
      <div className="fab-heart-loader">
        <div />
      </div>
    </div>
  );
}
