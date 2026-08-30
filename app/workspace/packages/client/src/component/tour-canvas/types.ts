import { GraphEdge } from 'dagre';
import { ITourDataOpts } from '@fable/common/dist/types';
import { IAnnotationConfigWithScreen } from '../../types';

export interface AnnotationNode<T> extends CanvasNode {
  imageUrl: string;
  stepNumber: string;
  grp: string;
  localIdx: number;
  text: string;
  id: string;
  storedData: T;
  origStoredData: T;
  sameMultiAnnGroupAnnRids?: string[],
  annotation: IAnnotationConfigWithScreen;
  journeyTitle?: string;
  opts: ITourDataOpts;
}

export interface GroupedAnns {
  zId: string,
  anns: IAnnotationConfigWithScreen[]
}

export interface GroupedAnnNode {
  zId: string,
  anns: AnnotationNode<Box>[]
}

export interface GroupEdge {
  fromAnnId: string,
  toAnnId: string,
  fromZId: string,
  toZId: string,
}

export interface MultiAnnotationNode<T> extends CanvasNode {
  id: string;
  storedData?: T;
  origStoredData?: T;
  data: GroupedAnnNode;
}

export interface Box extends CanvasNode {
  cx: number;
  cy: number;
}

export interface EdgeWithData extends GraphEdge {
  srcId: string;
  destId: string;
  data: GroupEdge;
}

export interface CanvasNode {
  x: number;
  y: number;
  height: number;
  width: number;
}

export type Point = {
  x: number;
  y: number;
};

export interface CanvasGrid {
  gridSize: number;
  gridDotSize: number;
  initial: {
    tx: number;
    ty: number;
    scale: number;
  }
}

export type LRPostion = 'l' | 'r';

export type ModalPosition = [number| null, number | null, LRPostion];

export type AnnAddScreenModal = {
  position: ModalPosition,
  annId: string,
  annotationPosition: AnnotationPosition,
  screenAnnotation: IAnnotationConfigWithScreen | null
}

export type AnnotationPosition = 'prev' | 'next';
