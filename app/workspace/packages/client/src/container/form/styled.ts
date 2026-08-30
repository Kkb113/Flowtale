import styled from 'styled-components';
import formBgFrame from '../../assets/form/bg-frame.svg';

export const FormContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: url(${formBgFrame});
  background-repeat: no-repeat;
  background-size: cover;
  box-shadow: inset 0px 0px 0px 4px #7567FF;
  border-radius: 10px;
  padding: 0 1rem;
`;
