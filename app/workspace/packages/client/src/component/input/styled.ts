import styled from 'styled-components';

export const InputContainer = styled.div<{ size: 'large' | 'medium', inline?: boolean}>`
  position: relative;
  display: ${props => (props.inline ? 'inline-block' : 'block')};

  input {
    height: ${props => (props.size === 'large' ? 48 : 42)}px;
    width: 100%;
    border: 1px dashed #BDBDBD;
    border-radius: 8px;
    box-sizing: border-box;
    padding: 16px;
    font: inherit;
    line-height: 20px;
    color: #16023E;
  }
  
  .label {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 16px;
    display: flex;
    align-items: center;
    pointer-events: none;
  }

  input:focus {
    outline: none;
    border: 1px solid #747474;
  }

  input:active {
    border: 1px solid #747474;
  }

  input:hover {
    border: 1px solid #747474;
  }
  
  input:focus+.label .text {
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
  
  input:focus+.label .text,
  input:not(input:placeholder-shown)+.label .text {
    font-size: 12px;
    transform: translate(0, -148%);
    background-color: white;
    padding-left: 4px;
    padding-right: 4px;
  }
  
  input:focus+.label .text {
    color: #16023E;
  }
`;

export const IconWrapper = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 0.875rem;
`;
