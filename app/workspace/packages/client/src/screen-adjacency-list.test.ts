import { IAnnotationConfig } from '@fable/common/dist/types';
import { P_RespScreen } from './entity-processor';
import create from './screen-adjacency-list';

function getLinearConfigForAnnotationAndScreen(): [P_RespScreen[], Record<string, IAnnotationConfig[]>] {
  const allScreens = [
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 4 },
  ] as P_RespScreen[];

  const allAnnotations = {
    1: ([{
      refId: 'a1',
      buttons: [{ type: 'next',
        hotspot: {
          actionType: 'navigate',
          type: 'next',
          actionValue: '2/b2',
        } }]
    },
    { refId: 'b1', buttons: [{ type: 'next', hotspot: null }] },
    ] as IAnnotationConfig[]),
    2: ([
      { refId: 'a2', buttons: [{ type: 'next', hotspot: null }] },
      { refId: 'b2',
        buttons: [{
          type: 'next',
          hotspot: {
            actionType: 'navigate',
            type: 'next',
            actionValue: '2/c2',
          }
        }]
      },
      { refId: 'c2',
        buttons: [{
          type: 'next',
          hotspot: {
            actionType: 'navigate',
            type: 'next',
            actionValue: '3/a3',
          }
        }]
      }
    ] as IAnnotationConfig[]),
    3: ([
      { refId: 'a3', buttons: [{ type: 'next', hotspot: null }] },
      { refId: 'b3',
        buttons: [{ type: 'next', hotspot: null }]
      }
    ] as IAnnotationConfig[]),
  } as Record<string, IAnnotationConfig[]>;

  return [allScreens, allAnnotations];
}

describe('screen-annotation-directed-graph', () => {
  it('should create graph with single node', () => {
    const allScreens = [
      { id: 1 },
      { id: 2 },
    ] as P_RespScreen[];

    const allAnnotations = {
      1: ([
        { refId: 'a1', buttons: [{ type: 'next', hotspot: null }] },
        { refId: 'b1', buttons: [{ type: 'next', hotspot: null }] }
      ] as IAnnotationConfig[]),
    } as Record<string, IAnnotationConfig[]>;

    const adjList = create(allAnnotations, allScreens);
    expect(Object.keys(adjList)).toStrictEqual(['1', '2']);
    expect(adjList['1']).toStrictEqual([{ id: 1 }, [], []]);
    expect(adjList['2']).toStrictEqual([{ id: 2 }, [], []]);
  });

  it('should create graph with double nodes for annotation in one screen', () => {
    const allScreens = [
      { id: 1 },
      { id: 2 },
    ] as P_RespScreen[];

    const allAnnotations = {
      1: ([
        { refId: 'a1', buttons: [{ type: 'next', hotspot: null }] },
        { refId: 'b1',
          buttons: [{
            type: 'next',
            hotspot: {
              actionType: 'navigate',
              type: 'next',
              actionValue: '1/a1',
            }
          }]
        }
      ] as IAnnotationConfig[]),
    } as Record<string, IAnnotationConfig[]>;

    const adjList = create(allAnnotations, allScreens);
    expect(Object.keys(adjList)).toStrictEqual(['1', '2']);
    expect(adjList['1']).toStrictEqual([{ id: 1 }, [], []]);
    expect(adjList['2']).toStrictEqual([{ id: 2 }, [], []]);
  });

  it('should create graph with multiple nodes across different screens with loop in screens', () => {
    const allScreens = [
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
    ] as P_RespScreen[];

    const allAnnotations = {
      1: ([
        { refId: 'z1', buttons: [{ type: 'next', hotspot: null }] },
        {
          refId: 'a1',
          buttons: [
            {
              type: 'next',
              hotspot: { actionType: 'navigate', actionValue: '3/b3' }
            }, {
              type: 'prev',
              hotspot: { actionType: 'navigate', actionValue: '2/b2' }
            }]
        },
        {
          refId: 'b1',
          buttons: [{
            type: 'next',
            hotspot: { actionType: 'navigate', actionValue: '2/b2' }
          }, {
            type: 'prev',
            hotspot: { actionType: 'navigate', actionValue: '2/c2' }
          }],
        },
        { refId: 'c1',
          buttons: [{
            type: 'next',
            hotspot: { actionType: 'navigate', actionValue: '1/a1' }
          }],
        }
      ] as IAnnotationConfig[]),
      2: ([
        { refId: 'a2', buttons: [{ type: 'next', hotspot: null }] },
        {
          refId: 'b2',
          buttons: [{
            type: 'next',
            hotspot: { actionType: 'navigate', actionValue: '1/c1' }
          }]
        },
        {
          refId: 'c2',
          buttons: [{
            type: 'next',
            hotspot: { actionType: 'navigate', actionValue: '1/b1' }
          }]
        }
      ] as IAnnotationConfig[]),
      3: ([
        { refId: 'a3', buttons: [{ type: 'next', hotspot: null }] },
        { refId: 'b3',
          buttons: [{
            type: 'next',
            hotspot: { actionType: 'navigate', actionValue: '2/a2', }
          }, {
            type: 'prev',
            hotspot: { actionType: 'navigate', actionValue: '1/a1', }
          }]
        }
      ] as IAnnotationConfig[]),
    } as Record<string, IAnnotationConfig[]>;

    const adjList = create(allAnnotations, allScreens);
    expect(Object.keys(adjList)).toStrictEqual(['1', '2', '3', '4']);
    expect(adjList['1']).toStrictEqual([{ id: 1 }, [{ id: 3 }, { id: 2 }], [{ id: 2 }]]);
    expect(adjList['2']).toStrictEqual([{ id: 2 }, [{ id: 1 }], []]);
    expect(adjList['3']).toStrictEqual([{ id: 3 }, [{ id: 2 }], [{ id: 1 }]]);
  });
});
