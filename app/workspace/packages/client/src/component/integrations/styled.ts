import { Input, Select } from 'antd';
import styled from 'styled-components';

export const Con = styled.div`
  display: flex;
  padding: 1rem;
  gap: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #E6E6E6;
  background: #FFF;
  box-shadow: var(--card-box-shadow);
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  text-decoration: none;
  margin-bottom: 1rem;

  &:hover {
    box-shadow: var(--card-box-shadow-active);
    cursor: pointer;
    text-decoration: none;
    color: #16023e;
  }
  width: 100%;
`;

export const InfoSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Tag = styled.span`
  color: gray;
  font-size: 0.85rem;
  border: 1px solid lightgray;
  padding: 0.2rem;
  border-radius: 8px;
`;

export const L1 = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header {
    font-size: 1.15rem;
    font-weight: 600;
  }

  .mini {
    font-size: 0.8rem;
    font-weight: 400;
  }
`;

export const L2 = styled.div`
  font-size: 0.9rem;
  font-weight: 400;

  ul {
    padding-inline-start: 1rem;
  }
`;

export const WebhookConfCard = styled.div`
  background: linear-gradient(45deg, rgba(251, 246, 255, 1) 0%, rgba(231, 225, 237, 1) 100%);
  border-radius: 16px;
  padding: 1rem 2rem;
  margin-bottom: 1rem;

  .header {
    p {
      line-height: .95rem;
      font-size: 0.85rem;
    }
    margin-bottom: 1.5rem;
  }

  .header > div {
    margin-bottom: 1rem;
    font-weight: 500;
    border: 2px dotted transparent;
    font-size: 1.25rem;

    &:hover {
      cursor: text;
      border: 2px dotted #b3a6c0;
    }
  }

  .when, .then, .req-body, .req-header {
    font-size: 1rem;
    margin-bottom: 1.25rem;

    p {
      color: rgba(0, 0, 0, 0.88);
      font-size: 1.25rem;
    }
  }

  .req-body, .req-header {
    .help {
      font-size: 0.85rem;
      line-height: 1rem;
      margin-bottom: 0.5rem;
      color: #73738c;
    }
  }

  .code {
    font-family:  "IBM Plex Mono", monospace;
    font-weight: 500;
  }

  .actn {
    text-decoration: underline dotted;
    
    &:hover {
      text-decoration: underline;
      cursor: pointer;
      font-style: italic;
    }
  }

  .btn-con {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin: 0.75rem 0 0.25rem;
  }
`;

export const BordededSelect = styled(Select)`
  .ant-select-selector {
    background-color: transparent !important;
    border: 1px dashed gray !important;
    font-family:  "IBM Plex Mono", monospace;
    
    .ant-select-selection-item {
      font-weight: 500;
    }
  }
`;

export const BorderedInput = styled(Input)`
  width: 100%;
  background: transparent;
  border: 1px solid gray;
  font-family:  "IBM Plex Mono", monospace;
  font-weight: 600;
  background: #2e3440;
  color: #a4be8c !important;
  padding: 6px 12px;

  &:hover, &:focus {
    border: 1px dotted lightgray;
  }

  &::placeholder {
    color: #7a8e71;
  }
`;

export const DottedBorderedInput = styled(Input)`
  padding-left: 0;
  background: transparent;
  border: 2px dotted transparent;
  font-weight: 500;
  font-size: 1.25rem;

  &:hover, &:focus {
    border-color: gray;
  }
`;
