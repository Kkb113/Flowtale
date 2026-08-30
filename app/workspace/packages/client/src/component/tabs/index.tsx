import React, { ReactNode, useEffect, useState } from 'react';
import styled from 'styled-components';

const TabsCon = styled.div`
  .head-con {
    display: flex;
    gap: 1.25rem;
    font-weight: 500;
    border-bottom: 1px solid #EEEEEE;
    cursor: pointer;
    font-size: 1rem;
  }

  .head-item {
    padding: 0.25rem 0;
  }

  .sel {
    border-bottom: 2px solid #7568ff;
  }

  .body-con {
    margin: 1rem 0;
  }
`;

interface IProps {
  items: Array<{
    head: ReactNode | string,
    body: ReactNode | string,
    key: number;
  }>;
  defaultActiveKey: number;
}

export default function Tabs(props: IProps): JSX.Element {
  const [activeKey, setActiveKey] = useState(-1);
  useEffect(() => {
    setActiveKey(props.defaultActiveKey);
  }, [props.defaultActiveKey]);

  return (
    <TabsCon>
      <div className="head-con">
        {props.items.map(item => (
          <div
            key={item.key}
            className={`head-item ${item.key === activeKey ? 'sel' : ''}`}
            onMouseUp={() => setActiveKey(item.key)}
          >
            {item.head}
          </div>
        ))}
      </div>
      <div className="body-con">
        {props.items.map(item => (item.key === activeKey
          ? <div className="body-item" key={item.key}>{item.body}</div>
          : undefined
        ))}
      </div>
    </TabsCon>
  );
}
