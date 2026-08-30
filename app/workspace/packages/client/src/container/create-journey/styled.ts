import styled from 'styled-components';

export const CreateJourneyCon = styled.div`
    width: 360px;
    position: fixed;
    z-index: 10;
    top: 0;
    left: 0;
    height: 100%;
    background-color: white;
    padding: 2rem 1rem 2rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 6px 0px 24px 0px rgba(0, 0, 0, 0.06);
    .ver-center {
      display: flex;
      align-items: center;
      justify-content: right;
      gap: 0.25rem;
    }
`;

export const EditorCon = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 2rem;
    padding-top: 0.4rem;
    padding-right: 1rem;

  ::-webkit-scrollbar {
    width: 4px;
  }

  ::-webkit-scrollbar-track {
    background-color: var(--fable-scrollbar-track);
  }

  ::-webkit-scrollbar-thumb {
    background-color: var(--fable-scrollbar-thumb);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: #555;
  }

  .hlpr {
    padding-left: 2.1rem;
    color: gray;
  }
`;

export const FieldOuterCon = styled.div`
    width: 100%;
    margin-top: 1rem;
`;

export const FieldCon = styled.div`
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #DDD;
    background: #FBFBFB;
`;

export const FieldInputCon = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 8px;
`;

export const JourneyInnerCon = styled.div`
    width: 100%;
`;

export const JourneyInputCon = styled.div`
    display: flex;
    justify-content: space-around;
    gap: 10px;
`;

export const FlowCon = styled.div`
    display: flex;
    align-items: center;
    flex-direction: column;
`;

export const CTAInputCon = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0;
`;

export const Header = styled.div`
  display: flex;
  justify-content: flex-end;
`;

export const CloseIcon = styled.img`
  height: 2rem;
  width: 2rem;
  cursor: pointer;
  background: #ffffffc4;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s ease-out;

  &:hover {
    background: #ffffff;
  }
`;

export const FableLogo = styled.img`
  width: 90px;
`;

export const NoJourneyCon = styled.div`
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
`;

export const JourneyConfigCon = styled.div`
  width: 90%;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid var(--Outline-1, #DDD);
`;
