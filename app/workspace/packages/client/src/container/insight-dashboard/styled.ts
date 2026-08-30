/* eslint-disable no-mixed-operators */
import styled from 'styled-components';

export const Ctrl = styled.div`
 .ant-segmented {
  margin-bottom: 8px;
  border-radius: 4px;
  box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;

  .ant-segmented-item-selected {
    border-radius: 4px;
    font-weight: 500;
  }
 }
`;

export const Row = styled.div`
  display: flex;
  flex-direction: row;
  margin: 1rem 2rem;
  width: 65%;
  min-width: 750px;
  max-width: 950px;
  justify-content: space-between;
  gap: 2rem;
`;

export const Card = styled.div<{ $loading?: boolean }>`
  position: relative;
  flex: 1 1 auto;

  .content {
    display: flex;
    flex-direction: column;
    background: white;
    padding: 1.5rem 2.5rem;
    border-radius: 16px;
    box-shadow: var(--card-box-shadow-active);
    gap: 1rem;
    filter: ${props => (props.$loading ? 'blur(5px)' : 'blur(0px)')};
  }

  .c-head {
    font-size: 1.3rem;
  }

  .c-metric {
    font-size: 2.5rem;
    font-weight: 500;
  }

  .sbs-con {
    display: flex;
    flex-direction: row;
    gap: 2rem;
    align-items: center;
    justify-content: space-evenly;
  }

  .subsubtitle {
    font-size: 0.8rem;
  }

  .help-text {
    line-height: 1rem;
    font-size: 0.85rem;
    color: #616161;
  }

  .subtitle {
    font-size: 1.2rem;
  }

  .loader {
    display: ${props => (props.$loading ? 'flex' : 'none')};
    justify-content: center;
    align-items: center;
    position: absolute;
    z-index: 2;
    background: #fafafa94;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    border-radius: 16px;
    font-size: 3rem;
  }
`;

export const AnnTimeSpent = styled.span<{val: number, maxVal: number, hueRotation: number}>`
  font-size: 12px;
  color: #616161;
  padding: 2px 2px 2px 2px;
  /* -webkit-transition: filter 0.3s ease-out;
  transition: filter 0.3s ease-out;  */
  position: relative;
  font-size: 11px;
  font-weight: 500;
  font-family: "IBM Plex Mono", monospace;

  &:after {
    position: absolute;
    content: '';
    left: 0;
    bottom: -8px;
    width: ${props => `calc(10px + ${Math.round((props.val - 1) / (props.maxVal - 1) * 100)}px)`};
    background: #7ceaf3;
    filter: ${props => `hue-rotate(${props.hueRotation}deg) brightness(100%)`};
    height: 8px;
    border-radius: 2px;
  }

  &:hover {
    cursor: pointer;
  }

  &:hover:after {
    cursor: pointer;
    background: #b0a6c9;
    filter: ${props => `hue-rotate(${props.hueRotation}deg) brightness(90%)`};
  }
`;

export const LeadActivity = styled.div`
  overflow: hidden;
  height: 100%;
  transition: all ease-out 0.15s;

  ::-webkit-scrollbar {
    background: transparent;
    width: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: #999;
  }

  a {
    color: #160245;
    cursor: pointer;
    border-bottom: 1px dotted;

    &:hover {
      border-bottom: 1px solid;
    }
  }

  .ant-timeline-item {
    padding-bottom: 8px !important;

    .ant-timeline-item-head {
      background-color: #bdbdbd !important;
      border-color: #bdbdbd !important;
      color: #bdbdbd !important;
    }

    .ant-timeline-item-label {
      line-height: 1rem;
      font-size: 0.85rem;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      direction: rtl;
      text-align: right;
    }
  }


  .lead-list {
    max-width: 35%;
    height: 100%;
    overflow-y: scroll;
    overflow-x: hidden;
  }

  .session-header {
    text-align: center;
    font-weight: 500;
    background: #eaeaea;
    margin-bottom: 1rem;
    padding: 2px 0;
    border-radius: 4px;

    & > span {
      margin-right: 0.5rem;
    }
  }

  .activity-title > span {
    background: #f0f0f0;
    padding: 0px 6px;
    border-radius: 4px;
    font-weight: 500;
  }

  .activity-desc-con {
    padding-left: 0.5rem;
    margin-left: 0.5rem;
    font-size: 0.75rem;

    .activity-desc > span {
      margin-right: 0.25rem;
    }

    margin: 0.5rem 0rem 1.5rem;
  }

  .activity-history {
    flex: 1 0 auto;
    border-radius: 16px;
    padding: 2rem 1.5rem;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
    display: flex;
    overflow: hidden;
    margin: 0.5rem;

    &.empty {
      font-size: 12px;
      color: gray;
      max-height: 360px;
      align-items: center;
      justify-content: center;
    }

    .con {
      display: flex;
      gap: 1.5rem;
      flex: 1 0 auto;

      .timeline {
        flex: 1 0 auto;
        height: 100%;
        overflow-y: scroll;
        overflow-x: hidden;
        padding-right: 1rem;
      }

      .side-panel-info {
        flex: 0 1 auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 0 0.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #E0E0E0;
      }

      table {
        font-size: 0.85rem;

        tr {
          border-bottom: 1px solid lightgray;
          td {
            padding: 2px 4px;

            &:nth-child(1),&:nth-child(2) {
              opacity: 0.8;
            }
            &:nth-child(1) {
              padding: 2px 0;
            }
            &:last-child {
              font-weight: 500;
            }
          }
        }
      }
    }
  }

  display: flex;
  gap: 3rem;
  justify-content: space-between;
`;

export const LeadItem = styled.div`
  padding: 0.5rem 0.15rem;
  margin-top: 0.15rem;
  border-radius: 4px;
  border-bottom: 1px solid lightgray;
  transition: background ease-out 0.2s;
  cursor: pointer;

  &:hover, &.selected {
    background: #eaeaea;
  }

  .line2 {
    margin-top: 0.5rem;

    span {
      padding-right: 0.5rem;
    }
  }

  .line3 {
    margin-top: 0.25rem;
    span {
      padding-right: 0.5rem;
    }
  }
`;

export const TimelineLabelTooltip = styled.div`
  font-size: 0.8rem;
  line-height: 1.05rem;

  div {
    margin: 0.5rem 0;
  }

  .hlpr {
    opacity: 0.75;
  }
`;

export const Colored = styled.span<{hueRotation: number}>`
  background-color: #b0a6c9;
  color: white;
  border-radius: 4px;
  padding: 2px 5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: break-word;
  filter: ${props => `hue-rotate(${props.hueRotation}deg) brightness(85%) contrast(150%)`};
`;
