import styled from 'styled-components';

export const BodyCon = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-left: 3%;
  background: #F5F5F5;
  overflow-y: scroll;
  overflow-x: hidden;
`;

export const MainCon = styled.div`
  display: flex;
  width: 65%;
  min-width: 600px;
  flex-direction: column;
  justify-content: center;
`;

export const LeadCardCon = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 1rem;
  margin: 2rem 0;
  width: 100%;

  .lead-card {
    display: flex;
    background: white;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: var(--card-box-shadow);

    & > div:first-child {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 1rem;
      flex: 1 1 auto;
    }

    & > div:last-child {

    }
  }

  .lead-info-l {
    display: flex;
    gap: 1.5rem;

    .info-item {
      display: flex;
      flex-direction: column;

      .fk {
        opacity: 0.6;
      }
    }
  }

  .lead-loc-l {
    display: flex;
    flex-direction: column;

    div {
      display: flex;
    }

    span {
      display: flex;
      gap: 1rem;
    }
  }

  .lead-src-l {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    line-height: 1rem;
  }

  .link-con {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
`;

export const TooltipCon = styled.div`
  font-size: 0.85rem;
  line-height: 0.9rem
`;
