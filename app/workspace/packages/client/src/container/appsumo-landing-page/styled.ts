import styled from 'styled-components';

export const Con = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 1rem;

  .img-header {
    display: flex;
    gap: 2rem;
    align-items: center;
    margin-bottom: 2rem;
  }

  .body {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 1rem;
  }

  .err-details {
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
    border: 2px solid #d64e4d;
    border-radius: 8px;

    .header {
      padding: 3px 6px;
      background: #d64e4d;
      color: white;
    }

    pre {
      padding: 0 1rem;
    }
  }
`;
