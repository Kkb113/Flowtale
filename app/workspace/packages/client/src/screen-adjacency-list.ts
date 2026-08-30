import { IAnnotationConfig } from '@fable/common/dist/types';
import { P_RespScreen } from './entity-processor';

// INFO Ideally we should just get the connected component of the graph for which the main (entry point)
// is defined.
// Right now this logic gets all the nodes irrespective of the situation if the node is reachable or not from current
// entry point (disconnected from main graph).

export type ScreenAdjacencyList = Record<string, [screen: P_RespScreen, next: P_RespScreen[], prev: P_RespScreen[]]>;

export default function create(
  allAnnotations: Record<string, IAnnotationConfig[]>,
  allScreens: P_RespScreen[],
): ScreenAdjacencyList {
  const adjList: ScreenAdjacencyList = {};

  const flatAnnMap: Record<string, IAnnotationConfig> = {};
  for (const [screenId, anns] of Object.entries(allAnnotations)) {
    for (const an of anns) {
      flatAnnMap[`${screenId}/${an.refId}`] = an;
    }
  }
  const flatScreenMap: Record<string, P_RespScreen> = {};
  for (const screen of allScreens) {
    flatScreenMap[screen.id] = screen;
    adjList[screen.id] = [screen, [], []];
  }

  for (const [annId, an] of Object.entries(flatAnnMap)) {
    const [screenId] = annId.split('/');
    const adjacentList = adjList[screenId];

    // TODO this is a hotfix, since sometime an annotation gets added to a wrong tour (as a bug)
    // this is to guard against that
    if (!adjacentList) continue;

    const btns = an.buttons;
    for (const btn of btns) {
    // If annotation is hotspot then the next button's action is used to create the interactive element
    // TODO this creates confusion and requires multiple if else checking. Ideally create a special type of button
    // called hotspot
      if (an.isHotspot) {
        if (btn.type !== 'next' && btn.exclude) continue;
      } else if (btn.exclude) continue;
      if (!(btn.hotspot && btn.hotspot.actionType === 'navigate')) continue;
      const idx = btn.type === 'prev' ? 2 : 1;
      const adjScreen = adjacentList[idx];
      const toAnnId = btn.hotspot.actionValue;
      const [toScreenId] = toAnnId._val.split('/');
      if (toScreenId === screenId) {
        continue;
      }
      const screen = adjScreen.find(s => s.id === +toScreenId);
      if (!screen) {
        adjScreen.push(flatScreenMap[toScreenId]);
      }
    }
  }

  return adjList;
}

export interface QueueNode {
  screen: P_RespScreen;
  level: number;
  startScreenId: number;
}

export const bfsTraverse = (
  graph: ScreenAdjacencyList,
  startScreens: P_RespScreen[],
  nLevels: number,
  dir: 'prev' | 'next',
): {
  traversedNodes: QueueNode[],
  lastLevelNodes: P_RespScreen[],
} => {
  const visited = new Set<number>();
  const queue: QueueNode[] = [];
  const traversedNodes: QueueNode[] = [];
  const lastLevelNodes: P_RespScreen[] = [];

  for (const startScreen of startScreens) {
    queue.push({ screen: startScreen, level: 0, startScreenId: startScreen.id });
  }

  while (queue.length > 0) {
    const { screen, level, startScreenId } = queue.shift()!;

    if (level > nLevels) {
      break;
    }

    if (level === nLevels) {
      lastLevelNodes.push(screen);
    }

    if (!visited.has(screen.id)) {
      traversedNodes.push({
        screen,
        level,
        startScreenId
      });
      visited.add(screen.id);

      const neighbors = dir === 'prev' ? graph[screen.id][2] : graph[screen.id][1];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          queue.push({ screen: neighbor, level: level + 1, startScreenId });
        }
      }
    }
  }

  return { traversedNodes, lastLevelNodes };
};
