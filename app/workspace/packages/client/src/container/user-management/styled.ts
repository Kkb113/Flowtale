import styled from 'styled-components';

export const Heading = styled.h1`
  color: #16023E;
  font-size: ${(props) => props.theme.typography.size.heading};
  font-weight: bold;
`;

// TODO lot's of common code between this and tour/styled.ts. Make a single file
export const UserCardCon = styled.div<{ active: boolean }>`
  display: flex;
  width: 39.375rem;
  padding: 1rem;
  gap: 1rem;
  border-radius: 0.5rem;
  background: #FFF;
  box-shadow: var(--card-box-shadow);
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  text-decoration: none;
  margin: 2px 2px 1rem 2px;
  opacity: ${props => (props.active ? 1 : 0.45)};
  filter: saturate(${props => (props.active ? 1 : 0.3)});
`;

export const Avatar = styled.div`
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;

  & > img {
    height: 100%;
    border-radius: 0.5rem;
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

export const MetaDataCon = styled.div`
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

export const Divider = styled.div`
  background: #DDD;
  height: 80%;
  width: 0.0625rem;
  height: 0.6875rem;
`;

export const CardDataCon = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  flex: 1 0 0;
`;

export const ActionBtnCon = styled.div`
  display: flex;
  align-items: center;
  align-self: flex-start;
  gap: 0.5rem;
`;
