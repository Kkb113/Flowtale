import styled from 'styled-components';

export const DemoHubContainer = styled.div`
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding-left: 2.5%;
    background: #fafafa;
`;
export const ErrorMsg = styled.p`
  font-size: 14px;
  margin: 0px;
  color : red;
`;

export const EmptyState = styled.div`
  width: 600px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 5rem;

  p {
    width: 100%;
    margin: 0.5rem 0;
    transform: translateX(3rem);
  }
`;

export const ModalContainer = styled.div`
  margin-top: 14px;
`;

export const NewDemoModal = styled.div`
  padding: 1rem;

  .new-demo-modal-title{
    font-size: 1.1rem;
    font-weight: bold;
  }
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
  transition: box-shadow 0.3s ease-out;
  display: flex;
  align-items: center;

  &:hover {
    box-shadow: var(--card-box-shadow-active);
  }
`;

export const DisplayName = styled.h3`
  margin: 0;
  padding: 0;
  color: #16023E;
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

export const TourMetaDataCon = styled.div`
  color: #16023E;
  font-size: 11px;
  margin-top: 4px;
  font-style: normal;
  font-weight: 300;
  line-height: normal;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const DemoGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin: auto;
  padding: 1rem;
`;

export const TopPanel = styled.div`
  margin: 1rem;
  margin-right: 5rem;
  width : 600px;
`;
export const ToursHeading = styled.h1`
  color: #16023E;
  font-size: ${(props) => props.theme.typography.size.heading};
  font-weight: bold;
`;
export const Demo = styled.div`
  background-color: white;
  border-radius : 0.5rem;
  padding: 0.5rem 0.25rem;
  width: 260px;
  box-shadow: var(--card-box-shadow);
  transition: all 100ms;
  &:hover {
    box-shadow: var(--card-box-shadow-active);
    text-decoration: none;
    color: #16023e;
  }

  .image-container {
    width: 250px;
    height : 150px;
    margin: auto;
    position: relative;
    border-radius: 0.5rem;

    img {
      width: 100%;
      height : 100%;
      border-radius: 0.5rem;
      position: absolute;
      box-shadow: var(--card-box-shadow-secondary);
    }

    .option-overlay {
      opacity: 0;
      position: absolute;
      border-radius: 0.5rem;
      top: 0px;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.35);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      transition: all 100ms;

      a {
        padding: 0.25rem 0.75rem;
        border: none;
        outline: none;
        cursor: pointer;
        border-radius: 0.25rem;
        font-size: 0.8rem;
        text-decoration: none;
        font-weight: 500;
        box-shadow: rgb(22 2 69 / 25%) 0px 1px 1px, rgb(22 2 69 / 13%) 0px 0px 1px 1px;
        &:hover {
          box-shadow: rgb(22 2 69 / 100%) 0px 1px 1px, rgb(22 2 69 / 100%) 0px 0px 1px 1px;
        }
      }

      .edit {
        background-color: yellow;
        border-radius: 6px;
      }

      .preview {
        background-color: gray;
        color : white;
        border-radius: 6px;
        background-color: #7ceaf3;
        color : black;
      }

      &:hover {
        opacity: 1;
      }
    }
  }

  .footer-con {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
    padding: 0.5rem 0 0 0.5rem;
  }

  .demo-title {
    font-weight: bold;
    font-size: 1.2rem;
  }

  .overflow-ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .demohub-options {
    display: flex;
    gap: 0.25rem;
    justify-content: space-between;
    align-items: center;
    flex: 1 0 auto;

    .btn-grp {
      display: flex;
    }
  }
`;

export const CreateDemoBtn = styled.button`
    display: block;
    margin:1rem auto;
    border: none;
    font-size: 1.1rem;
    padding: 0.5rem 1rem;
    background-color: blue;
    color : white;
    border-radius : 1rem;
`;

export const ModalBodyCon = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-direction: column;
  color:  #212121;
  font-family: IBM Plex Sans;

  .sec-head {
    margin: 0.5rem 0;
  }

  .section-con {
    display: flex;
    gap: 0.5rem;
    flex-direction: column;
  }

  .pub-btn-txt-con {
    display: flex;
    justify-content: space-between;
  }

  p {
    margin: 0.15rem;
  }


  .pseudo-link {
    border-bottom: 1px dotted gray;
    cursor: pointer;

    &:hover {
      border-bottom: 1px solid gray !important;
    }
  }

  .cta-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin: 20px 0;
  }

  .cta-color {
    grid-template-columns: repeat(3, 1fr);
  }


`;
