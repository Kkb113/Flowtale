import styled from 'styled-components';
import { Link } from 'react-router-dom';

// ~~~~~~~~~~~~~~~~~~~~~~ TOUR CARD ~~~~~~~~~~~~~~~~~~~~~~

export const TourCardCon = styled(Link)`
  display: flex;
  padding: 1rem;
  gap: 1rem;
  border-radius: 0.5rem;
  background: #FFF;
  box-shadow: var(--card-box-shadow);
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  text-decoration: none;
  margin-bottom: 1rem;

  &:hover {
    box-shadow: var(--card-box-shadow-active);
    cursor: pointer;
    text-decoration: none;
    color: #16023e;
  }
`;

export const DisplayName = styled.h3`
  margin: 0;
  padding: 0;
  color: #16023E;
  font-family: IBM Plex Sans;
  font-size: 1rem;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
`;

export const Divider = styled.div`
  background: #DDD;
  height: 80%;
  width: 0.0625rem;
  height: 0.6875rem;
`;

export const AvatarCon = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3125rem;
`;

export const TourThumbnail = styled.div`
  display: none;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  border-radius: 0.25rem;
  border: 0.5px solid #DDD;
  background: #D0D0FF;
`;

export const CardDataCon = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  flex: 1 0 0;
`;

export const TourMetaDataCon = styled.div`
  color: #16023E;
  font-family: IBM Plex Sans;
  font-size: 11px;
  font-style: normal;
  font-weight: 300;
  line-height: normal;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const TourActionBtnCon = styled.div`
  display: flex;
  align-items: center;
  align-self: flex-start;
  gap: 0.5rem;
`;

export const EmbedBtn = styled.button`
  background: #fff;
  border: none;
  color: black;
  text-decoration: none;
  padding: 4px 11px;
  border-radius: 6px;
  box-shadow: var(--card-box-shadow);
  cursor: pointer;
  transition: box-shadow 0.2s ease-out;
  display: flex;
  align-items: center;

  &:hover {
    box-shadow: var(--card-box-shadow-active);
  }
`;

// ~~~~~~~~~~~~~~~~~~~~~~ TOUR CARD ~~~~~~~~~~~~~~~~~~~~~~

// ~~~~~~~~~~~~~~~~~~~~~~ EMPTY STATE ~~~~~~~~~~~~~~~~~~~~~~

export const EmptyToursContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 1rem;
  gap: 2rem;
  padding: 18px 0;
  padding-bottom: 5rem;


  .hl-cover {
    background: #ffe998;
    font-size: 0.85rem;
    padding: 1px 3px;
    border-radius: 4px;
  }

  .typ-h1 {
    font-weight: 400;
  }

  .example-demo-container {
    box-sizing: border-box;
    width: 90%;
    aspect-ratio: 4/3;
    text-align: center;
    padding: 1rem 2rem;
    border-radius: 1rem;

    .typ-h2 {
      font-weight: 400;
      word-spacing: 2px;
    }
    
    .typ-h5 {
      font-weight: 300;
      margin-top: 0.25rem;
      margin-bottom: 0.5rem;
    }
  }

  .quilly-annoucement {
    display: flex;
    gap: 2rem;
    align-items: center;
    background: white;
    border-radius: 16px;
    width: calc(100% - 4rem);
    margin: 1rem 0;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
    padding: 1rem 2rem 2.8rem;
    background: #fbf6ff;
  }
`;

export const HeaderMsgCon = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  h1 {
    color: #222;
    text-align: center;
    font-family: IBM Plex Sans;
    font-size: 1.25rem;
    font-style: normal;
    font-weight: 700;
    line-height: normal;
    margin: 0;
    padding: 0;
  }

  p {
    color: #16023E;
    text-align: center;
    font-family: IBM Plex Sans;
    font-size: 0.875rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.625rem; /* 185.714% */
    margin: 0;
    padding: 0;
  }
`;

export const CardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const EmptyStateCardCon = styled.div`
  display: flex;
  padding: 1rem 1.5rem;
  gap: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #E6E6E6;
  background: #FFF;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.05);
`;

export const CardIdx = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2.125rem;
  height: 2.125rem;
  border-radius: 100%;
  background-color: #F6F5FF;
  font-family: IBM Plex Sans;
  font-size: 1.125rem;
  font-style: normal;
  font-weight: 600;
  line-height: 1.375rem; /* 122.222% */
`;

export const CardMsgCon = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;

  h2 {
    font-family: IBM Plex Sans;
    font-size: 1.125rem;
    font-style: normal;
    font-weight: 600;
    line-height: 1.375rem; /* 122.222% */
    margin: 0;
    padding: 0;
  }

  p {
    color: #595959;
    font-family: IBM Plex Sans;
    font-size: 0.75rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.125rem; /* 150% */
    margin: 0;
    padding: 0;
  }
`;

export const CardImg = styled.img`
  max-height: 3.9rem;
  max-width: 4.8rem;
  filter: drop-shadow(0px 4.4px 6.6px rgba(0, 0, 0, 0.25));
  align-self: center;
`;

export const DefaultTourContainer = styled.div`
  display: grid;
  gap: 1rem;
  width: 100%;
  grid-template-columns: repeat(auto-fill, minmax(15vw, auto));
`;

export const TourCreated = styled.p`
  color: #595959;
  font-family: IBM Plex Sans;
  font-size: 0.75rem;
  font-style: normal;
  font-weight: 400;
  line-height: 1.125rem;
  margin: 0;
  padding: 0;
`;

export const DefaultDemoCon = styled.div`
  border-bottom: 1px solid #EEEEEE;
  margin-bottom: 1rem;
  padding-bottom: 1.25rem;
  width: 100%;
`;
