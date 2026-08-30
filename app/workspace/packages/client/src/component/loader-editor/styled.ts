import styled, { keyframes } from 'styled-components';

export const CenteredLoaderLogoDiv = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 1rem;

  p {
    text-align: center;
  }

  img {
    height: 64px;
    animation: animate-logo-fade-in-out 3s infinite;
    border-radius: 4px;
  }

  @keyframes animate-logo-fade-in-out {
    0% {
      opacity: 0.05;
    }

    50% {
      opacity: 1;
    }

    100% {
      opacity: 0.05;
    }
  }
`;

export const FullScreenCon = styled.div<{
  bg?: string,
  width?: number | null,
  height?: number | null,
  top?: string;
  left?: string;
  applyTransform?: boolean;
  borderRadius?: string;
}>`
  position: fixed;
  top: ${props => props.top || '50%'};
  left: ${props => props.left || '50%'};
  ${props => (props.applyTransform ? 'transform: translate(-50%, -50%);' : '')}
  width: ${props => (props.width ? `${props.width}px` : '100vw')};
  height:  ${props => (props.height ? `${props.height}px` : '100vh')};
  z-index: 10;
  background-color: ${props => `${props.bg || 'transparent'}`};
  border-radius: ${props => props.borderRadius || '6px'};
`;

export const EditorWrapper = styled.div`
  padding: 2rem;
  background-color: transparent;
  backdrop-filter: blur(32px) saturate(0.2);

  .ver-center {
    display: flex;
    align-items: center;
  }
`;

export const EditorCon = styled.div`
    display: flex;
    gap: 1rem;
`;

export const PreviewPanel = styled.div`
    flex: 1;
    padding: 2rem 0;
`;

export const EditPanel = styled.div`
    width: 370px;
    padding: 1rem 0;
`;

export const PreviewCon = styled.div`
    position: relative;
    height: 80vh;
    width: 100%;
    box-shadow: rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 1px 3px 1px;
    background: white;
    border-radius: 0.5rem;
`;

export const FieldCon = styled.div`
    padding: 1rem;
    border-radius: 0.5rem;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
    background: white;
    margin: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

export const FieldName = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;

    p {
        color: #212121;
        padding: 0;
        margin: 0;
    }
`;

export const HeaderTitle = styled.p`
    color: #222;
    padding-left: 16px;
    text-align: center;
    padding: 0;
    margin: 1rem 0 0 0;
`;

export const Error = styled.p`
    text-align: center;
    color: red;
`;

const loadingAnimation = keyframes`
  0% {
    content: "";
  }
  25% {
    content: ".";
  }
  50% {
    content: "..";
  }
  75% {
    content: "...";
  }
`;

export const LoadingTextAnim = styled.p`
    text-align: center;
    padding: 0.5rem 1.25rem;
    border-radius: 8px;
    font-size: 1.35rem;
    font-weight: 500;
    color: #757575;
    &::after {
      position: absolute;
      text-align: left;
      width: 1ch;
      content: "...";
      animation: ${loadingAnimation} 1.5s infinite;
    }
`;

export const LogoWithLoaderCon = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

export const PosRelCon = styled.div`
  position: relative;
`;

export const LogoWithLoader = styled.div<{
    animationTime: number,
    animationDelay: number,
    loaderHeight: number,
}>`
  position: absolute;
  height: 70px;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 0;
  animation: ${props => `animate-logo ${props.animationTime}ms ease-in ${props.animationDelay}ms both`} ;
  
  img {
    height: 100%;
    border-radius: 4px;
  }

  @keyframes animate-logo {
            0% {
                transform: ${props => `translate(-50%, ${props.loaderHeight / 2}px)`};
                opacity: 0;
            }

            75% {
                transform: ${props => `translate(-50%, ${props.loaderHeight / 2}px)`};
                opacity: 1;
            }

            100% {
                transform: translate(-50%, 0);
            }
  }
`;

export const Loader = styled.div<{
    animationDelay: number,
    loaderHeight: number,
    marginTop: number,
    marginBottom: number
}>`
  margin-top: ${props => `${props.marginTop}px`};
  margin-bottom: ${props => `${props.marginBottom}px`};
  height: ${props => `${props.loaderHeight}px`};
  padding: 1rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;

  img {
    height: 100%;
    border-radius: 4px;
  }

  animation: ${props => `animate-img 200ms ease-in ${props.animationDelay}ms both`};
        @keyframes animate-img {
            0% {
                opacity: 0;
            }

            100% {
              opacity: 1;
            }
        }
`;

export const LoadingTextWithLoader = styled.div<{
    animationTime: number,
    animationDelay: number,
    loaderHeight: number,
}>`
  position: absolute;
  margin: 0;
  padding: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.35rem;
  font-weight: 500;
  color: #757575;
  text-align: center;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  width: 90%;
  &::after {
        display: inline-block;
        position: absolute;
        text-align: left;
        content: "...";
        animation: ${loadingAnimation} 1.5s infinite;
  }

  animation: ${props => `animate-text ${props.animationTime}ms ease-in ${props.animationDelay}ms both`} ;


  @keyframes animate-text {
            0% {
                transform: ${props => `translate(-50%, -${props.loaderHeight / 2}px)`};
                opacity: 0;
            }

            75% {
                transform: ${props => `translate(-50%, -${props.loaderHeight / 2}px)`};
                opacity: 1;
            }

            100% {
                transform: translate(-50%, 0);
            }
  }
`;

export const FileInputCon = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
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
