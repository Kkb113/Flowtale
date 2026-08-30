import styled from 'styled-components';

export const IntegrationCardCon = styled.div`
  padding: 0rem 1rem;
  margin: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 60%;

  .err-msg {
    margin-bottom: 2rem;
    border-left: 4px solid #ff7450;
    padding-left: 1rem;

    h3 {
      margin: 0.5rem 0;
    }
    p {
      margin: 0;
      margin-block-start: 0;
      margin-block-end: 0;

      &:last-child {
        margin-bottom: 0.5rem;
      }
    }
  }

  a {
    color: black;
    text-decoration: underline dotted;
    font-style: italic;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export const WebhookConfCon = styled.div`
  padding: 1.5rem;

  .header-con {
    display: flex;
    flex-direction: row;
    gap: 0.75rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e4e8eb;

    img {
      height: 48px;
    }
  }

    h3 {
      margin: 0;
    }
    p {
      margin: 0;
      margin-block-start: 0;
      margin-block-end: 0;
      color: #73738c;
    }

    .body-con {
      margin-top: 1rem;
      padding-top: 1rem;
    }
`;

export const CobaltConfigWrapper = styled.div`
  .fable-color {
    background-color: #7567FF;
  }

  .fable-color:hover {
    background-color: #16023E;
  }
`;

export const CustomFieldCon = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: space-between;
  width: 60%;
  min-width: 480px;

  .btn-con {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  & > div:nth-child(1) {
    width: 70%;
    padding: 1rem 0;
  }

  & >div:nth-child(2) {
    width: 30%;
  }

  .docs {
    border-left: 1px solid lightgray;
    padding: 0.5rem 0.75rem;
  }

  .fields-con {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    margin-bottom: 1rem;
    max-width: 360px;

    & > div {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    a {
      display: inline-block;
      margin-left: 1rem;
      margin-bottom: unset;
    }
  }
`;
