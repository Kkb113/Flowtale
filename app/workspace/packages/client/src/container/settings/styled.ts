import styled from 'styled-components';
import { Collapse } from 'antd';

export const Con = styled.div`
  margin: 2rem;

  .ant-tabs-tab-btn {
    color: #160245 !important;
  }

  .ant-tabs-ink-bar {
    background: #160245 !important;
  }
`;

export const ApiKeyTxt = styled.div<{ copyMsg: string }>`
  border: 1px dashed;
  padding: 0.75rem 1.2rem;
  border-radius: 8px;
  margin-right: 1rem;
  cursor: pointer;
  position: relative;
  font-family: "IBM Plex Mono", monospace;

  &:after {
    position: absolute;
    right: 0;
    bottom: -1.5rem;
    font-size: 10px;
    font-weight: normal;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  &:hover {
    border: 1px solid;

    &:after {
      content: '${props => props.copyMsg}';
    }
  }

`;

export const ApiKeyDetails = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;

  .avatar {
    height: 18px;
    border-radius: 9px;
    margin: 0 0.2rem;
  }
`;

export const CustomDomainCard = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1rem 2rem;
  gap: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #E6E6E6;
  background: #FFF;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  text-decoration: none;
  margin-bottom: 1rem;
  max-width: 680px;

  .l1 {
    display: flex;
    justify-content: space-between;
  }

  .prim {
    font-family: "IBM Plex Mono", monospace !important;
    font-weight: 600;
  }

  ul {
    padding-inline-start: 2rem;
    margin-block-start: 0em;
    margin-block-end: 0em;
  }

  .l3 {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-direction: column;
    align-items: center;
  }
`;

export const ABtn = styled.a`
  color: #ff7450;
  font-weight: bold;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    color: #ff7450;
  }
`;

export const AntCollapse = styled(Collapse)`
  border: none !important;
  background: transparent;

  .ant-collapse-content.ant-collapse-content-active {
    border-top: 1px solid #e1e1e4;
  }

   .ant-collapse-item {
    background: transparent;
    border-bottom: none !important;
  }
`;

export const RecordCon = styled.div`
  .th {
    text-align: left;
    font-weight: normal;
    padding-top: 1rem;
  }

  td:not(.th):last-child {
    padding-left: 1rem;
  }

  tr {
    td:not(.th):last-child {
      font-family: "IBM Plex Mono", monospace !important;
      font-size: 13px;
      font-weight: bold;
    }
  }

  .cpy {
    opacity: 0.7;
    &:hover {
      opacity: 1;
      cursor: pointer;
    }
  }

  .foc {
    background: #eaeaea;
    padding: 1px 4px;
    border-radius: 4px;
  }
`;
