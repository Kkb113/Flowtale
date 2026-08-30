import React, { ReactNode, useState } from 'react';
import styled from 'styled-components';

const LinkCon = styled.div`
  .l-title {
    font-weight: 500;
    cursor: pointer;

    span {
      border-bottom: 2px solid transparent;

      &:hover, &.sel {
        border-bottom: 2px solid #7568ff;
      }
    }
  }

  .l-body {
    margin-left: 0.5rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    border-left: 1px solid #eaeaea;
  }
`;

interface IProps {
  title: ReactNode | string;
  body: ReactNode;
  gap?: string;
}

export default function Tabs(props: IProps): JSX.Element {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <LinkCon
      style={{
        marginTop: props.gap
      }}
    >
      <div
        className="l-title"
        onMouseUp={() => setShowDetails(!showDetails)}
      >
        <div className={showDetails ? 'sel' : ''}>{props.title}</div>
      </div>
      {showDetails && (
        <div className="l-body">
          {props.body}
        </div>
      )}
    </LinkCon>
  );
}
