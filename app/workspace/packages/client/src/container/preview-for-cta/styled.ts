import styled from 'styled-components';
import { SiteData } from '../../types';

export const Con = styled.div<{ siteData: SiteData }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0;
  overflow-y: hidden;
  background: ${(p) => `linear-gradient(33deg, ${p.siteData.bg1}, ${p.siteData.bg2})`};
`;

export const PreviewFrameWrapper = styled.div<{ showOverlay: boolean }>`
  flex-grow: 1;
  width: 90%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem;
  position: relative;

  .replay-overlay {
    position: absolute;    
    background-color: ${({ showOverlay }) => (showOverlay ? 'rgba(0, 0, 0, 0.8)' : '')};
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: center;
    align-items: center;
  }

  .preview-frame {
    border: none;
    border-radius: 4px;  
  }
`;

export const HeaderCon = styled.div`
  align-self: stretch;
  position: static;
  background-color: #160245;
  font-family: IBM Plex Sans;
  font-size: 14px;
  font-style: normal;
  font-weight: 700;
  line-height: normal;
`;
