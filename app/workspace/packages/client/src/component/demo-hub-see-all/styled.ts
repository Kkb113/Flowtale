import { Modal } from 'antd';
import styled from 'styled-components';

const size = {
  mobileM: '375px',
  mobileL: '425px',
  tablet: '768px',
  laptop: '1024px',
};

interface SectionProps {
}

export const Section = styled.div`
`;

export const DemoModal = styled(Modal)`
  .ant-modal-content {
    background-color: var(--f-demomodal-bg-color);
    color: var(--f-demomodal-font-color);
    border: 1px solid var(--f-demomodal-border-color);
    border-radius: var(--f-demomodal-border-radius);
    box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, rgba(0, 0, 0, 0.07) 0px 2px 4px, rgba(0, 0, 0, 0.07) 0px 4px 8px, rgba(0, 0, 0, 0.07) 0px 8px 16px, rgba(0, 0, 0, 0.07) 0px 16px 32px, rgba(0, 0, 0, 0.07) 0px 32px 64px;
  }

  .ant-modal-header {
    background-color: var(--f-demomodal-bg-color);
  }

  .ant-modal-title {
    color: var(--f-demomodal-font-color);
  }

  .ant-modal-footer {
    display: flex;
    justify-content: center;
  }
`;

interface BodyTextProps {
    fontColor: string;
    bgColor: string;
}

export const BodyText = styled.div`
    color: ${(props: BodyTextProps) => `${props.fontColor}`};
    background-color: ${(props: BodyTextProps) => `${props.bgColor}`};
    padding: 10px;
    padding-left: 2rem;
    margin-bottom: 20px;
`;

export const CTACon = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    background: white;
    display:none;
    padding: 40px 0;
    width: 100%;
    right: 1px;
    z-index: 999999;
    position: absolute;
    top: 65px;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;

    &.open-cta-con {
        display: flex;
    }
  }
`;

export const RespCTACon = styled.div`
  display: flex;

  .menu-icon {
    display: none;
  }
      
  @media (max-width: 768px) {
    .menu-icon {
        font-size: 30px;
        display: flex;
    }
}
`;

export const DHPage = styled.div`
  min-height: 100%;
  background-color: var(--f-body-bg-color);

  .header {
    z-index: 999;
    position: fixed;
    width: 100%;
    box-sizing: border-box;
    top: 0;
    color: var(--f-header-font-color);
    background-color: var(--f-header-bg-color);
    height: 60px;
    padding: 0.75rem 1.9rem;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .logo {
      height: 100%;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;

      > img {
        height: 100%;
        max-height: 40px;
      }
    }

    .title{
      margin-left: 8rem;
      font-size: 1.85rem;
      font-weight: 500;
    }
  }

  .banner {
    display: flex;
    padding: 2rem 0 3rem 0;
    justify-content: center;
    flex-direction: column;
    align-items: center;
    background-color: var(--f-header-bg-color);
    color: var(--f-header-font-color);

    .title {
      margin: 1.5rem;
      font-size: 2.4rem;
      font-weight: 700;
    }

     .subtitle {
      margin: 0rem;
      font-size: 1.6rem;
      line-height: 1.8rem;
      font-weight: 300;
    }
  }

  .body {
    padding: 2rem 0 3rem 0;
    background-color: var(--f-body-bg-color);
    color: var(--f-body-font-color);
    // padding: 0.75rem
      calc(
        var(--f-page-content-gutter) * 1% + var(--f-body-content-gutter) * 1%
      );
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 2rem auto;
    max-width: 940px;
    align-items: center;
  }

  .desc {
    font-size: 1.3rem;
    text-align: center;
  }

  .section-con {
    display: flex;
    flex-direction: column;
    gap: 3rem;
    margin-bottom: 1rem;
    align-items: center;

    > .section {
      padding: 1rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      align-items: center;

      > p {
        margin: 0;
      }
    }

    .title {
      font-weight: 400;
      display: flex;
      justify-content: center;
      font-size: 1.8rem;
    }
  }

  .demo-card-con {
    gap: 25px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin-bottom: 0.5rem;
  }

  .demo-card {
    background-color: var(--f-democard-bg-color);
    border: 1px solid var(--f-democard-border-color);
    border-radius: var(--f-democard-border-radius);
    color: var(--f-democard-font-color);

    padding: 0.5rem;
    width: 280px;
    height: 340px;
    margin: 0 auto;
    box-sizing: border-box;
    cursor: pointer;
    box-shadow: rgba(26, 19, 72, 0.2) 0px 0px 25px 0px;
    transition: all 0.2s ease-out;

    &:hover {
    transform: translateY(-15px);
    transition: transform .4s ease;
    }

    .thumb-con{
      position: relative;
      width: 100%;
      height: 200px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      overflow: hidden;
      margin-bottom: 1rem;
      border-radius: var(--f-democard-border-radius);
    }

    .thumb-overlay {
      position: absolute;
      inset: 0;
      background-color: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .thumb {
      width: 100%;
      display: block;
      object-fit: cover;
      height: 100%;
    }

    .card-cta {
      font-size: 1rem;
      width: 40px;
      height: 40px;
      padding: 4px;
      white-space: nowrap;
      overflow: hidden;
      display: inline-block;
    }

    .card-cta-active {
      width: 155px;
      height: 42px;
      transition: all .3s ease;
    }

    > .demo-name {
      font-weight: 600;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
      text-align: left;
    }
    
    > .demo-description {
     margin-top: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    }
  }

  .q-body {
    display: flex;
    height: 100%;
    background-color: color-mix(
      in srgb,
      var(--f-sidepanel-con-bg-color) 92%,
      black
    );
  }

  .sidepanel-con {
    width: 22vw;
    max-width: 320px;
    border-right: 1px solid lightgray;
    color: var(--f-sidepanel-con-font-color);
    background-color: var(--f-sidepanel-con-bg-color);
    border-right: 1px solid var(--f-sidepanel-con-border-color);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;

    .sidepanel-card {
      color: var(--f-sidepanel-card-font-color);
      background-color: var(--f-sidepanel-card-bg-color);
      border: 1px solid var(--f-sidepanel-card-border-color);
      border-radius: var(--f-sidepanel-card-border-radius);
      font-size: 1rem;
      padding: 0.5rem 1rem;
      box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px,
        rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease-out;

      .card-title {
        display: flex;
        gap: 0.5rem;
        font-weight: 600;
      }

      .substep {
        font-size: 0.9rem;
        opacity: 0.9;
        font-weight: 400;
        margin-top: 0.75rem;

        &:before {
          content: "";
          position: absolute;
          width: 1px;
          height: 12px;
          border-left: 1px dashed var(--f-sidepanel-card-font-color);
          transform: translate(7px, -12px);
        }

        &.completed {
          &:before {
            border-left: 1px solid var(--f-sidepanel-card-font-color);
          }
        }

        .sidepanel-card-title {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    .cta-con {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin: 0.25rem 0;

      > a {
        min-width: 240px;
        text-align: center;

        button {
          width: 100% !important;
        }
      }
    }
  }

  @media (max-width: 940px) {
    .demo-card-con {
      grid-template-columns: repeat(2, 1fr);
    }
  }     

  @media (max-width: 640px) {
  .demo-card-con {
    grid-template-columns: repeat(1, 1fr);
  }
  }   
`;

export const RootCon = styled(DHPage)`

`;

export const PreviewFrameWrapper = styled.div<{ showOverlay: boolean }>`
  flex-grow: 1;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem;
  position: relative;
  margin: auto;

  .replay-overlay {
    width: 100%;
    height: 100%;
    position: absolute;    
    background-color: ${({ showOverlay }) => (showOverlay ? 'rgba(0, 0, 0, 0.8)' : '')};
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: center;
    align-items: center;
  }

  .preview-frame {
    display: block;
    border: none;
    height: 100%;
  }
`;
