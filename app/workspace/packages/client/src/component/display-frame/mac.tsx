import React from 'react';
import styled from 'styled-components';

interface Props {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export default function MacFrame(props: Props) {
  return (
    <CardCon style={props.style}>
      <div className="tools">
        <div className="circle">
          <span className="red box" />
        </div>
        <div className="circle">
          <span className="yellow box" />
        </div>
        <div className="circle">
          <span className="green box" />
        </div>
      </div>
      <div className="card__content">
        {props.children}
      </div>
    </CardCon>
  );
}

export const CardCon = styled.div`
  margin: 0 auto;
  background-color: #F8FBFE;
  border-radius: 8px;
  z-index: 1;
  box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px;

  .tools {
    display: flex;
    align-items: center;
    padding: 9px;
  }

  .circle {
    padding: 0 4px;
  }

  .box {
    display: inline-block;
    align-items: center;
    width: 10px;
    height: 10px;
    padding: 1px;
    border-radius: 50%;
  }

  .red {
    background-color: #ff605c;
  }

  .yellow {
    background-color: #ffbd44;
  }

  .green {
    background-color: #00ca4e;
  }

  .card__content {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    height: calc(100% - 40px);
  }
`;
