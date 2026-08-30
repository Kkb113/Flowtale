import styled from 'styled-components';

export const UseCaseGraphs = styled.div<{singleRow?: boolean}>`
  width: ${props => (props.singleRow ? '100%' : '90%')};
  margin-top: 0;

  .tiny-graph {
    width: ${props => (props.singleRow ? '90%' : '600px')};
  }

  .collapse-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .pill-up {
    background: #7ceaf3;
    padding: 1px 4px;
    border-radius: 6px;
    font-weight: 500;
  }

  .typ-reg {
    line-height: 1.2rem;
    margin-top: ${props => (props.singleRow ? '0 !important' : 'unset')};
    margin-bottom: ${props => (props.singleRow ? '0 !important' : 'unset')};
  }

  .collapse-details {
    display: flex;
    gap: ${props => (props.singleRow ? '0.5rem' : '3rem')};
    flex-direction: ${props => (props.singleRow ? 'column' : 'row')}
  }

  /* .typ-h1 {
    display:${props => (props.singleRow ? 'none' : 'auto')};
    text-align: center;
    margin-bottom: 1.5rem;
    font-weight: 400;
  } */

  .use-case-collection {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: ${props => (props.singleRow ? '1fr' : '1fr 1fr')};
    margin-left: ${props => (props.singleRow ? '1rem' : '0')};
    width: 100%;
    .bar-graph-con {
      background: white;
      padding: 1rem;
      box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.05);
      outline: 1px solid rgba(0,0,0,0.1);
      border-radius: 1rem;
      .title {
        padding: 0 2rem;
        font-size: 1.25rem;
        margin-bottom: 0.25rem;
      }

      .subtitle {
        padding: 0 2rem;
        margin: 0;
        font-size: 0.8rem;
        opacity: 0.75;
      }

    }
  }

  .use-case-second-collection {
    margin: 4rem 0;
    display: grid;
    gap: 1.5rem;
    grid-template-columns: ${props => (props.singleRow ? '1fr' : '1fr 1fr')};
    
  }

  .secondary-graph {
      display: flex;
      flex-direction: column;
      background: white;
      padding: 1.5rem 2.5rem;
      border-radius: 16px;
      box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.05);
      outline: 1px solid rgba(0,0,0,0.1);
      gap: 1rem;

      .c-head {
        font-size: 1.3rem;
      }

      .c-metric {
        font-size: 2.5rem;
        font-weight: 500;
      }

      .sbs-con {
        display: flex;
        flex-direction: ${props => (props.singleRow ? 'column' : 'row')};
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
    }

  .large-graphs {
    box-sizing: content-box;
    margin-left: ${props => (props.singleRow ? '2rem' : '0')};
    width: 80%;
    margin: 2rem auto;
  }

  .dropdown {
    margin-bottom: ${props => (props.singleRow ? '0rem' : '4rem')};
    .typ-reg {
      margin: 1rem auto;
      font-size: 1rem;
    }

    .content {
      padding: 1rem;
    }
  }
`;
