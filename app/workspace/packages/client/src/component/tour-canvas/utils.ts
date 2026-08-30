import { IAnnotationConfig, ITourDataOpts, JourneyData } from '@fable/common/dist/types';
import { AnnotationNode, Box, Point, MultiAnnotationNode, GroupedAnns, GroupEdge } from './types';
import { AnnotationPerScreen, IAnnotationConfigWithScreen, Timeline } from '../../types';
import { getAnnotationBtn, getAnnotationByRefId } from '../annotation/ops';
import { baseURL, getAnnotationWithScreenAndIdx } from '../../utils';
import { IAnnotationConfigWithScreenId } from '../annotation/annotation-config-utils';

function getGroupedAnnNodesFromAnnNodeBoxArr(timeline: Timeline): GroupedAnns[] {
  const groups: Record<string, IAnnotationConfigWithScreen[]> = {};

  timeline.forEach(singleTimeline => {
    singleTimeline.forEach((annotation) => {
      if (groups[annotation.zId]) {
        groups[annotation.zId].push(annotation);
      } else {
        groups[annotation.zId] = [annotation];
      }
    });
  });

  return Object.entries(groups).map((el) => ({
    zId: el[0],
    anns: el[1]
  }));
}

export function getMultiAnnNodesAndEdges(
  data: Timeline,
  dim: {width: number, height: number, gap: number},
  journey: JourneyData,
  opts: ITourDataOpts,
): [MultiAnnotationNode<Box>[], GroupEdge[]] {
  const groupedAnnNodes = getGroupedAnnNodesFromAnnNodeBoxArr(data);
  const multiAnnNodes: MultiAnnotationNode<Box>[] = [];
  const edges: GroupEdge[] = [];

  const annIdJourneyMap: Record<string, string> = {};
  journey.flows.forEach(flow => annIdJourneyMap[flow.main] = flow.header1);

  groupedAnnNodes.forEach((group, groupIdx) => {
    const annsWithNewDims: AnnotationNode<Box>[] = group.anns.map((annotation, annIdx) => {
      const annId = `${annotation.screen.id}/${annotation.refId}`;
      const newX = annIdx * dim.gap;
      const newY = annIdx * dim.gap;
      const width = dim.width;
      const height = dim.height;
      const dimData: Box = { x: newX, y: newY, width, height, cx: 0, cy: 0 };

      const nextBtn = getAnnotationBtn(annotation, 'next');

      if (nextBtn.hotspot && nextBtn.hotspot.actionType === 'navigate') {
        const toId = nextBtn.hotspot.actionValue;
        const toAnnId = toId._val.split('/')[1];
        const toAnn = getAnnotationWithScreenAndIdx(toAnnId, data)!;
        edges.push({
          fromAnnId: annId,
          toAnnId: toId._val,
          fromZId: annotation.zId,
          toZId: toAnn.zId,
        });
      }

      return {
        ...annotation,
        id: annId,
        localIdx: groupIdx,
        grp: annotation.grpId,
        width: dim.width,
        height: dim.height,
        imageUrl: annotation.screen.thumbnailUri.href,
        text: annotation.displayText,
        stepNumber: annotation.stepNumber,
        annotation,
        x: newX,
        y: newY,
        storedData: dimData,
        origStoredData: dimData,
        journeyTitle: annIdJourneyMap[annId],
        sameMultiAnnGroupAnnRids: group
          .anns
          .filter(ann => ann.refId !== annotation.refId)
          .map(ann => ann.refId),
        opts,
      };
    });

    const groupWidth = dim.width + (annsWithNewDims.length - 1) * dim.gap;
    const groupHeight = dim.height + (annsWithNewDims.length - 1) * dim.gap;

    multiAnnNodes.push({
      id: group.zId,
      x: 0,
      y: 0,
      width: groupWidth,
      height: groupHeight,
      data: {
        zId: group.zId,
        anns: annsWithNewDims,
      }
    });
  });

  return [multiAnnNodes, edges];
}

export function formPathUsingPoints(points: Point[]): string {
  let d = 'M ';
  points.forEach((point, index) => {
    if (index === 0) {
      d += Object.values(point).join(',');
    }
    d = `${d} L ${Object.values(point).join(',')}`;
  });
  return d;
}

export function getEndPointsUsingPath(d: string): [Point, Point] {
  const commands = d.split(/(?=[LMC])/);
  const pointArrays = commands.map((dStr: string) => {
    const pointsArray = dStr.slice(1, dStr.length).split(',');
    const pairsArray = [];
    for (let i = 0; i < pointsArray.length; i += 2) {
      pairsArray.push([+pointsArray[i], +pointsArray[i + 1]]);
    }
    return pairsArray[0];
  });

  const start = pointArrays[0];
  const end = pointArrays[pointArrays.length - 1];

  return [{ x: start[0], y: start[1] }, { x: end[0], y: end[1] }];
}

export const getMDNewline = (): string => {
  const newLine = `
`;
  return newLine;
};

export const normalizeMdStr = (str: string): string => str.trim().replace(/\n+/g, '. ');

export const getMDPara = (content: string, shouldNormalize: boolean = true): string => {
  let mdPara = `${content}`;
  if (shouldNormalize) mdPara = normalizeMdStr(mdPara);
  mdPara += getMDNewline();
  mdPara += getMDNewline();
  return mdPara;
};

export const getTourIntroMDStr = (title: string, description: string, manifestPath: string): string => {
  let mdStr = '';
  mdStr += getMDPara(`[${title} Demo](${manifestPath})`, false);
  mdStr += getMDPara(`${description}`);
  return mdStr;
};

export const getJourneyIntroMDStr = (title: string, description: string): string => {
  let mdStr = '';
  mdStr += getMDPara(`### ${title}`);
  mdStr += getMDPara(`${description}`);
  return mdStr;
};

export const getAnnotationTextsMDStr = (annConfigs: IAnnotationConfig[]): string => {
  let mdStr = '';
  annConfigs.forEach(ann => {
    mdStr += `- ${normalizeMdStr(ann.displayText)}`;
    mdStr += getMDNewline();
  });
  mdStr += getMDNewline();
  return mdStr;
};

export const getAnnotationsInOrder = (
  main: string,
  allAnnotationsForTour: AnnotationPerScreen[]
): IAnnotationConfig[] => {
  const firstAnn = getAnnotationByRefId(main.split('/')[1], allAnnotationsForTour)!;

  const annsInOrder: IAnnotationConfig[] = [];
  let ann = firstAnn;
  while (true && ann) {
    annsInOrder.push(ann);

    const nextBtn = getAnnotationBtn(ann, 'next')!;
    if (!nextBtn.hotspot || nextBtn.hotspot.actionType === 'open') {
      break;
    }
    const nextAnnRefId = nextBtn.hotspot.actionValue._val.split('/')[1];
    ann = getAnnotationByRefId(nextAnnRefId, allAnnotationsForTour)!;
  }

  return annsInOrder;
};

export const getValidFileName = (input: string): string => {
  const nonLetterSpaceChars = /[^a-zA-Z\s]/g;
  return input.replace(nonLetterSpaceChars, '').replaceAll(' ', '-');
};

export const downloadFile = (content: string, filename: string, type: string): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};
