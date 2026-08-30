import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import FableLogo from '../../assets/fable_logo_light_bg.png';
import Button from '../button';

export interface InfoBtn {
  linkTo?: string;
  onClick?: () => void;
  text: string;
  type: 'primary' | 'secondary';
}

interface IOwnProps {
  heading: string;
  body: ReactNode;
  btns: Array<InfoBtn>
}

export default function infoCon(props: IOwnProps): JSX.Element {
  return (
    <InfoCon>
      <img
        src={FableLogo}
        alt="fable-logo"
        style={{
          height: '2rem',
          marginBottom: '2rem',
        }}
      />
      <div className="title">{props.heading} </div>
      <div className="description-con">{props.body}</div>
      <div className="btn-con">
        {props.btns.map((btn, i) => {
          if (!btn) return <></>;
          if (btn.linkTo) {
            return (
              <Link
                key={i}
                to={btn.linkTo}
                className="link"
              >
                <Button style={{ width: '100%' }} intent={btn.type}>{btn.text}</Button>
              </Link>
            );
          }
          if (btn.onClick) {
            return (
              <Button
                key={i}
                style={{ width: '100%' }}
                intent={btn.type}
                onMouseUp={btn.onClick}
              >
                {btn.text}
              </Button>
            );
          }
          return <></>;
        })}
      </div>
    </InfoCon>

  );
}

const InfoCon = styled.div`
  border-radius: 16px;
  box-shadow: 0 0 2px 0px gray;
  width: 375px;
  padding: 2rem 1.2rem;
  transform: translate(-50%, -50%);
  top: 50%;
  left: 50%;
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;

  .title {
    text-align: center;
    font-weight: 600;
    font-size: 1.5rem;
    line-height: 1.25rem;
    color: #16023E;
  }

  .description-con {
    background: rgba(236, 235, 244, 0.49);
    border-radius: 8px;
    padding: 1rem;
    color: #16023E;
    line-height: 1.5rem;
    font-size: 1rem;
    text-align: left;
    margin: 1rem 0;
  }

  .link {
    text-decoration: none;
    width: 100%;
  }

  .btn-con {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }
`;
