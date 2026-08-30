import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: column;
  padding: 2.4rem;
  padding-top: 0;
`;

export const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

export const SkeletonCon = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 60%;
`;

export const Heading = styled.h1`
    margin: 0 0 1rem 0;
    font-size: 2rem;
`;

export const Description = styled.p`
    margin-bottom: 1rem;
    font-size: 1.15rem;
`;

export const LoadingToast = styled.div`
    background-color: #FFEFE6;
    color: #C39377;
    font-size: 0.875rem;
    padding: 0.75rem 2.5rem;
    box-shadow: 0px 3px 1px rgba(195, 147, 119, 0.3);
    border-radius: 1rem;
    position: fixed;
    bottom: 7.75rem;
`;

export const SecondaryButton = styled.button<{ main?: boolean }>`
    background: #FFFFFF;
    border: 1px solid #16023E;
    display: block;
    width: 80%;
    cursor: pointer;
    padding: ${props => (props.main ? '1rem 3rem' : '0.85rem 2.5rem')};
    border-radius: 2.5rem;
    font-weight: 600;
    font-size: 1.2rem;
    
    span {
        margin-right: 0.5rem;
    }
`;

export const DangerButton = styled.button`
  background: transparent;
  border: none;
  display: block;
  width: 100%;
  padding: 0rem 0;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease-out;
  text-align: center;

  .target {
    color: #ff7350;
    font-weight: 600;
  }

  &:hover {
    .target {
      text-decoration: underline;
    }
  }

`;

export const NameTourInputContainer = styled.div`
    position: relative;
    font-size: 1.2rem;
    
    input {
        background: #FFFFFF;
        border: 1px solid #7567FF;
        border-radius: 8px;
        font-weight: 600;
        font-size: inherit;
        padding: 0.85rem 1rem 0.85rem 3rem;
        width: 90%;
    }
`;

export const ModalButtonsContainer = styled.div`
  display: flex;
  margin: 1.5rem 0 0;
  gap: 1rem;
`;

export const FableColorSplit = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height:5px;
    display: flex;

    div {
        width: 40%;
        border-radius: 12px;
        z-index: 2;
        height: 5px;

        &:nth-child(1) {
          background-color: #ff7450;
        }

        &:nth-child(2) {
          background-color: #fedf64;
        }

        &:nth-child(3) {
          background-color: #7567ff;
        }

        &:not(:first-child) {
        margin-left: -18px;
        }
    }
`;

export const TourHeading = styled.h1`
    margin: 2rem 3.625rem;
    font-size: 1.25rem;
`;

export const SearchInputContainer = styled.div`
    width: 90%;
    margin: auto;
 
    .ant-select-selection-placeholder {
        padding: 3px 35px !important;
        font-size: 12px;
    }

    input {
        height: 36px;
        background: #F1F3F4;
        border-radius: 20px;
        border: 1px solid #F1F3F4;
        display: block;
        padding-left: 35px;

        &::placeholder {
            padding-left: 20px;
        }
    }
`;

export const SearchInputWrapper = styled.div`
    width: 90%;
    margin: auto;
    position: relative;
`;

export const HeartLoaderCon = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    display: flex;
    flex-direction: column;
    gap: 2rem;
`;

export const AnnotationContainer = styled.div`
    display: flex; 
    flex-wrap: wrap; 
    gap: 40px; 
    min-height: 240px;
    align-items: center;
    justify-content: center;
`;

export const AnnContentOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(33, 33, 33, 0.60);
    display: flex;
    z-index: 100000;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.3s;
    &:hover{
        opacity: 1;
    }
`;

interface modalConfig{
    showBorder: boolean;
}

export const AnnCardContainer = styled.div`
    position: relative;
    border-radius: 4px;

    &:before{
        opacity: 0;
        z-index: -1;
        content: '';
        position: absolute;    
    }

    .fable-ann-card{
        border: none;
    }
`;

export const ConLogoImg = styled.img`
  height: 3.5rem;
  margin: 2rem 0;
`;

export const HeaderText = styled.div`
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
`;

export const SubheaderText = styled.div`
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.25rem;
  margin: 0;
  color: #16023E;  
  margin-bottom: 2rem;
`;

export const NewHeaderText = styled.div`
  text-align: center;
  font-weight: 600;
`;

export const CardContentCon = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    pointer-events: all;
    height: 100%;
    width: 100%;
    
    .ant-checkbox-wrapper {
      align-items: start;
    }
    
    .ant-checkbox {
      align-self: start;
    }

    .anim-bg {
      position: relative;
      display: inline;
      background: linear-gradient(to right, rgb(255, 230, 0, 0) 50%, #7ceaf3 50.1% );
      word-wrap: break-word;
      background-size: 200%;
      background-position: 0%;
      transition: background-position 1s ease-in-out;
      border-radius: 2px;

      &.hl {
        background-position: -100%;
        color: black;
        opacity: 1;
        font-weight: bold;
      }
    }
`;

export const ManualDemoContainer = styled.div`
    margin: 1rem 0 0;
    text-align: center;
`;

export const ManualDemo = styled.span`
  color: #424242;
  font-size: 1rem;
  text-decoration: dotted underline;
  display: block;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;

export const ProductCardCon = styled.div<{large?: boolean}>`
  box-shadow: var(--card-box-shadow-active);
  max-height: ${props => (props.large ? '680px' : '600px')};
  min-height: ${props => (props.large ? '400px' : '300px')};
  min-width: 400px;
  background-color: white;
  border-radius: 5px;
  padding: 2rem;
  overflow: hidden;
  display: flex;
  align-items: center;
  border-radius: 26px;

  .subinfo {
    opacity: 0.75;
    margin: 0;
  }
`;

export const Con = styled.div`
  max-width: 600px;
`;

export const CheckboxContent = styled.div`
  margin-top: -3px;

  p {
    margin: 0;
    font-weight: 400;
  }
`;

export const TextAreaContentCon = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  pointer-events: all;
  width: 100%;
`;

export const ColorPaletteCon = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-direction: column;
`;

export const ColorPaletteSuggest = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  p {
    margin: 5px 0;
    font-weight: 400;
    font-size: 1rem;
  }
`;

export const ColorPalette = styled.div<{bgColor: string, borderColor: string, fontColor: string, primaryColor: string}>`
  cursor: pointer;
  background: ${props => props.bgColor};
  width: 160px;
  border: ${props => `1px solid ${props.borderColor}`}; /* borderColor */
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: 8px;
  position: relative;
  box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
  .text-container {
    background: transparent;
  }

  .text-container > div{
    height: 8px;
    background: ${props => `${props.fontColor}c1`}; /* fontColor + 'c1' */
    margin-bottom: 4px;
    border-radius: 8px;
  }

  .text-container {
    width: 100%;
  }

  .line:nth-child(odd) {
      width: 100%;
  }
  .line:nth-child(even) {
      width: 50%;
      margin-bottom: 12px !important;
  }

  .line:last-child {
      width: 80%;
  }

  .btn-container {
    margin-top: 100px;
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }


  .btn {
    height: 24px;
    width: 48px;
    border-radius: 8px;
    background: ${props => props.primaryColor}; /* primaryColor */
  }
`;

export const RetryOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0,0,0,0.7);
  z-index: 9999;
  gap: 1rem;
  color: #fff;

  .ai-err-info{
    color: yellow;
    margin: 0;
  }

  .typ-btn{
    background: white;
    color: #000;

    &.sec {
      background: transparent;
      border: 1px solid white;
      color: white;
    }
  }
`;

export const CardHeading = styled.div`
  margin: 0;
  text-align: left;
  width: 100%;

  p {
    margin: 0;
    margin-bottom: 0.5rem;
  }

  .typ-sm {
    opacity: 0.75;
  }
`;

export const CardSubHeading = styled.div`
  margin: 0;
`;

export const AllProgressCon = styled.div`
  grid-template-rows: repeat(4, 1fr);
  grid-template-columns: 1fr;
  display: grid;
  gap: 10px;
`;

export const TipsAnimationCon = styled.div`
  p {
    margin: 0;
    margin-bottom: 0.5rem;
  }

  margin-top: 1rem;
  color: #424242ad;
  width: 100%;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  transition: background 1s ease-in-out;
`;
