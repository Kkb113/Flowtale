import styled from 'styled-components';
import { CheckCircleFilled } from '@ant-design/icons';

export const Container = styled.div<{setupGuideVisible: boolean}>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: flex-start;
  margin-top: 5.4rem;

  .ant-collapse-item {
    border-bottom: none;
  }

  .ant-collapse {
    border-radius: 0.5rem;
  }

  .ant-collapse .ant-collapse-content {
    border-top: none;
    background: whitesmoke;
  }
`;

export const Con = styled.div`
  width: inherit;
  max-width: 22.25rem;
  height: fit-content;
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #E6E6E6;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const TitleCon = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const Title = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  color: #16023e;
  margin: 0;
`;

export const FableLogo = styled.img`
  aspect-ratio: 1/1;
  width: 2.75rem;
`;

export const CheckFilledIcon = styled(CheckCircleFilled)`
  width: 20px;
  height: 20px;
  margin-top: 5px;
  color: #7567FF;
  outline: 1px solid black;
`;

export const EmptyCircle = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-top: 5px;
  border: 1px solid #9E9E9E;
`;

export const StepsCon = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 22.25rem;

  li {
    margin: 0.5rem 0;
  }

  ul {
    padding-left: 13px;
  }

  &.empty {
    .ant-steps-item-icon {
      background: #ebf4f1;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .ant-steps-icon {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .ant-steps-item-title {
      color: black !important;
      font-size: 1rem;
      font-weight: 600;
    }
  }
`;

export const SetupGuideCon = styled.div`
  max-width: 350px;
  min-width: 300px;

  & > p {
    font-weight: 500;
  }

  p {
    margin: 0;
    padding: 0;
  }

  & .ant-progress-text{
    color: #7567FF !important;
  }
`;

export const SetupSteps = styled.div`
  display: flex;
  gap: 2rem;
  position: relative;
  width: 100%;
  max-width: 1100px;
  margin: 0.5rem;
  justify-content: start;
  align-items: stretch;

  .step-root {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
  }

  .step-footer {
    display: flex;
    align-items: center;
  }

  .setup-step {
    width: 100%;
    background-color: white;
    border-radius: 1rem;
    padding: 1rem 1.5rem;
    padding-left: 0.75rem;
    font-size: 0.75rem;
    box-shadow: var(--card-box-shadow-active);
    display : flex;
    align-items: start;
    gap: 1rem;
    transition: all 100ms;

    &.complete {
      background: transparent;
      box-shadow: var(--card-box-shadow-secondary);
    }

    .left-items {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 6px;

      .setup-index {
        font-size: 0.8rem;
        border-radius: 50%;
        height: 18px;
        width: 18px;
        outline: 1px solid #9E9E9E;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #9E9E9E;
      }

      .setup-index-complete {
        background-color: #7567ff;
        outline: 1px solid #7567ff;
        color: white;
      }
    }
    .setup-title {
      font-weight: 500;
      margin-bottom: 0.75rem;
    }

    ul {
      padding-left: 0.5rem;
    }
   
    .hl {
      border-bottom: 2px solid #7ceaf3;
    }
  }
`;
