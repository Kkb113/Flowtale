import styled from 'styled-components';

export const Con = styled.div`
  display: flex;
  height: calc(100vh - 48px);
  .ant-tabs-nav {
    margin: 0px;
  }
  .ant-tabs-ink-bar {
    background: #160245 !important;
  }
  .ant-collapse-item {
    margin-bottom: 0.75rem;
    border-radius: 8px !important;
    background: #e0e0e029;
    border: none;

    .ant-collapse-header {
      background: #e0e0e029;
    }

    .ant-collapse-content {
      background: #e0e0e029;
      border-bottom-right-radius: 8px;
      border-bottom-left-radius: 8px;
    }
  }

  .ant-collapse-item-active {
    box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
  }

  .ant-collapse {
    background: unset;
  }

  .ht {
    .ant-tabs-tab {
      background: unset;
      border: none;

      &.ant-tabs-tab-active {
        border-radius: 8px;
        background: #fff;
        border: 1px solid #dddddd;
      }
    }
  }
`;

export const Sidepanel = styled.div`
  width: 390px;
  background: #F5F5F5;
  box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
  z-index: 2;
  overflow-y: auto;
  min-width: 380px;
`;

export const SidepanelCon = styled.div`
  display: flex;
  flex-direction: column;
  /* gap: 1rem; */
  padding-top: 1rem;

  p {
    margin: 0.5rem 0;
  }

  .grooveable {
    .expand.opened {
      width: calc(100% + 40px);
      transform: none;
      position: relative;
      left: -34px;
      border: 1px solid #9E9E9E;
    }

    .expand.closed {
      width: calc(100%);
      left: 0px;
      border: 1px solid transparent;
    }

    &.opened {
      padding: 10px 10px;
      margin: 0 0 10px 0;

      .grooveable-header {
        margin-bottom: 10px;
      }
    }
    &.closed {
      padding: 0;
    }
  }

  .opened {
    background: white;
    border-radius: 8px;
    margin: 6px 10px;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
    transition: all 0.2s ease-out;
  }

  .closed {
    background: transparent;
    border-radius: 0px;
    margin: 0;
    box-shadow: none;
    transition: all 0.2s ease-out;
  }
`;

export const Main = styled.div`
  flex-grow: 1;
  background-color: #E0E0E0;
`;

export const PreviewCon = styled.div`
  padding: 1rem;
  height: calc(100vh - 48px - 2rem);
`;

export const PreviewIFrame = styled.iframe`
  border: none;
  width: 100%;
  height: 100%;
  background-color: white;
  box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;
  border-radius: 16px;
`;

export const InputTextCon = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const QfcnStepsCollapseCon = styled.div`
  padding-top: 8px;
`;
