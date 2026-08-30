import styled from 'styled-components';

export const LoaderContainer = styled.div<{ showOverlay?: boolean }>`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 9999;
    background-color:  ${props => (props.showOverlay ? 'rgba(0,0,0,0.1)' : 'transparent')}
`;

export const LoaderLogo = styled.div`
    margin: auto;
    height: 50px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    
    img {
      height: 100%;
      width: 50px;
    }
`;
