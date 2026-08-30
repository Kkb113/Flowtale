import styled from 'styled-components';
import { motion } from 'framer-motion';

const size = {
  mobileM: '375px',
  mobileL: '425px',
  tablet: '768px',
  laptop: '1024px',
};

export const QBuilderContainer = styled.div`
  position: relative;
  width: 22rem;

  @media (min-width: ${size.tablet}) {
    width: 28rem;
  }
  
  p {
    margin: 0;
  }
`;

export const SectionTop = styled.div`
  position: relative;
  margin-left: 1.8rem;
  display: flex;
  align-items: center;
  z-index: 10;

  img {
    width: 3.6rem;
  }

  div {
    margin-left: 0.8rem;
    
    p {
      margin: 0;
      
      &:first-child {
        font-weight: 700;
      }

      &:last-child {
        font-weight: 600;
        color: #7567FF;
      
        a {
          color: inherit;
          text-decoration: none;
        }
      }
    }
  }
`;

export const FormContainer = styled(motion.div)`
  background-color: #FBF6FF;
  padding: 2rem 1.2rem;
  margin-top: 1.2rem;
  border-radius: 0 1.4rem 1.4rem 1.4rem;

  @media (min-width: ${size.mobileM}) {
    padding: 2.8rem 2.2rem;
  }
  
  @media (min-width: ${size.tablet}) {
    padding: 2.8rem 2.5rem;
  }
`;

export const FormHeaderCon = styled.div`
  position: relative;
  font-size: 1.5rem;
  p {
    &:first-child {
      font-weight: 600;
    }
  }
`;

export const FormQueCon = styled.div`
  margin-top: 2.4rem;
  & > *:not(:last-child) {
    margin-bottom: 1rem;
  }
`;

export const Curve = styled.div`
  background-color: #FBF6FF;
  position: absolute;
  top: -6px;
  left: 0;
  width: 58px;
  height: 80px;
`;

export const Oval = styled.div`
  position: absolute;
  bottom: 1px;
  right: 0;
  width: 58px;
  height: 80px;
  background-color: white;
  border-radius: 42% 0% 0% 88% / 0% 23% 0% 100% ;
`;
