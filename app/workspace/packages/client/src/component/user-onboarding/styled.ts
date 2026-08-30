import styled from 'styled-components';

/**
 * ONBOARDING CARD
 */

export const OnboardingCardCon = styled.div`
  box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;
  border-radius: 26px;
  height: 480px;
  width: 360px;
  background-color: white;
  padding: 2rem;
  transform: scale(0.95);

  span.ant-checkbox {
    align-self: unset !important;
    transform: translateY(4px);
    margin-top: 0.75rem;
  }

  .ant-checkbox.ant-checkbox-checked > .ant-checkbox-inner {
    border-color: #747474;
    background-color: #747474;
  }

  .ant-checkbox > .ant-checkbox-inner {
    border-color: #747474;
    background-color: transparent;
  }
`;

export const OrgItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease-out;

  &:hover {
    background: #7567ff;
    color: white;
  }
`;

export const UsecaseCon = styled.div`
  display: flex;
  flex-direction: column;
  height: 480px;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;

  .optn-badge {
    font-size: 0.75rem;
    font-weight: 500;
    margin-left: 0.5rem;
    background: #7ceaf3;
    padding: 1px 4px;
    border-radius: 6px;
  }
`;
