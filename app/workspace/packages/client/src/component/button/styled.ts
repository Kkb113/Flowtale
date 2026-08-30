import styled from 'styled-components';

interface ButtonConProps {
  intent: 'primary' | 'secondary' | 'link';
  size: 'large' | 'medium' | 'small';
  bgColor: string;
  borderColor: string;
  color: string;
  borderRadius: number;
}

export const ButtonCon = styled.button<ButtonConProps>`
  background-color: ${({ intent, bgColor }) => (intent === 'primary' ? bgColor : 'transparent')};
  padding: ${({ size }) => (size === 'medium' ? '0.75rem 2rem' : size === 'small' ? '0.35rem 1.2rem' : '1.25rem 2.5rem')};
  border: ${({ intent, borderColor }) => (intent === 'secondary' ? `1px solid ${borderColor}` : 'none')}; 
  color: ${({ color }) => (color)};
  display: flex;
  align-items: center;
  gap: 0.65rem;
  border-radius: ${({ borderRadius }) => (`${borderRadius}px`)};
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease-out;  
  text-decoration: ${p => (p.intent === 'link' ? 'dotted underline' : 'none')};
  
  &:hover {
    transform: translate(2px, -2px);
    text-decoration: ${p => (p.intent === 'link' ? 'underline' : 'none')};
  }

  &:disabled {
    opacity: 0.5;
  }
`;
