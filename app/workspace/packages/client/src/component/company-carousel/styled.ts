import styled from 'styled-components';

export const CompanyCon = styled.div`
  overflow: hidden;
  white-space: nowrap;
  position: relative;
  width: calc(100vw - 1rem);

  @keyframes slides {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-100%);
    }
  }

  &:before,
  &:after {
    position: absolute;
    top: 0;
    content: "";
    width: 250px;
    height: 100%;
    z-index: 2;
  }

  .companiesImg {
    display: inline-block;
    animation: 15s slides infinite linear;
  }

  &:hover .companiesImg {
    animation-play-state: paused;
  }

  .companiesImg .companyLogo {
    width: 100px;
    aspect-ratio: 2.5;
    filter: grayscale(100%);
    -webkit-filter: grayscale(100%);
    margin: 0 2rem;
  }
`;
