import styled from 'styled-components';

export const HeaderCon = styled.div<{color: string}>`
  align-self: stretch;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 3.5rem;

  .sec-btn {
    border:  ${p => `1px solid ${p.color} !important`};
    color:  ${p => `${p.color} !important`};
    font-weight: 500;
  }

  .sec-btn:hover {
    border: ${p => `1px solid ${p.color} !important`};
    color:  ${p => `${p.color} !important`};
    transform: translate(2px, -2px);
  }

  .lg-t {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
`;
