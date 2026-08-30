import styled from 'styled-components';

export const HomeDropdown = styled.div`
  width: 30%;
  margin: 4.5rem 0;
  padding: 0.25rem 0;
  border-radius: 0.25rem;

  .typ-reg {
    margin: 0.25rem auto;
  }

  .step-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    li {
      margin: none;
      padding: none;
    }
  }

  .demo-tips-con {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;

    .demo-tip {
      padding: 1rem;
      border-radius: 0.5rem;
      
      .icon {
        padding:0rem 0.125rem;
        margin-right: 0.25rem;
        outline: 1px solid black;
        border-radius: 50%;
      }
    }

    .marketing {
      background-color: #fef3c7;
      outline: 1px solid #facc15;
    }

    .customer-success {
      background-color: #dcfce7;
      outline: 1px solid #34d399;
    }

    .sales {
      background-color: #cffafe;
      outline: 1px solid #7dd3fc;
    }
  }
`;

export const OpenButton = styled.button`
  border: none;
  width: 100%;
  background: white;
  outline: none;
  padding: 1rem;
  opacity: 0.65;
  border-bottom: 1px solid #dddddd;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  &:hover {
    opacity: 1;
  }
`;
