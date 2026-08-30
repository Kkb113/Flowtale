import styled from 'styled-components';

export const TopPanel = styled.div`
  margin: 1rem 0;
`;

export const DatasetsHeading = styled.h1`
  color: #16023E;
  font-size: ${(props) => props.theme.typography.size.heading};
  font-weight: bold;
`;

export const Text = styled.h4`
  color: #16023E;
  margin-top: 0px;
  font-style: italic;
`;

export const InlineCardBtn = styled.div`
  height: 80%;
  align-items: center;
  padding: 0 1rem;
  justify-content: center;
  flex-direction: column;
  border-radius: 0.5rem;
  outline: 1px dashed #160245;
  box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  margin: 0 0 0 1rem;
  display: flex;
  gap: 0.5rem;
  width: 120px;
  cursor: pointer;

  &:hover {
    outline: 1px solid ${(props) => props.theme.colors.light.selection.background};
  }
`;

export const CardCon = styled.div<{isSelected: boolean}>`
  display: flex;
  padding: 1rem 0.5rem 1rem 1rem;
  border-radius: 0.5rem;
  border: none;
  height: calc(80% - 2rem);
  background: #FFF;
  box-shadow: ${p => (p.isSelected ? 'var(--card-box-shadow-active)' : 'var(--card-box-shadow)')} ;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  text-decoration: none;
  width: 180px;
  min-width: 180px;
  max-width: 180px;
  justify-content: space-between;
  cursor: pointer;

  &:hover {
    box-shadow: var(--card-box-shadow-active);
  }
`;

export const DisplayName = styled.div`
  margin: 0;
  padding: 0;
  width: 100%;
  color: #16023E;
  font-size: 1rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

export const CardDataCon = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  overflow: hidden;
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

export const ActionBtnCon = styled.div`
  display: flex;
  align-items: center;
  align-self: flex-start;
  gap: 0.5rem;
  justify-content: flex-end;
  flex: 1 0 auto;
`;

export const CardCTA = styled.button`
  background: #fff;
  border: none;
  color: black;
  text-decoration: none;
  padding: 4px 11px;
  border-radius: 6px;
  box-shadow: rgb(22 2 69 / 25%) 0px 1px 1px, rgb(22 2 69 / 13%) 0px 0px 1px 1px;
  cursor: pointer;
  transition: box-shadow 0.3s ease-out;
  display: flex;
  align-items: center;

  &:hover {
    box-shadow: rgb(22 2 69 / 100%) 0px 1px 1px, rgb(22 2 69 / 100%) 0px 0px 1px 1px;
  }
`;

export const ErrorMsg = styled.p`
  font-size: 14px;
  margin: 0px;
  color : red;
`;

export const EmptyDatasetsCon = styled.div`
  margin-top: 2rem;

  table, th, td {
    border: none;
  }

  p, table {
    width: 100%;
    margin: 1rem 0;
  }

  .sample-table {
    font-size: 0.9rem;

    thead {
      font-weight: 500;
      tr {
        background: lightgray;
      }
    }

    tr {
      outline: 1px solid lightgray;
    }
    td {
      padding: 0 2px;
    }
  }
`;

export const DatasetViewCon = styled.div`
  display: flex;
  flex-direction: column;

  &, & > div {
    width: 100%;
    height: 100%;
  }

  .ds-editor {
    border-bottom: 1px solid #E0E0E0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ds-cards {
    height: 200px;
    width: 100%;
    display: flex;
    gap: 1rem;
    align-items: center;

    .cards-con {
      padding: 0 0.5rem;
      overflow-x: auto;
      display: flex;
      height: 100%;
      align-items: center;
      gap: 1rem;
    }
  }
`;

export const DatasetInfoEditorCon = styled.div`
  margin-bottom: 1rem;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  .overflow-ellipsis {
    max-width: 100%;
  }

  button {
    width: fit-content;
  }
`;

export const DatasetDescInputCon = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;
