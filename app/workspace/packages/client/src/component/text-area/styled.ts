import styled from 'styled-components';

export const InputContainer = styled.div<{ size: 'large' | 'medium' | 'small'}>`
  position: relative;

  textarea {
    height: ${props => (props.size === 'large' ? 140 : props.size === 'medium' ? 100 : 60)}px;
    width: 100%;
    border-radius: 8px;
    box-sizing: border-box;
    padding: 16px;
    font: inherit;
    line-height: 20px;
    color: #16023E;
    min-height: 60px;
    resize: vertical;
    border: 1px dashed #BDBDBD;
  }
  
  .label {
    position: absolute;
    top: 20px;
    left: 16px;
    display: flex;
    align-items: center;
    pointer-events: none;
  }
  
  textarea,
  .label .text {
    font-size: 16px;
  }
  
  textarea:focus {
    outline: none;
    border: 1px solid #747474;
  }

  textarea:active {
    border: 1px solid #747474;
  }

  textarea:hover {
    border: 1px solid #747474;
  }
  
  textarea:focus+.label .text {
    font-size: 12px;
    transform: translate(0, -50%);
    background-color: white;
    padding-left: 4px;
    padding-right: 4px;    
    color: #16023E;
  }
  
  .label .text {
    transition: all 0.15s ease-out;
  }
  
  textarea:focus+.label .text,
  textarea:not(textarea:placeholder-shown)+.label .text {
    font-size: 12px;
    transform: translate(0, -170%);
    background-color: white;
    padding-left: 4px;
    padding-right: 4px;
  }
  
  textarea:focus+.label .text {
    color: #16023E;
  }
`;

export const IconWrapper = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 0.875rem;
`;
