import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Button as Btn, Dropdown } from 'antd';

export const NoScreenMsgCon = styled.div`
`;

export const TxtCon = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

export const TopCon = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 5rem;
`;

export const OptionsCon = styled.div`
  min-width: fit-content;
  display: flex;
  align-items: center;
  color: #333;

  & > *:not(:last-child) {
    margin-right: 1rem;
  }
`;

export const DropdownBtn = styled(Dropdown)`
  padding: 0rem 0.5rem;
  border: 1px solid #ddd;

  & > * {
    font-size: 0.9rem;

    &:hover {
      color: #333;
    }
  }
`;

export const DropdownCon = styled.div`
  span:first-child {
    font-weight: 500;
  }
  & > *:not(:last-child) {
    margin-right: 0.5rem;
  }
`;

export const LayoutBtn = styled.div`
  cursor: pointer;
  border: 1px solid #ddd;
  height: 1.8rem;
  width: 1.8rem;
  display: grid;
  place-content: center;

  span {
    font-size: 1.4rem;
    color: #ddd;
  }
`;

export const ScreenCardsCon = styled.div`
  margin: 1rem 0;
  display: flex;
  background: #fafafa;
  padding: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
`;

export const ScreenEmptyCon = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  margin: 1rem 0;
  border-radius: 4px;
  text-align: center;
  height: 100%;
  padding: 1rem 4rem;
  min-height: calc(100vh - 200px);

  & > * {
    max-width: 50rem;

    &:not(:last-child) {
      margin-bottom: 1.2rem;
    }
  }

  img {
    width: 22rem;
  }
`;

export const CardCon = styled(Link)`
  padding: 0.5rem;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  width: 255px;
  margin-right: 1rem;
  margin-bottom: 1rem;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  color: #16023e;
  text-decoration: none;

  &.multi {
    margin-right: 2rem;
    margin-bottom: 2rem;
    box-shadow: 6px 6px 0 0 #ffffff, 6px 6px 0 1px #dddddd, 12px 12px 0 0 #fff, 12px 12px 0 1px #dddddd;

    &:hover {
      box-shadow: 4px 4px 0 0 #ffffff, 4px 4px 0 1px ${(props) => props.theme.colors.light.selection.background},
        8px 8px 0px 0px #fff, 8px 8px 0px 1px ${(props) => props.theme.colors.light.selection.background};
    }
  }

  &:hover {
    border: 1px solid ${(props) => props.theme.colors.light.selection.background};
    cursor: pointer;
    text-decoration: none;
    color: #16023e;
  }
`;

export const CardImg = styled.img`
  box-shadow: 0px 0px 2px 1px #ddd;
  border-radius: 4px;
  height: 144px;
  object-fit: cover;
`;

export const CardFlexColCon = styled.div`
  display: flex;
  flex-direction: column;
`;

export const CardFlexRowCon = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const CardIconLg = styled.img`
  height: 24px;
  width: 24px;
`;

export const CardIconMd = styled.img`
  height: 12px;
  width: 12px;
  margin-right: 0.15rem;
`;

export const CardIconSm = styled.img`
  height: 8px;
  width: 8px;
  margin-right: 0.35rem;
`;

export const MultiScreenChooserLineItem = styled(Link)`
  display: flex;
  align-items: center;
  padding: 1rem 0.75rem;
  border-radius: 6px;
  font-size: 1.15rem;
  color: #16023e;
  text-decoration: none;

  &:hover {
    box-shadow: 0 0 0 1px #16023e;
    cursor: pointer;
    color: #16023e;
    text-decoration: none;
  }

  &.no-hovr:hover {
    box-shadow: none;
    cursor: default;
    text-decoration: none;
  }

  .ent {
    display: flex;
    align-items: center;
  }

  .mark-tour {
    background: #d0d0ff;
    margin: 0 0.5rem;
    border-radius: 20px;
    padding: 0 0.85rem 0 0.45rem;
  }

  .mark-new {
    border: 1px solid #16023e;
    margin: 0 0.5rem;
    border-radius: 20px;
    padding: 0 0.85rem 0 0.45rem;
  }
`;

export const EditScreenBtn = styled(Btn)`
  width: 20rem;
  font-size: 1.2rem;
  padding: 1.6rem 1rem;
  display: grid;
  place-content: center;
  font-weight: 700;
  border-radius: 10px;
  background-color: #7567FF;
  color: #fff;
  
  &:hover {
    color: #fff !important;
  }
`;
