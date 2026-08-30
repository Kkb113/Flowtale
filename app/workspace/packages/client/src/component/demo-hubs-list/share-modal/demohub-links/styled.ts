import styled from 'styled-components';

export const EmbedCon = styled.div`
  padding: 0.5rem;
  border-top: 1px solid #E0E0E0;

  .header {
    color: #16023e;
    margin-bottom: 1rem;
  }

  .see-all-pages {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding : 1rem;
  }

  .qualification-links {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding : 1rem;
    border-top: 1px solid #E0E0E0;
    margin-top: 0.5rem;
    justify-content: start;

    .qual-link {
      display: flex;
      align-items: center;
      gap: 1rem;

      .url-title {
        width: 100%;
      }

      .url-container {
        width: 80%;
      }
    }
  }

`;
