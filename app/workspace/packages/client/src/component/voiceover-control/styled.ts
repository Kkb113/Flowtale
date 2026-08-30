import styled from 'styled-components';

export const VoiceControlCon = styled.div`
  position: absolute;
  display: flex;
  border-radius: 14px;
  background: #7568ff;
  border: 1px solid #fafafa;
  transition: filter 0.5s cubic-bezier(0.42, 0, 0.07, 1.03);
  filter: saturate(0.1) opacity(0.5);
  height: 36px;
  width: 72px;
  justify-content: space-evenly;


  &:hover {
    filter: saturate(1) opacity(1);
  }

  .voice-control-icon{
    font-size: 1.35rem !important;
    color: #fafafa;
    cursor: pointer;
  }
`;
