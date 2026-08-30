/* eslint-disable react/no-this-in-sfc */
import { nanoid } from 'nanoid';
import {
  BarsOutlined,
  ContainerFilled,
  DisconnectOutlined,
  FileAddFilled,
  FileImageOutlined,
  HourglassFilled,
  MobileFilled,
  SettingFilled,
  SisternodeOutlined,
} from '@ant-design/icons';
import {
  CmnEvtProp,
  JourneyData,
  IAnnotationConfig,
  ITourDataOpts,
  ITourEntityHotspot,
  ScreenData,
  IGlobalConfig
} from '@fable/common/dist/types';
import { Modal, Button, Tooltip } from 'antd';
import { FrameSettings, ReqTourPropUpdate, Responsiveness } from '@fable/common/dist/api-contract';
import { D3DragEvent, drag, DragBehavior, SubjectPosition } from 'd3-drag';
import { pointer as fromPointer, select, selectAll, Selection as D3Selection } from 'd3-selection';
import { curveBasis, line } from 'd3-shape';
import { D3ZoomEvent, ZoomBehavior, zoom, zoomIdentity } from 'd3-zoom';
import dagre from 'dagre';
import React, { useEffect, useRef, useState } from 'react';
import { traceEvent } from '@fable/common/dist/amplitude';
import { interpolate } from 'd3-interpolate';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import { createLiteralProperty, getRandomId } from '@fable/common/dist/utils';
import * as GTags from '../../common-styled';
import {
  updateGrpIdForTimelineTillEnd,
  deleteAnnotation,
  deleteConnection,
  getAnnotationByRefId,
  reorderAnnotation,
  groupUpdatesByAnnotation,
} from '../annotation/ops';
import { Tx } from '../../container/tour-editor/chunk-sync-manager';
import { P_RespScreen, P_RespSubscription, P_RespTour } from '../../entity-processor';
import {
  AllEdits,
  AllGlobalElEdits,
  AnnotationPerScreen,
  DestinationAnnotationPosition,
  EditItem,
  ElEditType,
  ElPathKey,
  IAnnotationConfigWithScreen,
  JourneyOrOptsDataChange,
  MultiNodeModalData,
  NavFn,
  ScreenMode,
  ScreenPickerData,
  Timeline,
  TourDataChangeFn,
  TourMainValidity,
  onAnnCreateOrChangeFn
} from '../../types';
import {
  IAnnotationConfigWithScreenId,
  updateAnnotationZId,
  updateButtonProp,
  updateTourDataOpts,
} from '../annotation/annotation-config-utils';
import { AnnUpdateType } from '../annotation/types';
import { dSaveZoomPanState } from './deferred-tasks';
import * as Tags from './styled';
import {
  AnnAddScreenModal,
  AnnotationNode,
  AnnotationPosition, CanvasGrid,
  EdgeWithData,
  GroupEdge,
  LRPostion,
  ModalPosition,
  MultiAnnotationNode
} from './types';
import {
  downloadFile, formPathUsingPoints, getAnnotationTextsMDStr,
  getAnnotationsInOrder, getEndPointsUsingPath, getJourneyIntroMDStr,
  getMultiAnnNodesAndEdges, getTourIntroMDStr, getValidFileName
} from './utils';
import {
  doesBtnOpenALink,
  isEventValid,
  isFeatureAvailable,
  isNavigateHotspot,
  isTourResponsive,
  updateLocalTimelineGroupProp
} from '../../utils';
import NewAnnotationPopup from './new-annotation-popup';
import ShareEmbedDemoGuide from '../../user-guides/share-embed-demo-guide';
import SelectorComponent from '../../user-guides/selector-component';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import LoaderEditor from '../../container/loader-editor';
import ScreenEditor from '../screen-editor';
import CloseIcon from '../../assets/tour/close.svg';
import CreateJourney from '../../container/create-journey';
import Header, { HeaderProps } from '../header';
import DeleteIcon from '../../assets/icons/canvas-delete.svg';
import EditingInteractiveDemoGuidePart1 from '../../user-guides/editing-interactive-demo-guide/part-1';
import ExploringCanvasGuide from '../../user-guides/exploring-canvas-guide';
import { UserGuideMsg } from '../../user-guides/types';
import { SCREEN_EDITOR_ID } from '../../constants';
import 'd3-transition';
import { UpdateScreenFn } from '../../action/creator';
import ResponsiveStrategyDrawer from './responsive-strategy-drawer';
import { amplitudeOpenResponsivenessDrawer } from '../../amplitude';
import { FeatureForPlan } from '../../plans';
import FrameSettingsDrawer from './miscalleneous-drawer';

const { confirm } = Modal;

const userGuides = [ExploringCanvasGuide, ShareEmbedDemoGuide, EditingInteractiveDemoGuidePart1];

type CanvasProps = {
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => void;
  subs: P_RespSubscription | null;
  publishTour: (tour: P_RespTour) => Promise<boolean>;
  allAnnotationsForTour: AnnotationPerScreen[];
  navigate: NavFn;
  navigateBackToTour: () => void;
  toAnnotationId: string;
  onTourDataChange: TourDataChangeFn;
  tour: P_RespTour;
  timeline: Timeline,
  tourOpts: ITourDataOpts,
  applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void,
  applyAnnGrpIdMutations: (mutations: AnnUpdateType, tx: Tx) => void,
  commitTx: (tx: Tx) => void,
  setAlert: (msg?: string) => void,
  shouldShowScreenPicker: (screenPickerData: ScreenPickerData) => void;
  screen: P_RespScreen;
  screenData: ScreenData;
  allEdits: EditItem[];
  allAnnotationsForScreen: IAnnotationConfig[];
  onAnnotationCreateOrChange: onAnnCreateOrChangeFn;
  onScreenEditStart: () => void;
  onScreenEditFinish: () => void;
  onScreenEditChange: (forScreen: P_RespScreen, editChunks: AllEdits<ElEditType>) => void;
  onGlobalEditChange: (editChunks: AllGlobalElEdits<ElEditType>) => void;
  isScreenLoaded: boolean;
  shouldShowOnlyScreen: boolean;
  updateScreen: UpdateScreenFn;
  onTourJourneyChange: JourneyOrOptsDataChange;
  headerProps: HeaderProps,
  journey: JourneyData,
  manifestPath: string;
  elpathKey: ElPathKey;
  updateElPathKey: (elPath: ElPathKey)=> void;
  featurePlan: FeatureForPlan | null;
  globalOpts: IGlobalConfig;
  allGlobalEdits: EditItem[];
};

type AnnoationLookupMap = Record<string, [number, number]>;

const canvasGrid: CanvasGrid = {
  gridSize: 72,
  gridDotSize: 2,
  initial: {
    tx: 260,
    ty: 180,
    scale: 1
  }
};

const MODULE_TITLE_HEIGHT = 25;
const MODULE_TITLE_PADDING = 5;
const MODULE_EDITOR_TOP_GAP = MODULE_TITLE_HEIGHT + MODULE_TITLE_PADDING + 10;

const ANN_NODE_HEIGHT_WIDTH_RATIO = 1.77765625;
const ANN_NODE_WIDTH = canvasGrid.gridSize * 2.5;
const ANN_NODE_HEIGHT = ANN_NODE_WIDTH / ANN_NODE_HEIGHT_WIDTH_RATIO;
const ANN_NODE_BORDER_RADIUS = 16;
const ANN_NODE_PADDING = 0;
const ANN_NODE_SEP = canvasGrid.gridSize * 1;
const ANN_EDITOR_ZOOM = 0.75;
const ANN_NODE_TOP_MARGIN_FOR_EDITOR = 20 * ANN_EDITOR_ZOOM;
const ANN_NODE_BOTTOM_MARGIN_FOR_EDITOR = 40 * ANN_EDITOR_ZOOM;
const ANN_EDITOR_TOP = ANN_NODE_HEIGHT * ANN_EDITOR_ZOOM
  + ANN_NODE_TOP_MARGIN_FOR_EDITOR + ANN_NODE_BOTTOM_MARGIN_FOR_EDITOR;

const MULTI_ANN_G_MARKER_MARGIN = 10;
const MULTI_ANN_NODE_GAP = 10;
const MULTI_NODE_MODAL_WIDTH = ANN_NODE_WIDTH * ANN_EDITOR_ZOOM + 40;

const SVG_ZOOM_EXTENT: [number, number] = [0.5, 2];

const CONNECTOR_COLOR_NON_HOVERED = '#bdbdbd';
const CONNECTOR_COLOR_HOVERED = '#000000';
const CONNECTOR_HOTSPOT_COLOR_NON_HOVERED = 'transparent';
const CONNECTOR_HOTSPOT_COLOR_HOVERED = '#1503450a';
const TILE_STROKE_WIDTH_ON_HOVER = '6px';
const TILE_STROKE_WIDTH_DEFAULT = '4px';
const DROP_TARGET_PEEK_WIDTH = ANN_NODE_SEP / 1.5;
const DROP_TARGET_PEEK_GUTTER = ANN_NODE_SEP / 4;
const CREATE_JOURNEY_MODAL_WIDTH = 360;

const ANN_EDITOR_ANIM_DUR = 750;

const CANVAS_MENU_ITEM_STYLE = { fontSize: '1.5rem', color: '#616161' };

function isMenuModalVisible(xy: [number | null, number | null, LRPostion]): boolean {
  return !(xy[0] === null || xy[1] === null);
}

function getLRPosition(xy: [number, number], wrt: HTMLElement): [number, number, LRPostion] {
  const box = wrt.getBoundingClientRect();
  if (xy[0] > ((box.width / 2) | 0)) {
    return [box.width - xy[0], xy[1], 'r'];
  }
  return [...xy, 'l' as LRPostion];
}

function getModalPosition(n: SVGElement): number {
  const node = n.getBoundingClientRect();
  if (node.x + MULTI_NODE_MODAL_WIDTH > window.innerWidth) {
    return window.innerWidth - MULTI_NODE_MODAL_WIDTH;
  }
  if (node.x < 0) {
    return 0;
  }
  return node.x + node.width / 2 - MULTI_NODE_MODAL_WIDTH / 2;
}

interface CtxSelectionData {
  annotation: IAnnotationConfigWithScreenId;
}

const initialReorderPropsValue = {
  destinationPosition: DestinationAnnotationPosition.next,
  currentDraggedAnnotationId: '',
  destinationDraggedAnnotationId: '',
  isCursorOnDropTarget: false
};

function shouldShowRepositionMarker(
  el: SVGRectElement,
  markerData: AnnotationNode<dagre.Node>,
  selectedNodeData: AnnotationNode<dagre.Node>,
  expandedMultAnnZIds: string[]
): boolean {
  const isR = select(el).classed('r');
  const isSameTimelineGrp = markerData.grp === selectedNodeData.grp;
  const isPrev = markerData.localIdx === selectedNodeData.localIdx - 1;
  const isGrpCollapsed = markerData.sameMultiAnnGroupAnnRids!.length === 0
  || (markerData.sameMultiAnnGroupAnnRids!.length !== 0
     && expandedMultAnnZIds.includes(markerData.annotation.zId));
  return !(isSameTimelineGrp && isPrev && isR) && isGrpCollapsed;
}

const initialModalPos: ModalPosition = [null, null, 'l'];

const initialConnectorModalData = {
  position: initialModalPos,
  fromAnnId: '',
  toAnnId: '',
};

const initialAnnNodeModalData = {
  position: initialModalPos,
  annId: '',
};

const initialAddScreenModal: AnnAddScreenModal = {
  position: initialModalPos,
  annId: '',
  annotationPosition: 'prev',
  screenAnnotation: null
};

const newScreenPickerData: ScreenPickerData = {
  screenPickerMode: 'navigate',
  annotation: null,
  position: DestinationAnnotationPosition.next,
  showCloseButton: true,
};

const initialMultiNodeModalData: MultiNodeModalData = {
  selectedMultiNode: null,
  leftCoord: 0,
};

interface AnnEditorModal {
  annId: string,
  newSvgZoom: { x: number, y: number, k: number, centerX: number },
  applyTransitionToArrow: boolean,
  prevAnnId: string,
  firstSelectedAnnId: string,
  timelineY: number
}

interface AnnWithCoords {
  screenId: number,
  annId: string,
  x: number,
  y: number,
  width: number,
  height: number,
}

interface CreateJourneyModal {
  newSvgZoom: { x: number, y: number, k: number, centerX: number },
}

export default function TourCanvas(props: CanvasProps): JSX.Element {
  const [showMobileResponsivenessDrawer, setShowMobileResponsivenessDrawer] = useState(false);
  const [selectedResponsivenessStrategy, setSelectedResponsivenessStrategy] = useState(props.tour.responsive2);
  const [showAdditionalSettingsDrawer, setShowAdditionalSettingsDrawer] = useState(false);
  const [selectorComponentKey, setSelectorComponentKey] = useState(0);
  const isGuideArrowDrawing = useRef(0);
  const reorderPropsRef = useRef({ ...initialReorderPropsValue });
  const addToMultiAnnGroupRef = useRef<MultiAnnotationNode<dagre.Node> |null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootGRef = useRef<SVGGElement | null>(null);
  const ctxData = useRef<CtxSelectionData | null>(null);
  const [connectorMenuModalData, setConnectorMenuModalData] = useState(initialConnectorModalData);
  const [nodeMenuModalData, setNodeMenuModalData] = useState(initialAnnNodeModalData);
  const [addScreenModalData, setAddScreenModalData] = useState(initialAddScreenModal);
  const [showLoaderEditor, setShowLoaderEditor] = useState(false);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown>>();
  const [annEditorModal, setAnnEditorModal] = useState<AnnEditorModal | null>(null);
  const annEditorModalRef = useRef<AnnEditorModal | null>(null);
  const [annWithCoords, setAnnWithCoords] = useState<AnnWithCoords[]>([]);
  const annWithCoordsRef = useRef<AnnWithCoords[]>([]);
  const [selectedAnnId, setSelectedAnnId] = useState<string>('');
  const [showScreenEditor, setShowSceenEditor] = useState(false);
  const [showJourneyEditor, setShowJourneyEditor] = useState(false);
  const [firstAnnotations, setFirstAnnotations] = useState<IAnnotationConfigWithScreen[]>([]);
  const [createJourneyModal, setCreateJourneyModal] = useState<CreateJourneyModal | null>(null);
  const createJourneyModalRef = useRef<CreateJourneyModal | null>(null);
  const [showAnnText, setShowAnnText] = useState(false);
  const [newAnnPos, setNewAnnPos] = useState<null | DestinationAnnotationPosition>(null);
  const [screenEditorArrowLeft, setScreenEditorArrowLeft] = useState(0);
  const [multiNodeModalData, setMultiNodeModalData] = useState(initialMultiNodeModalData);
  const [allAnnsLookupMap, setAllAnnsLookupMap] = useState<AnnoationLookupMap>({});
  const dagreGraphRef = useRef<dagre.graphlib.Graph>();
  const [screenMode, setScreenMode] = useState<ScreenMode>(ScreenMode.DESKTOP);
  const [img, setImg] = useState<null | string>(null);
  const [init] = useState(1);
  const expandedMultAnnZIds = useRef<string[]>([]);
  const zoomPanState = dSaveZoomPanState(props.tour.rid);
  const multiAnnFeatureAvailable = isFeatureAvailable(props.featurePlan, 'multi_annontation');
  // const [hideAnnForCapture, setHideAnnForCapture] = useState(false);

  useEffect(() => {
    const receiveMessage = (e: MessageEvent<{ type: UserGuideMsg }>): void => {
      if (isEventValid(e) && e.data.type === UserGuideMsg.RESET_KEY) {
        setSelectorComponentKey(Math.random());
      }
    };

    window.addEventListener('message', receiveMessage, false);

    return () => window.removeEventListener('message', receiveMessage, false);
  }, []);

  useEffect(() => {
    const lookupMap = getAnnotationLookupMap(props.allAnnotationsForTour);
    setAllAnnsLookupMap(lookupMap);
  }, [props.allAnnotationsForTour]);

  useEffect(() => {
    annWithCoordsRef.current = annWithCoords;
  }, [annWithCoords]);
  const lines = line<EdgeWithData>()
    .curve(curveBasis)
    .x(d => d.x)
    .y(d => d.y);

  const drawGrid = (): void => {
    const svgEl = svgRef.current;
    if (!svgEl) {
      return;
    }
    const svg = select('svg#fab-tour-canvas');
    const pattern = svg
      .selectAll('pattern')
      .data([1])
      .enter()
      .append('pattern')
      .attr('id', 'grid-pattern')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', canvasGrid.gridSize)
      .attr('height', canvasGrid.gridSize);

    pattern
      .append('line')
      .attr('x1', 0)
      .attr('x2', 100)
      .attr('stroke', '#E0E0E0');
    pattern
      .append('line')
      .attr('y1', 0)
      .attr('y2', 100)
      .attr('stroke', '#E0E0E0');
    // .append('rect')
    // .attr('width', canvasGrid.gridDotSize)
    // .attr('height', canvasGrid.gridDotSize)
    // .attr('fill', '#a4a4a4')
    // .attr('x', (canvasGrid.gridSize / 2) - (canvasGrid.gridDotSize / 2))
    // .attr('y', (canvasGrid.gridSize / 2) - (canvasGrid.gridDotSize / 2));

    // Append a "backdrop" rect to your svg, and fill it with your pattern.
    // You shouldn't need to touch this again after adding it.
    svg.select('#pattern-fill')
      .attr('fill', 'url(#grid-pattern)');
  };

  const updateGrid = (x: number, y: number, k: number): void => {
    const svgEl = svgRef.current;
    if (!svgEl) {
      return;
    }
    const svg = select(svgEl);
    svg.select('#grid-pattern')
      .attr('x', x)
      .attr('y', y)
      .attr('width', canvasGrid.gridSize * k)
      .attr('height', canvasGrid.gridSize * k)
      .selectAll('rect')
      .attr('x', (canvasGrid.gridSize * (k / 2)) - (canvasGrid.gridDotSize / 2))
      .attr('y', (canvasGrid.gridSize * (k / 2)) - (canvasGrid.gridDotSize / 2))
      .attr('opacity', Math.min(k, 1));
  };

  const collapseSelectedMultiNode = (annotation: IAnnotationConfigWithScreen): void => {
    // reset annotations position for the selected multiNode
    const nodeG = select<SVGGElement, AnnotationNode<dagre.Node>>(rootGRef.current!)
      .selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node');
    const existingData = nodeG.data();
    const updatedNodeData = existingData.map((singleNode) => {
      if (annotation.zId === singleNode.annotation.zId) {
        singleNode.storedData!.x = singleNode.origStoredData!.x;
        singleNode.storedData!.y = singleNode.origStoredData!.y;
      }
      return singleNode;
    });

    const nodeGDataBound = nodeG.data<AnnotationNode<dagre.Node>>(updatedNodeData, dt => dt.id);
    nodeGDataBound.merge(nodeGDataBound).call(updateNodePos);

    // if we have dragged annotation from expanded multi-node and then collapse it, the order changes
    // so we call raise to reset the order
    nodeG
      .filter(p => p.annotation.zId === annotation.zId)
      .sort((a, b) => a.origStoredData!.x - b.origStoredData!.x)
      .each(function () {
        const sel = select(this);
        sel.raise();
      });

    // reset group container height
    const multiG = select(svgRef.current!)
      .selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('g.multi-node');
    const existingMultiGData = multiG.data();
    const updatedMultiGData = existingMultiGData.map((multiN) => {
      if (multiN.data.zId === annotation.zId) {
        multiN.storedData!.height = multiN.origStoredData!.height;
        multiN.storedData!.width = multiN.origStoredData!.width;
        multiN.width = multiN.origStoredData!.width;
        multiN.height = multiN.origStoredData!.height;
      }

      return multiN;
    });
    updateMultiNodeMarkerSize(multiG, updatedMultiGData, annotation, false);

    // reset connectors position
    const g = select(rootGRef.current);

    g
      .selectAll('g.connectors')
      .selectAll<SVGGElement, EdgeWithData>('g.edgegrp')
      .call(p => {
        setOrignalEdgePos(p as D3Selection<SVGGElement, EdgeWithData, SVGGElement, AnnotationPerScreen[]>);
      });

    // remove collapsed multi-node zId from expandedMultAnnZIds
    const multAnnZIds = expandedMultAnnZIds.current;
    const index = multAnnZIds.indexOf(annotation.zId);
    if (index > -1) {
      multAnnZIds.splice(index, 1);
    }
    expandedMultAnnZIds.current = multAnnZIds;
  };

  const expandSelectedMultiNode = (data: AnnotationNode<dagre.Node>): void => {
    // get all the annotation rid for selected multiNode
    const ridInThisMultiGrp = [...data.sameMultiAnnGroupAnnRids!, data.annotation.refId];
    // add selected multi-node to expandedMultAnnZIds
    expandedMultAnnZIds.current = [...expandedMultAnnZIds.current, data.annotation.zId];

    // find the selected multiNode
    const multiG = select(svgRef.current!)
      .selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('g.multi-node');
    const existingMultiGData = multiG.data();
    const selectedMultiNode = existingMultiGData.find(
      (multiNode) => multiNode.data.zId === data.annotation.zId
    );

    // update annotations position from the selected multiNode
    const nodeG = select<SVGGElement, AnnotationNode<dagre.Node>>(rootGRef.current!)
      .selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node');
    const existingData = nodeG.data();
    const updatedNodeData = existingData.map(node => {
      if (ridInThisMultiGrp.includes(node.annotation.refId)) {
        // we get the x value from multi-node
        node.storedData!.x = selectedMultiNode!.storedData!.x - selectedMultiNode!.storedData!.width / 2;
        const index = Math.floor(node.y / MULTI_ANN_NODE_GAP);
        const nodeY = index * (MULTI_ANN_NODE_GAP + node.origStoredData!.height) + node.origStoredData!.y;
        node.storedData!.y = nodeY;
      }
      return node;
    });
    const nodeGDataBound = nodeG.data<AnnotationNode<dagre.Node>>(updatedNodeData, d => d.id);
    nodeGDataBound.merge(nodeGDataBound).call(updateNodePos);
    nodeG.filter(e => ridInThisMultiGrp.includes(e.annotation.refId)).raise();

    // update multi-node height & width
    const updatedMultiGData = existingMultiGData.map((multiN) => {
      if (multiN.data.zId === data.annotation.zId) {
        const height = (data.sameMultiAnnGroupAnnRids!.length + 1)
        * (data.storedData!.height + MULTI_ANN_NODE_GAP);
        const width = data.storedData!.width;
        multiN.storedData!.height = height;
        multiN.storedData!.width = width;
        multiN.width = width;
        multiN.height = height;
      }

      return multiN;
    });
    updateMultiNodeMarkerSize(multiG, updatedMultiGData, data.annotation, true);

    // update the connectors position
    updateSelectedMultiNodeEdgesPos(updatedNodeData);

    // remove the multi-node border we add on hover
    updateMultiNodeSelectionStyle(data, false, '');
  };

  const nodeDraggable = (): DragBehavior<
    SVGGElement,
    AnnotationNode<dagre.Node>,
    AnnotationNode<dagre.Node> | SubjectPosition
  > => {
    let relX = 0;
    let relY = 0;
    let newX = 0;
    let newY = 0;
    let id = '';
    let startPoints: [x: number, y: number] = [0, 0];
    let hasDraggingStarted = false;
    const clickThreshold = 5;

    return drag<SVGGElement, AnnotationNode<dagre.Node>>()
      .on('start', function (
        event: D3DragEvent<SVGForeignObjectElement, AnnotationNode<dagre.Node>, AnnotationNode<dagre.Node>>,
      ) {
        if (createJourneyModalRef.current) return;

        const [eventX, eventY] = fromPointer(event, rootGRef.current);
        startPoints = [eventX, eventY];
        const selectedScreen = select<SVGGElement, AnnotationNode<dagre.Node>>(this);
        const data = selectedScreen.datum();
        id = data.id;
      })
      .on('drag', function (
        event: D3DragEvent<SVGForeignObjectElement, AnnotationNode<dagre.Node>, AnnotationNode<dagre.Node>>,
        d: AnnotationNode<dagre.Node>
      ) {
        prevent(event.sourceEvent);
        if (createJourneyModalRef.current) return;

        if (!hasDraggingStarted) {
          const [eventX, eventY] = fromPointer(event, rootGRef.current);
          const [startX, startY] = startPoints;

          const isDraggingStarted = Math.abs(startX - eventX) > clickThreshold
            || Math.abs(startY - eventY) > clickThreshold;

          if (!isDraggingStarted) return;

          hasDraggingStarted = true;
          const selectedScreen = select<SVGGElement, AnnotationNode<dagre.Node>>(this);
          const data = selectedScreen.datum();
          // Find out where in the box the mousedown for drag is fired relative to the current box.
          relX = eventX - (data.storedData!.x);
          relY = eventY - (data.storedData!.y);
          id = data.id;
          reorderPropsRef.current.currentDraggedAnnotationId = id;

          selectedScreen.raise(); // moves the dragged element to the end simulating higher zindex
          selectedScreen.selectAll('rect.tg-hide')
            .classed('rev', true);

          const allNodesParentParent = select('g#fab-tour-canvas-main');
          allNodesParentParent.selectAll<SVGRectElement, AnnotationNode<dagre.Node>>('rect.tg-hide')
            .classed('tg-show', function (datum) {
              return shouldShowRepositionMarker(this, datum, data, expandedMultAnnZIds.current);
            })
            .classed('tg-hide', function (datum) {
              return !shouldShowRepositionMarker(this, datum, data, expandedMultAnnZIds.current);
            });

          select('g.connectors').classed('fade', true);

          if (!annEditorModalRef.current) {
            shouldShowOrHideMultiAnnGMarker(data, true, Tags.TILE_STROKE_COLORON_SELECT);
          }
        }

        const [x, y] = fromPointer(event, rootGRef.current);
        newX = x - relX;
        newY = y - relY;

        // eslint-disable-next-line react/no-this-in-sfc
        const el = select<SVGGElement, AnnotationNode<dagre.Node>>(this);
        el.attr('transform', `translate(${newX}, ${newY})`);

        const fromEl = selectAll<SVGGElement, EdgeWithData>('g.edgegrp')
          .filter((data) => data.data.fromAnnId === d.id);
        const toEl = selectAll<SVGGElement, EdgeWithData>('g.edgegrp')
          .filter((data) => data.data.toAnnId === d.id);

        const data = el.datum();

        const fromElNodes = [fromEl.select('path.edgeconn'), fromEl.select('path.edgehotspot')] as
          D3Selection<SVGPathElement, EdgeWithData, HTMLElement, any>[];
        fromElNodes.forEach(sel => {
          const n = sel.node();
          if (!n) return;
          const pathD = n.getAttribute('d') ?? '';
          if (pathD.length === 0) return;

          const endPoints = getEndPointsUsingPath(pathD);
          const newPoints = { x: newX + data.width, y: newY + data.height / 2 };
          sel.attr('d', formPathUsingPoints([newPoints, endPoints[1]]));
        });

        const toElNodes = [toEl.select('path.edgeconn'), toEl.select('path.edgehotspot')] as
          D3Selection<SVGPathElement, EdgeWithData, HTMLElement, any>[];
        toElNodes.forEach(sel => {
          const n = sel.node()!;
          if (!n) return;
          const pathD = n.getAttribute('d') ?? '';
          if (pathD.length === 0) return;

          const endPoints = getEndPointsUsingPath(pathD);
          const newPoints = { x: newX, y: newY + data.height / 2 };
          sel.attr('d', formPathUsingPoints([endPoints[0], newPoints]));
        });

        const [ox, oy] = fromPointer(event, document.body);

        const els = document.elementsFromPoint(ox, oy);
        const [dropTg] = els.filter(elm => elm.nodeName === 'rect' && elm.classList.contains('droptg'));

        selectAll('rect.tg-show.sel').classed('sel', false);

        reorderPropsRef.current = {
          ...initialReorderPropsValue,
          currentDraggedAnnotationId: reorderPropsRef.current.currentDraggedAnnotationId
        };

        if (!dropTg) {
          // Check if dropped on multi ann group
          if (addToMultiAnnGroupRef.current) {
            shouldShowOrHideMultiAnnGMarker(data, true, Tags.TILE_STROKE_COLORON_SELECT);
            addToMultiAnnGroupRef.current = null;
          }

          const [dropMultiAnnGrp] = els.filter(elm => elm.nodeName === 'rect' && elm.classList.contains('marker-el'));
          if (!dropMultiAnnGrp) { return; }

          const addToGroupDropTarget = select<SVGRectElement, MultiAnnotationNode<dagre.Node>>(
              dropMultiAnnGrp as SVGRectElement
          );
          const groupData = addToGroupDropTarget.datum();
          addToMultiAnnGroupRef.current = groupData;
          addToGroupDropTarget
            .style('fill', Tags.TILE_STROKE_COLOR_ON_HOVER)
            .style('fill-opacity', 0.8);

          return;
        }

        const dropTarget = select<SVGRectElement, AnnotationNode<dagre.Node>>(dropTg as SVGRectElement);
        const isLeft = dropTarget.classed('l');
        const targetData = dropTarget.datum();
        dropTarget.classed('sel', true);

        reorderPropsRef.current.destinationPosition = isLeft
          ? DestinationAnnotationPosition.prev
          : DestinationAnnotationPosition.next;
        reorderPropsRef.current.destinationDraggedAnnotationId = targetData.id;
        reorderPropsRef.current.isCursorOnDropTarget = true;
      })
      .on('end', function (
        event: D3DragEvent<SVGForeignObjectElement, AnnotationNode<dagre.Node>, AnnotationNode<dagre.Node>>,
      ) {
        if (createJourneyModalRef.current) return;

        const allNodesParentParent = select('g#fab-tour-canvas-main');
        allNodesParentParent.selectAll('rect.tg-show')
          .classed('tg-show', false)
          .classed('tg-hide', true)
          .classed('rev', false)
          .classed('sel', false);

        select('g.connectors').classed('fade', false);

        const selectedScreen = select<SVGGElement, AnnotationNode<dagre.Node>>(this);
        const data = selectedScreen.datum();
        shouldShowOrHideMultiAnnGMarker(data, false);

        const [eventX, eventY] = fromPointer(event, rootGRef.current);
        const [startX, startY] = startPoints;

        const isClick = ((Math.abs(startX - eventX) < clickThreshold) || (Math.abs(startY - eventY) < clickThreshold));

        if (isClick && !hasDraggingStarted) {
          resetNodePos();
          if (!restrictMultiGroupAction(data) || annEditorModalRef.current) {
            updateMultiNodeCloseIconStyle(select(svgRef.current!), false, null);

            const isMultiNodeClicked = selectedAnnId && data.sameMultiAnnGroupAnnRids!.length !== 0;
            if (isMultiNodeClicked) {
              const multiG = select(svgRef.current!)
                .selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('g.multi-node');
              const existingMultiGData = multiG.data();
              const selectedMultiNode = existingMultiGData.find(
                (multiNode) => multiNode.data.zId === data.annotation.zId
              );

              let isSameMultiNodeClicked = false;
              if (multiNodeModalData.selectedMultiNode !== null) {
                isSameMultiNodeClicked = data.annotation.zId === multiNodeModalData.selectedMultiNode[0].zId;
              }

              if (!isSameMultiNodeClicked) {
                const annotations = selectedMultiNode!.data.anns.map(node => node.annotation);

                const node = selectedScreen.node();
                setMultiNodeModalData({
                  leftCoord: getModalPosition(node!),
                  selectedMultiNode: annotations
                });
              } else {
                setMultiNodeModalData(initialMultiNodeModalData);
              }
            } else {
              selectAnn(id);
              setMultiNodeModalData(initialMultiNodeModalData);
            }
          } else {
            expandSelectedMultiNode(data);
          }
          hasDraggingStarted = false;
          return;
        }

        hasDraggingStarted = false;

        if (addToMultiAnnGroupRef.current) {
          const groupData = addToMultiAnnGroupRef.current;
          if (groupData.data.anns.length > 0) {
            if (multiAnnFeatureAvailable.isAvailable && !multiAnnFeatureAvailable.isInBeta) {
              confirm({
                title: 'Do you want to create multi annotation?',
                icon: <SisternodeOutlined />,
                onOk() {
                  const newGroupId = groupData.data.zId;
                  const toBeAddedToGroupAnn = data.annotation;

                  const updatedConfig = updateAnnotationZId(toBeAddedToGroupAnn, newGroupId);
                  props.onAnnotationCreateOrChange(updatedConfig.screen.id, updatedConfig, 'upsert', props.tourOpts);

                  addToMultiAnnGroupRef.current = null;
                },
                onCancel() {
                  addToMultiAnnGroupRef.current = null;
                },
              });
            } else {
              confirm({
                title: multiAnnFeatureAvailable.isInBeta
                  ? 'This feature is in beta. If you want access contact support.'
                  : 'Upgrade to create multi annotation',
                icon: <SisternodeOutlined />,
                onOk() {
                  addToMultiAnnGroupRef.current = null;
                },
                cancelButtonProps: {
                  hidden: true,
                  disabled: true,
                }
              });
            }
          }
        }
        addToMultiAnnGroupRef.current = null;

        if (reorderPropsRef.current.isCursorOnDropTarget) {
          confirm({
            title: 'Do you want to reorder annotation?',
            icon: <SisternodeOutlined />,
            onOk() {
              traceEvent(
                AMPLITUDE_EVENTS.ANNOTATION_MOVED,
                {
                  annotation_op_location: 'canvas'
                },
                [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
              );
              const [currentScreenId, currentAnnRefId] = reorderPropsRef.current.currentDraggedAnnotationId.split('/');
              const currentAnnConfig = getAnnotationByRefId(currentAnnRefId, props.allAnnotationsForTour)!;
              const [, destinationAnnId] = reorderPropsRef.current.destinationDraggedAnnotationId.split('/');
              const result = reorderAnnotation(
                props.timeline,
                { ...currentAnnConfig, screenId: +currentScreenId },
                destinationAnnId,
                props.allAnnotationsForTour,
                props.tourOpts.main,
                reorderPropsRef.current.destinationPosition!,
              );
              if (result.status === 'accepted') props.applyAnnButtonLinkMutations(result);
              else props.setAlert(result.deniedReason);

              reorderPropsRef.current = { ...initialReorderPropsValue };
            },
            onCancel() { reorderPropsRef.current = { ...initialReorderPropsValue }; },
          });
        } else {
          reorderPropsRef.current = { ...initialReorderPropsValue };
        }

        const nodeG = select<SVGGElement, AnnotationNode<dagre.Node>>(rootGRef.current!)
          .selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node');
        const existingData = nodeG.data();
        const updatedNodeData = existingData.map(node => {
          if (node.id === id) {
            node.storedData!.x = newX;
            node.storedData!.y = newY;
          }
          return node;
        });
        const nodeGDataBound = nodeG.data<AnnotationNode<dagre.Node>>(updatedNodeData, d => d.id);
        nodeGDataBound.merge(nodeGDataBound).call(updateNodePos);

        // if we drag an annotation whose group has only it as a single annotation
        // then i also need to change its position so that the marker along with
        // the multi-node changes positions with the ann
        select(svgRef.current!)
          .selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('g.multi-node')
          .filter(dd => dd.data.anns.length === 1
            && dd.data.anns[0].annotation.refId === data.annotation.refId)
          .attr('transform', `translate(${newX} ${newY})`);

        relX = 0;
        relY = 0;
        id = '';
        newX = 0;
        newY = 0;
      });
  };

  const shouldShowOrHideMultiAnnGMarker = (
    data: AnnotationNode<dagre.Node>,
    show: boolean,
    fill: string = 'none'
  ): void => {
    select(svgRef.current!)
      .selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('g.multi-node')
      .filter(dd => dd.data.anns.length > 0
            && dd.data.anns[0].annotation.screen.id === data.annotation.screen.id
            && dd.data.anns[0].annotation.refId !== data.annotation.refId
            && dd.id !== data.annotation.zId)
      .selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('rect')
      .style('display', () => (show ? 'block' : 'none'))
      .style('fill', () => (show ? fill : 'none'))
      .style('fill-opacity', () => (show ? '0.3' : '0'));
  };

  const getAnnotationLookupMap = (allAnns: AnnotationPerScreen[]): AnnoationLookupMap => {
    const lookupMap: AnnoationLookupMap = {};
    for (let i = 0, l = allAnns.length; i < l; i++) {
      const sId = allAnns[i].screen.id;
      for (let k = 0, s = allAnns[i].annotations.length; k < s; k++) {
        const qId = `${sId}/${allAnns[i].annotations[k].refId}`;
        lookupMap[qId] = [i, k];
      }
    }
    return lookupMap;
  };

  const updateConnection = (
    allAnns: AnnotationPerScreen[],
    lookupMap: AnnoationLookupMap,
    from: string,
    to: string,
    updateFn: TourDataChangeFn,
    tourOpts: ITourDataOpts,
  ): void => {
    const [fromScreenIdx, fromAnIdx] = lookupMap[from];
    const [toScreenIdx, toAnIdx] = lookupMap[to];
    const fromAn = allAnns[fromScreenIdx].annotations[fromAnIdx];
    const toAn = allAnns[toScreenIdx].annotations[toAnIdx];
    toAn.grpId = fromAn.grpId;

    if (doesBtnOpenALink(fromAn, 'next')) {
      props.setAlert("The selected annotation contains a link, hence, it can't be reordered. ");
      return;
    }

    const tx = new Tx();
    tx.start();

    const grpIdUpdates = updateGrpIdForTimelineTillEnd({ ...toAn, screenId: +to.split('/')[0] }, allAnns, fromAn.grpId);
    const groupedUpdates = groupUpdatesByAnnotation(grpIdUpdates);
    props.applyAnnGrpIdMutations({
      groupedUpdates,
      updates: [],
      main: null,
      deletionUpdate: null,
      status: 'accepted'
    }, tx);

    let update;
    const newGrpIdForMiddleGroup = nanoid();
    updateLocalTimelineGroupProp(newGrpIdForMiddleGroup, fromAn.grpId);

    const nextBtnOfFromAn = fromAn.buttons.find(btn => btn.type === 'next')!;
    if (isNavigateHotspot(nextBtnOfFromAn.hotspot)) {
      const toOldAnnId = nextBtnOfFromAn.hotspot!.actionValue;
      const [toOldScrnIdx, toOldAnnIdx] = lookupMap[toOldAnnId._val];
      const toOldAn = allAnns[toOldScrnIdx].annotations[toOldAnnIdx];
      toOldAn.grpId = newGrpIdForMiddleGroup;

      const middleGroupedUpdates = groupUpdatesByAnnotation(updateGrpIdForTimelineTillEnd(
        { ...toOldAn, screenId: +toOldAnnId._val.split('/')[0] },
        allAnns,
        newGrpIdForMiddleGroup
      ));
      props.applyAnnGrpIdMutations({
        groupedUpdates: middleGroupedUpdates,
        updates: [],
        main: null,
        deletionUpdate: null,
        status: 'accepted'
      }, tx);

      const prevBtn = toOldAn.buttons.find(btn => btn.type === 'prev')!;
      update = updateButtonProp(toOldAn, prevBtn.id, 'hotspot', null);
      allAnns[toOldScrnIdx].annotations[toOldAnnIdx] = update; // updated value push it back to the list
      updateFn('annotation-and-theme', allAnns[toOldScrnIdx].screen.id, {
        config: update,
        actionType: 'upsert',
      }, tx);
    }

    const prevBtnOfToAn = toAn.buttons.find(btn => btn.type === 'prev')!;
    if (isNavigateHotspot(prevBtnOfToAn.hotspot)) {
      // if former connection does exists;
      // B -> A and a connection is getting established with C
      //  C.next => A
      //  A.prev.next = null (A.prev === B) // true
      //  A.prev = C
      const fromOldAnnId = prevBtnOfToAn.hotspot!.actionValue;
      const [fromOldScrnIdx, fromOldAnnIdx] = lookupMap[fromOldAnnId._val];
      const fromOldAn = allAnns[fromOldScrnIdx].annotations[fromOldAnnIdx];
      const nextBtn = fromOldAn.buttons.find(btn => btn.type === 'next')!;
      update = updateButtonProp(fromOldAn, nextBtn.id, 'hotspot', null);
      allAnns[fromOldScrnIdx].annotations[fromOldAnnIdx] = update; // Updated config push it back to list
      updateFn('annotation-and-theme', allAnns[fromOldScrnIdx].screen.id, {
        config: update,
        actionType: 'upsert'
      }, tx);
    }

    // if former connection does not exist
    //  update next btn of from annotation
    //  update prev btn of to annoatation

    update = updateButtonProp(toAn, prevBtnOfToAn.id, 'hotspot', {
      type: 'an-btn',
      on: 'click',
      target: '$this',
      actionType: 'navigate',
      actionValue: createLiteralProperty(
        `${allAnns[fromScreenIdx].screen.id}/${allAnns[fromScreenIdx].annotations[fromAnIdx].refId}`
      ),
    } as ITourEntityHotspot);
    allAnns[toScreenIdx].annotations[toAnIdx] = update; // updated value push it back to the list
    updateFn('annotation-and-theme', allAnns[toScreenIdx].screen.id, {
      config: update,
      actionType: 'upsert'
    }, tx);
    update = updateButtonProp(fromAn, nextBtnOfFromAn.id, 'hotspot', {
      type: 'an-btn',
      on: 'click',
      target: '$this',
      actionType: 'navigate',
      actionValue: createLiteralProperty(
        `${allAnns[toScreenIdx].screen.id}/${allAnns[toScreenIdx].annotations[toAnIdx].refId}`
      ),
    } as ITourEntityHotspot);
    allAnns[fromScreenIdx].annotations[fromAnIdx] = update; // updated value push it back to the list
    updateFn('annotation-and-theme', allAnns[fromScreenIdx].screen.id, {
      config: update,
      actionType: 'upsert'
    }, tx);

    let mainFound = false;
    let currAnn = fromAn;
    let firstAnnOfNewFlow = fromAn;

    while (currAnn && !mainFound) {
      if (currAnn.refId === tourOpts.main.split('/')[1]) {
        mainFound = true;
      }
      const prevBtnHotspot = currAnn.buttons.find(btn => btn.type === 'prev')?.hotspot;
      if (!prevBtnHotspot) break;
      const prevAnn = getAnnotationByRefId(prevBtnHotspot.actionValue._val.split('/')[1], allAnns);
      if (!prevAnn) break;
      currAnn = prevAnn;
      firstAnnOfNewFlow = prevAnn;
    }

    currAnn = toAn;

    while (currAnn && !mainFound) {
      if (currAnn.refId === tourOpts.main.split('/')[1]) {
        mainFound = true;
      }
      const nextBtnHotspot = currAnn.buttons.find(btn => btn.type === 'next')?.hotspot;
      if (!nextBtnHotspot) break;
      if (nextBtnHotspot.actionType !== 'navigate') break;
      const nextAnn = getAnnotationByRefId(nextBtnHotspot.actionValue._val.split('/')[1], allAnns);
      if (!nextAnn) break;
      currAnn = nextAnn;
    }

    if (mainFound) {
      const firstAnn = getAnnotationByRefId(firstAnnOfNewFlow.refId, allAnns);
      updateFn('annotation-and-theme', allAnns[fromScreenIdx].screen.id, {
        config: update,
        opts: updateTourDataOpts(tourOpts, 'main', `${firstAnn!.screenId}/${firstAnn!.refId}`),
        actionType: 'upsert'
      }, tx);
    }

    props.commitTx(tx);
  };

  const hideGuideConnector = (sel: D3Selection<SVGPathElement, {}, SVGGElement, AnnotationPerScreen[]>): void => {
    sel.remove();
  };

  const prevent = (e: any): void => {
    if (e.target.name !== 'screen-img'
      && e.target.name !== 'img-submit-btn'
      && e.target.getAttribute('for') !== 'screen-image'
    ) {
      e.preventDefault();
    }
    e.stopPropagation();
  };

  // todo[now] delete if not needed
  const resetState = (): void => {
  };

  const updateNodePos = (node: D3Selection<SVGGElement, AnnotationNode<dagre.Node>, SVGGElement, {}>): void => {
    node
      .transition()
      .attr(
        'transform',
        d => {
          const pos = d.storedData!;
          const x = pos.x;
          const y = pos.y;
          return `translate(${x}, ${y})`;
        }
      );
  };

  const updateMultiNodePos = (
    node: D3Selection<SVGGElement, MultiAnnotationNode<dagre.Node>, SVGGElement, {}>
  ): void => {
    node
      .transition()
      .attr(
        'transform',
        d => {
          const pos = d.storedData!;
          const x = pos.x - pos.width / 2;
          const y = pos.y - pos.height / 2;
          return `translate(${x}, ${y})`;
        }
      );
  };

  const handleUserZoomPanWhenAnnEditorIsShown = (zoomX: number): void => {
    const { y: currZoomY } = annEditorModalRef.current!.newSvgZoom;
    updateGrid(zoomX, currZoomY, ANN_EDITOR_ZOOM);
    select(rootGRef.current!).attr('transform', `translate(${zoomX}, ${currZoomY}) scale(${ANN_EDITOR_ZOOM})`);
    setAnnEditorModal(prev => ({
      ...prev!, newSvgZoom: { ...prev!.newSvgZoom, x: zoomX }, applyTransitionToArrow: false
    }));
    const annCoordsX = getAnnNodeCoordsCenterXForAnnModalArrow(annEditorModalRef.current!.annId);
    setScreenEditorArrowLeft(getAnnModalArrowLeftPos(annCoordsX, zoomX));
  };

  const removeAnnFromGroup = (
    currentAnn: IAnnotationConfigWithScreenId,
    screenId: number,
  ): void => {
    const updatedConfig = updateAnnotationZId(currentAnn, getRandomId());
    props.onAnnotationCreateOrChange(screenId, updatedConfig, 'upsert', props.tourOpts);
  };

  useEffect(() => {
    const receiveMessage = (e: MessageEvent<{ type: UserGuideMsg }>): void => {
      if (isEventValid(e) && e.data.type === UserGuideMsg.OPEN_ANNOTATION) {
        try {
          const ann = props.timeline[0][0];
          resetNodePos();
          selectAnn(`${ann.screen.id}/${ann.refId}`);
        } catch (err) {
          sentryCaptureException(err as Error);
        }
      }

      if (isEventValid(e) && e.data.type === UserGuideMsg.RESET_ZOOM) {
        if (annEditorModal) {
          resetSelectedAnn();
          setTimeout(() => {
            resetZoom();
          }, ANN_EDITOR_ANIM_DUR);
        } else {
          resetZoom();
        }
      }
    };

    window.addEventListener('message', receiveMessage, false);

    annEditorModalRef.current = annEditorModal;

    if (!zoomBehaviorRef.current) return undefined;

    if (annEditorModal) {
      zoomBehaviorRef.current.scaleExtent([ANN_EDITOR_ZOOM, ANN_EDITOR_ZOOM]);
      select(svgRef.current).attr('cursor', 'ew-resize');
    } else {
      zoomBehaviorRef.current.scaleExtent(SVG_ZOOM_EXTENT);
      select(svgRef.current).attr('cursor', 'move');
    }

    return () => window.removeEventListener('message', receiveMessage, false);
  }, [annEditorModal]);

  useEffect(() => {
    const svg = svgRef.current;
    const rootG = rootGRef.current;
    if (svg && rootG) {
      drawGrid();
      select(svgRef.current).attr('cursor', 'move');

      const [sk, sx, sy] = zoomPanState.get();
      const initialZoom = sk !== null ? sk : canvasGrid.initial.scale;
      const initialPan = sx !== null && sy !== null ? [sx, sy] : [canvasGrid.initial.tx, canvasGrid.initial.ty];

      const z = zoom<SVGSVGElement, unknown>()
        .interpolate(interpolate)
        .scaleExtent(SVG_ZOOM_EXTENT)
        .on('zoom', null)
        .on('zoom', (e: D3ZoomEvent<SVGGElement, unknown>) => {
          /**
           * e.sourceEvent is null for programmatic zoom/pan change but is present when user uses the mouse.
           * Ideally this is to determine if user is initiating the zoom or is it triggered programatically
           */
          // when user zooms when Ann Editor is shown, only pan on X-axis
          const isMouseZoomWhenAnnEditorShown = annEditorModalRef.current && e.sourceEvent;
          if (isMouseZoomWhenAnnEditorShown) {
            handleUserZoomPanWhenAnnEditorIsShown(e.transform.x);
            return;
          }

          const isMouseZoomWhenCreateJourneyShown = createJourneyModalRef.current && e.sourceEvent;
          if (isMouseZoomWhenCreateJourneyShown) {
            const x = e.transform.x;
            const y = e.transform.y;
            const k = e.transform.k;
            setCreateJourneyModal(prev => ({ ...prev!,
              newSvgZoom: { ...prev!.newSvgZoom, x, y, k },
              applyTransitionToArrow: false }));
          }

          // don't save zoom value if zoom is triggered when ann editor is shown
          if (!restrictCanvasActions()) {
            zoomPanState.set(e.transform.k, e.transform.x, e.transform.y);
          }

          updateGrid(e.transform.x, e.transform.y, e.transform.k);
          select(rootG).attr('transform', e.transform.toString());
        });

      zoomBehaviorRef.current = z;

      const initialTransform = zoomIdentity.translate(initialPan[0], initialPan[1]).scale(initialZoom);
      select(svg)
        .call(z)
        .call(z.transform, initialTransform);
      select(rootG).attr(
        'transform',
        initialTransform
          .toString()
      );

      const svgSel = select(svg);
      svgSel
        .on('mousemove', null)
        .on('mousemove', (e: MouseEvent) => {
          if (isGuideArrowDrawing.current !== 0) {
            if (restrictCanvasActions()) return;
            const relativeCoord = fromPointer(e, rootG);
            svgSel.select<SVGGElement>('g.connectors')
              .selectAll<SVGPathElement, SVGGElement>('path.guide-arr')
              .attr('d', pEl => {
                const d = select<SVGGElement, AnnotationNode<dagre.Node>>(pEl).datum();
                return formPathUsingPoints([{
                  x: d.storedData!.x + d.storedData!.width,
                  y: d.storedData!.y + d.storedData!.height / 2,
                }, {
                  x: relativeCoord[0],
                  y: relativeCoord[1]
                }]);
              });
          }
        })
        .on('mousedown', null)
        .on('mousedown', () => {
          resetState();
        })
        .on('click', null)
        .on('click', resetState)
        .on('mouseup', null)
        .on('mouseup', () => {
          const guidePath = svgSel.select<SVGGElement>('g.connectors').selectAll<SVGPathElement, {}>('path.guide-arr');
          hideGuideConnector(guidePath);
          isGuideArrowDrawing.current = 0;
        });
    }
  }, [init]);

  function createPlusIconGroup(
    parent: D3Selection<SVGGElement, AnnotationNode<dagre.Node>, any, any>,
    position: AnnotationPosition
  ): void {
    parent
      .attr('class', `actnicngrp-${position}`)
      .attr(
        'transform',
        (d: AnnotationNode<dagre.Node>) => `translate(${position === 'prev' ? 20 : d.width - 20}, ${d.height / 2})`
      )
      .style('cursor', 'pointer')
      .on('mousedown', prevent)
      .on('mouseup', prevent)
      .on('click', function (e, d) {
        prevent(e);
        if (createJourneyModalRef.current) return;
        const con = svgRef.current!.parentNode as HTMLDivElement;
        const sel = select<SVGGElement, AnnotationNode<dagre.Node>>(this).datum();
        const relCoord = fromPointer(e, con);

        setAddScreenModalData(
          {
            position: getLRPosition(relCoord, con),
            annId: sel.id,
            screenAnnotation: d.annotation,
            annotationPosition: position
          }
        );
      });

    parent.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 10)
      .attr('class', 'plusicnbase')
      .attr('fill', 'transparent');

    parent
      .append('path')
      .attr('class', 'plusicn')
      .attr('stroke-width', 3)
      .attr('d', 'M-6 0 H6 M0 -6 V6');

    parent
      .append('circle')
      .attr('cx', -10)
      .attr('cy', -10)
      .attr('r', 20)
      .attr('class', 'plusicnovrly')
      .attr('fill', 'transparent');
  }

  /** *
   *
   * LAYOUTING
   *
   */

  function dagreAutoLayoutTimeline(): {
    newMultiAnnGNodesWithPositions: MultiAnnotationNode<dagre.Node>[],
    newSingleAnnNodesWithPositions: AnnotationNode<dagre.Node>[],
    newEdgesWithPositions: EdgeWithData[],
    } {
    const [nodesWithDims, edges] = getMultiAnnNodesAndEdges(
      props.timeline,
      {
        width: ANN_NODE_WIDTH,
        height: ANN_NODE_HEIGHT,
        gap: MULTI_ANN_NODE_GAP
      },
      props.journey,
      props.tourOpts
    );

    if (nodesWithDims.length === 0 && !props.shouldShowOnlyScreen) {
      props.shouldShowScreenPicker({ ...newScreenPickerData, showCloseButton: false });
    }

    const nodeLookup = nodesWithDims.reduce((hm, n) => {
      hm[n.id] = n;
      return hm;
    }, {} as Record<string, MultiAnnotationNode<dagre.Node>>);

    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: 'LR', ranksep: ANN_NODE_SEP, nodesep: ANN_NODE_SEP });
    graph.setDefaultEdgeLabel(() => ({}));
    nodesWithDims.forEach(node => graph.setNode(node.id, { label: node.id, width: node.width, height: node.height }));
    edges.forEach(edge => graph.setEdge(edge.fromZId, edge.toZId, {
      data: edge
    }));
    dagre.layout(graph);

    dagreGraphRef.current = graph;

    /** *
     * These are the multiAnnNodeG nodes
     */
    const newMultiAnnGNodesWithPositions: MultiAnnotationNode<dagre.Node>[] = graph.nodes().map(v => {
      const graphNode = graph.node(v);
      const logicalNode = nodeLookup[graphNode.label!];
      logicalNode.storedData = graphNode;
      logicalNode.origStoredData = { ...graphNode };
      return logicalNode;
    });

    // TODO Keep the x, y, width, height in d3 only and not in annCoords.
    // Right now we save it as part of d3 & react. That means this map code will be part of the above map code
    /**
         *  newSingleAnnNodesWithPositions contains the individual annotations nodes
         */
    const annCoords: AnnWithCoords[] = [];
    const newSingleAnnNodesWithPositions: AnnotationNode<dagre.Node>[] = [];

    newMultiAnnGNodesWithPositions.forEach(groupNode => {
      groupNode.data.anns.forEach(annNode => {
        const newX = groupNode.storedData!.x + annNode.x - groupNode.width / 2;
        const newY = groupNode.storedData!.y + annNode.y - groupNode.height / 2;
        annCoords.push({
          annId: annNode.annotation.refId,
          screenId: annNode.annotation.screen.id,
          x: newX,
          y: newY,
          width: annNode.width,
          height: annNode.height,
        });
        const storedData = {
          ...groupNode.storedData as dagre.Node,
          x: newX,
          y: newY,
          width: annNode.width,
          height: annNode.height
        };
        newSingleAnnNodesWithPositions.push({
          ...annNode,
          storedData: { ...storedData },
          origStoredData: { ...storedData },
        });
      });
    });

    setAnnWithCoords(annCoords);

    const newEdgesWithPositions: EdgeWithData[] = graph.edges().map(ed => {
      const e = graph.edge(ed);
      const data = e.data as GroupEdge;
      return {
        ...e,
        srcId: ed.v,
        destId: ed.w,
        data,
      };
    });

    return {
      newMultiAnnGNodesWithPositions,
      newSingleAnnNodesWithPositions,
      newEdgesWithPositions,
    };
  }

  function renderDagreAutoLayoutTimeline(shouldUpdatePos: boolean): void {
    const rootG = rootGRef.current;
    const svgEl = svgRef.current;
    if (!rootG || !svgEl) {
      return;
    }

    expandedMultAnnZIds.current = [];
    updateMultiNodeCloseIconStyle(select(svgEl), false, null);

    const {
      newMultiAnnGNodesWithPositions,
      newSingleAnnNodesWithPositions,
      newEdgesWithPositions,
    } = dagreAutoLayoutTimeline();

    const g = select(rootG);

    showOrHideModuleTitle(true);

    const gBoundData = g
      .selectAll<SVGGElement, number>('g.connectors')
      .data([props.allAnnotationsForTour], () => 1);

    const connectorG = gBoundData
      .enter()
      .append('g')
      .attr('class', 'connectors')
      .merge(gBoundData);

    // Connectors or edges are drawn like this
    // <g>
    //   <path> <- transparent thick path that detects interaction
    //   <path> <- original edge drawing
    //   <circle> <- when interaction is detected and shows menu
    // </g>
    const connectorGDataBound = connectorG
      .selectAll<SVGGElement, EdgeWithData>('g.edgegrp')
      .data(newEdgesWithPositions, d => `${d.srcId}:${d.destId}`);
    connectorGDataBound
      .enter()
      .append('g')
      .attr('class', 'edgegrp')
      .call(grp => {
        grp
          .append('path')
          .style('marker-end', 'url(#triangle-arrowhead)')
          .attr('fill', 'none')
          .attr('class', 'edgeconn')
          .attr('stroke-width', 1)
          .attr('stroke', CONNECTOR_COLOR_NON_HOVERED)
          .attr('d', attr => lines(attr.points as any));

        grp
          .append('path')
          .attr('fill', 'none')
          .attr('stroke-width', 20)
          .attr('stroke', CONNECTOR_HOTSPOT_COLOR_NON_HOVERED)
          .attr('fill', 'transparent')
          .attr('class', 'edgehotspot')
          .attr('cursor', 'pointer')
          .attr('d', attr => lines(attr.points as any))
          .on('mouseover', function () {
            if (restrictCanvasActions()) return;
            // eslint-disable-next-line react/no-this-in-sfc
            const gEl = select<SVGGElement, EdgeWithData>(this.parentElement as unknown as SVGGElement);
            gEl.select('path.edgeconn').attr('stroke', CONNECTOR_COLOR_HOVERED);
            gEl.select('path.edgehotspot').attr('stroke', CONNECTOR_HOTSPOT_COLOR_HOVERED);
          })
          .on('mouseout', function () {
            // eslint-disable-next-line react/no-this-in-sfc
            const gEl = select<SVGGElement, EdgeWithData>(this.parentElement as unknown as SVGGElement);
            gEl.select('path.edgeconn').attr('stroke', CONNECTOR_COLOR_NON_HOVERED);
            gEl.select('path.edgehotspot').attr('stroke', CONNECTOR_HOTSPOT_COLOR_NON_HOVERED);
          })
          .on('click', function (e: MouseEvent) {
            if (restrictCanvasActions()) return;
            const con = svgRef.current!.parentNode as HTMLDivElement;
            const relCoord = fromPointer(e, con);
            const d = select<SVGGElement, EdgeWithData>(this).datum();
            const edge: GroupEdge = dagreGraphRef.current!.edge(d.srcId, d.destId).data;
            setConnectorMenuModalData({
              position: getLRPosition(relCoord, con),
              fromAnnId: edge.fromAnnId,
              toAnnId: edge.toAnnId,
            });
          });
      })
      .merge(connectorGDataBound)
      .call(setOrignalEdgePos);

    connectorGDataBound.exit().remove();

    const multiAnnG = g
      .selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.multi-node')
      .data<MultiAnnotationNode<dagre.Node>>(newMultiAnnGNodesWithPositions, d => d.id);

    multiAnnG
      .enter()
      .append('g')
      .attr('class', 'multi-node')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', d => d.storedData!.width)
      .attr('height', d => d.storedData!.height)
      .call(node => {
        node.append('rect').attr('class', 'marker-el');
      })
      .call(node => {
        const closeActn = node.append('g').attr('class', 'close-actn');
        closeActn.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', 10)
          .attr('class', 'close-cont')
          .attr('fill', 'transparent');
        closeActn
          .append('path')
          .attr('class', 'closeicn')
          .attr('stroke-width', 2)
          .attr('stroke', 'transparent')
          // eslint-disable-next-line max-len
          .attr('d', 'M14.25 4.81125L13.1887 3.75L9 7.93875L4.81125 3.75L3.75 4.81125L7.93875 9L3.75 13.1887L4.81125 14.25L9 10.0612L13.1887 14.25L14.25 13.1887L10.0612 9L14.25 4.81125Z');
      })
      .merge(multiAnnG)
      .call(node => {
        if (shouldUpdatePos) { updateMultiNodePos(node); }
      })
      .call(renderMultiNodeMarker)
      .call(node => {
        const closeActn = node.selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('g.close-actn')
          .data(node.data(), d => d.id);

        closeActn
          .attr('class', 'close-actn')
          .merge(closeActn)
          .attr(
            'transform',
            (d: MultiAnnotationNode<dagre.Node>) => `translate(${d.width + MULTI_ANN_G_MARKER_MARGIN}, ${d.y})`
          )
          .style('cursor', 'pointer')
          .on('mousedown', prevent)
          .on('mouseup', prevent)
          .on('click', function (e) {
            prevent(e);
            const d = select<SVGGElement, MultiAnnotationNode<dagre.Node>>(this).datum();
            const data = d.data.anns[0];
            const isGrpExpanded = data.sameMultiAnnGroupAnnRids!.length !== 0
            && expandedMultAnnZIds.current.includes(data.annotation.zId);
            if (isGrpExpanded) {
              collapseSelectedMultiNode(data.annotation);
            }
          })
          .style('fill', 'none')
          .style('stroke', 'none')
          .style('display', 'flex');

        closeActn
          .exit()
          .remove();
      });
    multiAnnG
      .exit()
      .remove();

    const nodeG = g
      .selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node')
      .data<AnnotationNode<dagre.Node>>(d => newSingleAnnNodesWithPositions, d => d.annotation.refId);
    nodeG
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .on('mouseover', null)
      .on('mouseover', function () {
        const gEl = select<SVGGElement, AnnotationNode<dagre.Node>>(this);
        if ((annEditorModalRef.current && annEditorModalRef.current.annId === gEl.datum().annotation.refId)
          || createJourneyModalRef.current) return;

        if (restrictMultiGroupAction(gEl.datum()) && !annEditorModalRef.current) {
          updateMultiNodeSelectionStyle(gEl.datum(), true, Tags.TILE_STROKE_COLOR_ON_HOVER);
          return;
        }

        setAnnNodeSelectionStyle(gEl, Tags.TILE_STROKE_COLOR_ON_HOVER);
      })
      .on('mousedown', null)
      .on('mouseup', null)
      .on('mouseup', function (e: MouseEvent) {
        prevent(e);
        if (createJourneyModalRef.current) return;

        const toEl = this;
        const fromEl = connectorG.selectAll<SVGPathElement, SVGGElement>('path.guide-arr').datum();
        const fromElSel = select<SVGGElement, AnnotationNode<dagre.Node>>(fromEl);
        const fromElData = fromElSel.datum();
        const toElData = select<SVGGElement, AnnotationNode<dagre.Node>>(toEl).datum();
        isGuideArrowDrawing.current = 0;
        if (fromElData.id === toElData.id) return;
        if (annEditorModalRef.current) return;
        const allAnns = g.selectAll<SVGGElement, AnnotationPerScreen[]>('g.connectors').datum();
        const lookupMap = getAnnotationLookupMap(allAnns);
        updateConnection(allAnns, lookupMap, fromElData.id, toElData.id, props.onTourDataChange, fromElData.opts);

        hideGuideConnector(connectorG.selectAll('path.guide-arr'));
      })
      .on('mouseout', null)
      .on('mouseout', function () {
        const gEl = select<SVGGElement, AnnotationNode<dagre.Node>>(this);
        if (annEditorModalRef.current && annEditorModalRef.current.annId === gEl.datum().annotation.refId) return;
        if (restrictMultiGroupAction(gEl.datum()) && !annEditorModalRef.current) {
          updateMultiNodeSelectionStyle(gEl.datum(), false, '');
          return;
        }
        resetAnnNodeSelectionStyle(gEl);
      })
      .call(p => {
        // background rect which covers the entire annotation node
        p.append('rect')
          .attr('class', 'bg')
          .style('filter', 'drop-shadow(1px 1px 0px #616161)')
          .style('stroke', '#616161')
          .style('stroke-width', '1')
          .attr('rx', ANN_NODE_BORDER_RADIUS)
          .attr('ry', ANN_NODE_BORDER_RADIUS)
          .attr('x', '0')
          .attr('y', '0')
          .attr('width', d => d.width)
          .attr('height', d => d.height);

        p
          .append('image')
          .attr('preserveAspectRatio', 'xMidYMid meet')
          .attr('clip-path', 'url(#fit-rect)');

        p.append('foreignObject')
          .attr('class', 'step-num')
          .call(fo => {
            fo
              .append('xhtml:div')
              .call(div => {
                div.append('xhtml:p');
              });
          });

        p
          .append('foreignObject')
          .attr('class', 'main-marker')
          .call(fo => {
            fo.append('xhtml:p');
          });

        p.append('foreignObject')
          .attr('class', 'ann-info')
          .call(fo => {
            fo.append('xhtml:p');
          });

        p
          .append('foreignObject')
          .attr('class', 'module-title')
          .call(fo => {
            fo.append('xhtml:p');
          });

        const dropTgHeight = 42;

        ['l', 'r'].forEach(pos => {
          p
            .append('rect')
            .attr('class', `tg-hide droptg ${pos}`)
            .attr('y', -dropTgHeight / 2)
            .attr('x', d => (pos === 'l'
              ? -(DROP_TARGET_PEEK_WIDTH + DROP_TARGET_PEEK_GUTTER)
              : d.width + DROP_TARGET_PEEK_GUTTER))
            .attr('rx', 4)
            .attr('ry', 4)
            .attr('height', d => d.height + dropTgHeight)
            .attr('width', DROP_TARGET_PEEK_WIDTH);
        });

        p.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('rx', ANN_NODE_BORDER_RADIUS)
          .attr('ry', ANN_NODE_BORDER_RADIUS)
          .attr('class', 'interaction-marker')
          .style('fill', 'none')
          .style('stroke', 'transparent')
          .style('stroke-width', TILE_STROKE_WIDTH_DEFAULT);

        const leftPlusG = p.append<SVGGElement>('g');
        createPlusIconGroup(leftPlusG, 'prev');
        const rightPlusG = p.append<SVGGElement>('g');
        createPlusIconGroup(rightPlusG, 'next');

        const MENU_ICON_WIDTH = 20;
        const MENU_ICON_PADDING = 10.5;
        const menug = p
          .append('g')
          .attr('transform', d => `translate(${d.width - MENU_ICON_WIDTH - MENU_ICON_PADDING}, ${MENU_ICON_PADDING})`)
          .style('cursor', 'pointer')
          .on('mousedown', prevent)
          .on('mouseup', prevent)
          .on('click', function (e) {
            prevent(e);
            if (createJourneyModalRef.current) return;
            const con = svgRef.current!.parentNode as HTMLDivElement;
            const relCoord = fromPointer(e, con);
            const d = select<SVGGElement, AnnotationNode<dagre.Node>>(this).datum();
            setNodeMenuModalData({
              position: getLRPosition(relCoord, con),
              annId: d.id
            });
          });

        menug
          .append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('height', MENU_ICON_WIDTH)
          .attr('width', MENU_ICON_WIDTH)
          .attr('rx', MENU_ICON_WIDTH / 2)
          .attr('class', 'menuicnovrly')
          .attr('fill', 'transparent');

        menug
          .append('path')
          .attr('class', 'menuicn')
          .attr('fill', 'transparent')
          .attr('transform', d => 'translate(-2, -2)')
        // eslint-disable-next-line max-len
          .attr('d', 'M11.997 17.3333C11.7212 17.3333 11.4861 17.2351 11.2917 17.0387C11.0972 16.8423 11 16.6062 11 16.3304C11 16.0546 11.0982 15.8194 11.2946 15.625C11.491 15.4306 11.7271 15.3333 12.003 15.3333C12.2788 15.3333 12.5139 15.4315 12.7083 15.628C12.9028 15.8244 13 16.0605 13 16.3363C13 16.6121 12.9018 16.8472 12.7054 17.0417C12.509 17.2361 12.2729 17.3333 11.997 17.3333ZM11.997 12.6667C11.7212 12.6667 11.4861 12.5685 11.2917 12.372C11.0972 12.1756 11 11.9395 11 11.6637C11 11.3879 11.0982 11.1528 11.2946 10.9583C11.491 10.7639 11.7271 10.6667 12.003 10.6667C12.2788 10.6667 12.5139 10.7649 12.7083 10.9613C12.9028 11.1577 13 11.3938 13 11.6696C13 11.9454 12.9018 12.1806 12.7054 12.375C12.509 12.5694 12.2729 12.6667 11.997 12.6667ZM11.997 8C11.7212 8 11.4861 7.90179 11.2917 7.70537C11.0972 7.50897 11 7.27286 11 6.99704C11 6.72124 11.0982 6.48611 11.2946 6.29167C11.491 6.09722 11.7271 6 12.003 6C12.2788 6 12.5139 6.09821 12.7083 6.29463C12.9028 6.49103 13 6.72714 13 7.00296C13 7.27876 12.9018 7.51389 12.7054 7.70833C12.509 7.90278 12.2729 8 11.997 8Z');

        const connectorCircleG = p
          .append('g')
          .attr('transform', d => `translate(${d.width}, ${d.height / 2})`)
          .style('cursor', 'pointer');

        connectorCircleG
          .append('circle')
          .attr('class', 'connector-indicator')
          .attr('cx', '0')
          .attr('cy', '0')
          .attr('r', '5')
          .attr('fill', 'transparent')
          .attr('stroke-width', '2px');
      })
      .merge(nodeG)
      .call(node => {
        if (shouldUpdatePos) { updateNodePos(node); }
      })
      .call(nodeDraggable())
      .call(p => p.raise())
      .call(p => {
        const bgEl = p.selectAll<SVGRectElement, AnnotationNode<dagre.Node>>('rect.bg')
          .data(p.data(), d => d.id);

        bgEl
          .merge(bgEl)
          .style('fill', '#e1e1e1');

        p.selectAll<SVGImageElement, AnnotationNode<dagre.Node>>('image')
          .data(p.data(), d => d.id)
          .attr('href', d => d.imageUrl)
          .attr('x', ANN_NODE_PADDING)
          .attr('width', d => d.width - ANN_NODE_PADDING * 2)
          .attr('y', ANN_NODE_PADDING);

        p.selectAll<SVGRectElement, AnnotationNode<dagre.Node>>('rect.droptg.r')
          .data(p.data(), d => d.id);

        p.selectAll<SVGRectElement, AnnotationNode<dagre.Node>>('rect.droptg.l')
          .data(p.data(), d => d.id)
          .style('visibility', 'visible')
          .filter((d) => d.localIdx !== 0)
          .style('visibility', 'hidden');

        p.selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.actnicngrp-next').data(p.data(), d => d.id);
        p.selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.actnicngrp-prev').data(p.data(), d => d.id);

        const connectorIndicator = p
          .selectAll<SVGCircleElement, AnnotationNode<dagre.Node>>('circle.connector-indicator')
          .data(p.data(), d => d.id);

        connectorIndicator
          .merge(connectorIndicator)
          .on('mouseover', function (e: MouseEvent) {
            const el = select<SVGCircleElement, AnnotationNode<dagre.Node>>(this);
            el.attr('r', 8);
          })
          .on('mouseout', function (e: MouseEvent) {
            const el = select<SVGCircleElement, AnnotationNode<dagre.Node>>(this);
            el.attr('r', 5);
          })
          .on('mousedown', function (e: MouseEvent) {
            prevent(e);
            if (createJourneyModalRef.current) return;
            connectorG
              .selectAll('path.guide-arr')
              .data([this])
              .enter()
              .append('path')
              .attr('class', 'guide-arr')
              .style('fill', 'none')
              .style('stroke', 'black')
              .style('stroke-width', '2px')
              .style('marker-end', 'url(#triangle-arrowhead)')
              .attr('d', '');
            isGuideArrowDrawing.current = 1;
          });

        const stepNumCon = p
          .selectAll<SVGForeignObjectElement, AnnotationNode<dagre.Node>>('foreignObject.step-num')
          .data(p.data(), d => d.id);

        stepNumCon.merge(stepNumCon)
          .attr('width', d => d.width)
          .attr('height', 45)
          .attr('x', 0)
          .attr('y', d => d.height - 45)
          .style('border-radius', `${ANN_NODE_BORDER_RADIUS}px`)
          .call(fo => {
            const stepNumWrapper = fo.selectAll<HTMLParagraphElement, AnnotationNode<dagre.Node>>('div')
              .data(p.data(), d => d.id);

            stepNumWrapper
              .merge(stepNumWrapper)
              .style('display', 'flex')
              .style('align-items', 'flex-end')
              .style('padding-right', '15px')
              .style('height', '100%')
              .style('width', 'fit-content')
              .style('background', 'radial-gradient(100% 120% at 0px 120%, rgba(13, 18, 22, 0.7), rgba(0, 0, 0, 0))');

            const stepNumber = stepNumWrapper.selectAll<HTMLParagraphElement, AnnotationNode<dagre.Node>>('p')
              .data(p.data(), d => d.id);

            stepNumber.merge(stepNumber)
              .style('width', d => d.width)
              .style('height', '24px')
              .style('display', 'inline-block')
              .style('text-align', 'left')
              .style('font-weight', 600)
              .style('margin', 0)
              .style('font-size', '16px')
              .style('text-shadow', 'rgba(0, 0, 0, 1) 2px 0px 15px, rgb(0, 0, 0) 2px 0px 20px')
              .style('color', 'white')
              .style('padding', '2px 8px')
              .text(d => `${d.stepNumber.substring(0, 30)}${d.stepNumber.length > 30 ? '...' : ''}`);
          });

        const moduleTextCon = p
          .selectAll<SVGForeignObjectElement, AnnotationNode<dagre.Node>>('foreignObject.module-title')
          .data(p.data(), d => d.id);

        moduleTextCon
          .merge(moduleTextCon)
          .style('display', (d) => (d.journeyTitle === undefined ? 'none' : 'block'))
          .attr('width', '100%')
          .attr('height', MODULE_TITLE_HEIGHT)
          .attr('x', 0)
          .attr('y', -(MODULE_TITLE_HEIGHT + MODULE_TITLE_PADDING))
          .on('mousedown', e => prevent(e))
          .on('mouseup', e => prevent(e))
          .on('mouseover', e => prevent(e))
          .call(fo => {
            const moduleTitle = fo.selectAll<HTMLParagraphElement, AnnotationNode<dagre.Node>>('p')
              .data(p.data(), d => d.id);

            moduleTitle
              .merge(moduleTitle)
              .style('width', 'fit-content')
              .style('margin', 0)
              .style('padding', '0 0.5rem')
              .style('border-radius', '4px')
              .style('font-size', '16px')
              .style('display', 'flex')
              .style('align-items', 'center')
              .style('justify-content', 'center')
              .style('text-align', 'center')
              .style('background', '#fedf64')
              .style('box-shadow', '1px 1px 0px 0px #9E9E9E')
              .style('color', 'black')
              .style('cursor', 'default')
              .text(d => `Module: ${d.journeyTitle}`);
          });
        const mainMarkerCon = p
          .selectAll<SVGForeignObjectElement, AnnotationNode<dagre.Node>>('foreignObject.main-marker')
          .data(p.data(), d => d.id);

        mainMarkerCon
          .merge(mainMarkerCon)
          .style('display', (d) => {
            if (props.journey.flows.length > 0) {
              return 'none';
            }

            if (d.id === props.tourOpts.main) {
              return 'block';
            }

            return 'none';
          })
          .attr('width', '100%')
          .attr('height', MODULE_TITLE_HEIGHT)
          .attr('x', 0)
          .attr('y', -(MODULE_TITLE_HEIGHT + MODULE_TITLE_PADDING))
          .on('mousedown', e => prevent(e))
          .on('mouseup', e => prevent(e))
          .on('mouseover', e => prevent(e))
          .call(fo => {
            const mainMarker = fo.selectAll<HTMLParagraphElement, AnnotationNode<dagre.Node>>('p')
              .data(p.data(), d => d.id);

            mainMarker
              .merge(mainMarker)
              .style('width', 'fit-content')
              .style('margin', 0)
              .style('padding', '0 0.5rem')
              .style('border-radius', '4px')
              .style('font-size', '16px')
              .style('display', 'flex')
              .style('align-items', 'center')
              .style('justify-content', 'center')
              .style('text-align', 'center')
              .style('color', 'black')
              .style('cursor', 'default')
              .text(d => '⤵');
          });
        const annTextCon = p
          .selectAll<SVGForeignObjectElement, AnnotationNode<dagre.Node>>('foreignObject.ann-info')
          .data(p.data(), d => d.id);

        annTextCon
          .merge(annTextCon)
          .style('display', () => (showAnnText ? 'block' : 'none'))
          .attr('width', d => d.width)
          .attr('height', d => d.height)
          .style('border-radius', `${ANN_NODE_BORDER_RADIUS}px`)
          .attr('x', 0)
          .attr('y', 0)
          .call(fo => {
            const annText = fo.selectAll<HTMLParagraphElement, AnnotationNode<dagre.Node>>('p')
              .data(p.data(), d => d.id);

            annText
              .merge(annText)
              .style('width', d => d.width)
              .style('display', 'block')
              .style('height', '100%')
              .style('margin', 0)
              .style('font-size', '16px')
              .style('color', 'black')
              .style('padding', '2px')
              .style('display', 'flex')
              .style('align-items', 'center')
              .style('justify-content', 'center')
              .style('cursor', 'pointer')
              .style('text-align', 'center')
              .style('background', 'rgba(0, 0, 0, 0.2)')
              .style('color', 'black')
              .text(d => getFormatedAnnText(d.text));
          });

        p.selectAll<SVGTextElement, AnnotationNode<dagre.Node>>('rect.interaction-marker')
          .data(p.data(), d => d.id)
          .attr('width', d => d.width)
          .attr('height', d => d.height);
      });

    nodeG
      .exit()
      .remove();
  }

  function showOrHideModuleTitle(show: boolean): void {
    const g = select(rootGRef.current!);
    g
      .selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node')
      .selectAll<SVGGElement, AnnotationNode<dagre.Node>>('foreignObject.module-title')
      .style('display', (d) => ((show && d.journeyTitle !== undefined) ? 'block' : 'none'));
  }

  function renderTimelineInSingleLine(timelineNodeY: number): void {
    const g = select(rootGRef.current!);

    const annConfig = getAnnotationByRefId(selectedAnnId, props.allAnnotationsForTour);
    if (!annConfig) return;
    const timelineId = annConfig.grpId;
    const outsideAnnsZid : string[] = [];

    const selectedMultiNode = g.selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('g.multi-node')
      .filter(d => !!d.data.anns.find(ann => ann.annotation.refId === selectedAnnId));
    if (selectedMultiNode.empty()) return;

    const timelineTopYLimit = timelineNodeY - ANN_NODE_TOP_MARGIN_FOR_EDITOR;
    const timelineBottomYLimit = timelineNodeY + ANN_NODE_HEIGHT + ANN_NODE_BOTTOM_MARGIN_FOR_EDITOR;
    const timelineMidY = (timelineBottomYLimit - timelineTopYLimit) / 2 + timelineTopYLimit;

    // change y of multi nodes of the same timeline
    const multiNodeG = g.selectAll<SVGGElement, MultiAnnotationNode<dagre.Node>>('g.multi-node');
    const newMultiAnnGNodesWithPositions = multiNodeG.data();

    showOrHideModuleTitle(false);
    const updatedMultiNodeGData = newMultiAnnGNodesWithPositions
      .map(node => {
        if (node.data.anns.find(a => a.annotation.grpId === timelineId)) {
          node.storedData!.y = timelineNodeY;
        } else {
          // if any ann from other timeline is in the timeline area, we push it outside of timeline view
          const dim = node.origStoredData!;
          const top = dim.y;
          const bottom = dim.y + dim.height;
          const isNodeInTimelineArea = (top >= timelineTopYLimit && top <= timelineBottomYLimit)
            || (bottom >= timelineTopYLimit && bottom <= timelineBottomYLimit);
          if (isNodeInTimelineArea) {
            if (dim.y < timelineMidY) {
              const totalHeight = dim.height + ANN_NODE_TOP_MARGIN_FOR_EDITOR + ANN_NODE_BOTTOM_MARGIN_FOR_EDITOR;
              node.storedData!.y = timelineTopYLimit - totalHeight;
            } else {
              node.storedData!.y = timelineBottomYLimit + ANN_NODE_BOTTOM_MARGIN_FOR_EDITOR;
            }
          }
          outsideAnnsZid.push(node.data.zId);
        }
        return node;
      });

    const multiNodeGDataBound = multiNodeG.data<MultiAnnotationNode<dagre.Node>>(updatedMultiNodeGData, d => d.id);
    multiNodeGDataBound
      .merge(multiNodeGDataBound)
      .call(updateMultiNodePos)
      .call(renderMultiNodeMarker);

    // update single ann nodes's positions
    const updatedSingleAnnNodesWithPositions: AnnotationNode<dagre.Node>[] = [];
    updatedMultiNodeGData.forEach(groupNode => {
      groupNode.data.anns.forEach(annNode => {
        const newX = groupNode.storedData!.x - groupNode.storedData!.width / 2;
        let newY = groupNode.storedData!.y - groupNode.storedData!.height / 2;

        if (groupNode.data.anns.find(ann => ann.annotation.grpId === timelineId)) {
          newY = timelineNodeY - annNode.origStoredData!.height / 2;
        }

        let margin = 0;
        if (annNode.sameMultiAnnGroupAnnRids!.length > 0) margin = MULTI_ANN_G_MARKER_MARGIN;
        const storedData = {
          ...annNode.storedData as dagre.Node,
          x: newX + margin,
          y: newY,
        };
        updatedSingleAnnNodesWithPositions.push({
          ...annNode,
          storedData: { ...storedData },
          origStoredData: { ...storedData },
        });
      });
    });

    const nodeG = g.selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node');
    const nodeGDataBound = nodeG.data<AnnotationNode<dagre.Node>>(updatedSingleAnnNodesWithPositions, d => d.id);
    nodeGDataBound
      .merge(nodeGDataBound)
      .call(updateNodePos)
      .filter(d => d.annotation.grpId === timelineId).each(function (d) {
        select(this).call(p => p.raise());
      })
      .filter(d => d.annotation.refId === selectedAnnId)
      .each(function () {
        select(this).call(p => p.raise());
      });

    // update connectors
    updateSelectedMultiNodeEdgesPos(updatedSingleAnnNodesWithPositions, outsideAnnsZid);
  }

  const renderMultiNodeMarker = (
    node: D3Selection<SVGGElement, MultiAnnotationNode<dagre.Node>, SVGGElement, {}>
  ): void => {
    const markerEl = node.selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('rect.marker-el')
      .data(node.data(), d => d.id);

    markerEl
      .attr('class', 'marker-el')
      .merge(markerEl)
      .attr('x', -MULTI_ANN_G_MARKER_MARGIN)
      .attr('y', -MULTI_ANN_G_MARKER_MARGIN)
      .attr('rx', ANN_NODE_BORDER_RADIUS)
      .attr('ry', ANN_NODE_BORDER_RADIUS)
      .attr('width', d => d.storedData!.width + MULTI_ANN_G_MARKER_MARGIN * 2)
      .attr('height', d => d.storedData!.height + MULTI_ANN_G_MARKER_MARGIN * 2)
      .style('fill', 'none')
      .style('display', 'none');

    markerEl
      .exit()
      .remove();
  };

  function resetNodePos(): void {
    const g = select(rootGRef.current);
    g
      .selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node')
      .transition()
      .attr(
        'transform',
        d => {
          const pos = d.origStoredData!;
          const x = pos.x;
          const y = pos.y;
          return `translate(${x}, ${y})`;
        }
      );

    g
      .selectAll('rect.connectors')
      .selectAll<SVGGElement, EdgeWithData>('g.edgegrp')
      .call(p => {
        setOrignalEdgePos(p as D3Selection<SVGGElement, EdgeWithData, SVGGElement, AnnotationPerScreen[]>);
      });
  }

  function setOrignalEdgePos(node: D3Selection<SVGGElement, EdgeWithData, SVGGElement, AnnotationPerScreen[]>): void {
    ['path.edgeconn', 'path.edgehotspot'].forEach(sel => {
      node.selectAll<SVGPathElement, EdgeWithData>(sel)
        // .filter((n) => n.srcId !== n.destId)
        .data(node.data(), d => `${d.srcId}:${d.destId}`)
        .attr('d', attr => {
          if (attr.destId === attr.srcId) {
            return lines([]);
          }
          return lines(attr.points as any);
        });
    });
  }

  function updateSelectedMultiNodeEdgesPos(
    updatedNodeData: AnnotationNode<dagre.Node>[],
    outsideAnnsZid: string[] = []
  ): void {
    const g = select(rootGRef.current);

    g
      .selectAll('g.connectors')
      .selectAll<SVGGElement, EdgeWithData>('g.edgegrp')
      .call(p => {
        ['path.edgeconn', 'path.edgehotspot'].forEach(sel => {
          p.selectAll<SVGPathElement, EdgeWithData>(sel)
            .data(p.data(), d => `${d.srcId}:${d.destId}`)
            .attr('d', attr => {
              if (outsideAnnsZid.includes(attr.destId) || outsideAnnsZid.includes(attr.srcId)) {
                return lines([]);
              }
              const fromNode = updatedNodeData.find((nodeD) => nodeD.id === attr.data.fromAnnId);

              const fromX = fromNode!.storedData!.x;
              const fromY = fromNode!.storedData!.y;

              const toNode = updatedNodeData.find((nodeD) => nodeD.id === attr.data.toAnnId);

              const toX = toNode!.storedData!.x;
              const toY = toNode!.storedData!.y;
              const nodeH = fromNode!.storedData!.height / 2;

              return formPathUsingPoints([
                { x: fromX + fromNode!.storedData!.width, y: fromY + nodeH },
                { x: toX, y: toY + nodeH }]);
            });
        });
      });
  }

  const updateMultiNodeMarkerSize = (
    multiG: D3Selection<SVGRectElement, MultiAnnotationNode<dagre.Node>, SVGSVGElement, unknown>,
    multiGData: MultiAnnotationNode<dagre.Node>[],
    annotation: IAnnotationConfigWithScreen,
    show: boolean
  ) : void => {
    const mnodeGDataBound = multiG.data<MultiAnnotationNode<dagre.Node>>(multiGData, d => d.id);
    mnodeGDataBound.merge(mnodeGDataBound)
      .attr('height', d => `${d.height}`)
      .attr('width', d => `${d.width}`)
      .call(node => node.selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('rect.marker-el')
        .filter(d => d.data.zId === annotation.zId)
        .transition()
        .attr('height', d => `${d.height + MULTI_ANN_G_MARKER_MARGIN * 2}`)
        .attr('width', d => `${d.width + MULTI_ANN_G_MARKER_MARGIN * 2}`))
      .call(grpNode => updateMultiNodeCloseIconStyle(grpNode, show, annotation));
  };

  const updateMultiNodeCloseIconStyle = (
    node: any,
    show: boolean,
    annotation: IAnnotationConfigWithScreen | null
  ): void => {
    node
      .selectAll('g.close-actn')
      .filter((dd: MultiAnnotationNode<dagre.Node>) => {
        if (annotation) {
          return dd.data.anns.length > 0
        && dd.data.anns[0].annotation.screen.id === annotation.screen.id
        && dd.id === annotation.zId;
        }
        return true;
      })
      .attr(
        'transform',
        (d: MultiAnnotationNode<dagre.Node>) => `translate(${d.width + MULTI_ANN_G_MARKER_MARGIN}, ${d.y})`
      )
      .selectAll('path.closeicn')
      .style('display', () => (show ? 'block' : 'none'))
      .style('stroke', () => (show ? 'red' : 'transparent'));
  };

  const updateMultiNodeSelectionStyle = (
    data: AnnotationNode<dagre.Node>,
    show: boolean,
    color: string,
  ): void => {
    select(svgRef.current!)
      .selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('g.multi-node')
      .filter(dd => dd.data.anns.length > 0
        && dd.data.anns[0].annotation.screen.id === data.annotation.screen.id
        && dd.id === data.annotation.zId)
      .selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('rect')
      .style('display', () => (show ? 'block' : 'none'))
      .style('stroke-width', TILE_STROKE_WIDTH_ON_HOVER)
      .style('stroke', () => (show ? color : 'transparent'));
  };

  const setAnnNodeSelectionStyle = (
    node: D3Selection<SVGGElement, AnnotationNode<dagre.Node>, any, any>,
    color: string,
  ): void => {
    node.selectAll('rect.interaction-marker')
      .style('stroke-width', TILE_STROKE_WIDTH_ON_HOVER)
      .style('stroke', color)
      .style('display', 'block');

    node.selectAll('g.actnicngrp-prev')
      .style('display', 'block');

    node.selectAll('g.actnicngrp-next')
      .style('display', 'block');

    node.selectAll('circle.plusicnbase')
      .style('fill', color)
      .style('display', 'block');

    node.selectAll('path.menuicn')
      .style('fill', Tags.TILE_STROKE_COLOR_DEFAULT)
      .style('display', 'block');

    node.selectAll('rect.menuicnovrly')
      .style('fill', color)
      .style('display', 'block');

    node.selectAll('path.plusicn')
      .style('stroke', Tags.TILE_STROKE_COLOR_DEFAULT)
      .style('display', 'block');

    if (!annEditorModalRef.current) {
      node
        .selectAll('circle.connector-indicator')
        .style('stroke', color)
        .style('fill', 'white')
        .style('display', 'block');
    }
  };

  const resetAnnNodeSelectionStyle = (
    node: D3Selection<SVGGElement, AnnotationNode<dagre.Node>, any, any>
  ): void => {
    node.selectAll('rect.interaction-marker')
      .style('stroke', 'transparent')
      .style('display', 'none');

    node.selectAll('g.actnicngrp-prev')
      .style('display', 'none');

    node.selectAll('g.actnicngrp-next')
      .style('display', 'none');

    node.selectAll('circle.plusicnbase')
      .style('fill', 'transparent')
      .style('display', 'none');

    node.selectAll('path.menuicn')
      .style('fill', 'transparent')
      .style('display', 'none');

    node.selectAll('rect.menuicnovrly')
      .style('fill', 'transparent')
      .style('display', 'none');

    node.selectAll('path.plusicn')
      .style('stroke', 'transparent')
      .style('display', 'none');

    node
      .selectAll('circle.connector-indicator')
      .style('stroke', 'transparent')
      .style('fill', 'transparent')
      .style('display', 'none');
  };

  const getAnnModalArrowLeftPos = (annCoordsCenterX: number, newSvgZoomX: number): number => {
    const left = newSvgZoomX + (annCoordsCenterX * ANN_EDITOR_ZOOM);
    return left;
  };

  const getAnnNodeCoordsCenterXForAnnModalArrow = (annRefId: string): number => {
    const selectedMultiNodeData = selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('g.multi-node')
      .filter(d => !!d.data.anns.find(ann => ann.annotation.refId === annRefId));
    if (selectedMultiNodeData.size() === 0) return screenEditorArrowLeft;
    const data = selectedMultiNodeData.datum();
    const annCoords = data.storedData!;
    return annCoords.x;
  };

  const zoomThenPan = (
    currZoom: { x: number, y: number, k: number },
    intermediateZoom: { x: number, y: number, k: number },
    newZoom: { x: number, y: number, k: number }
  ): void => {
    const currZoomTransform = zoomIdentity
      .translate(currZoom.x, currZoom.y)
      .scale(currZoom.k);
    const onlyZoomTransform = zoomIdentity
      .translate(intermediateZoom.x, intermediateZoom.y)
      .scale(intermediateZoom.k);
    const finalTransform = zoomIdentity
      .translate(newZoom.x!, newZoom.y!)
      .scale(newZoom.k!);

    select<SVGSVGElement, unknown>(svgRef.current!)
      .call(zoomBehaviorRef.current!.transform, currZoomTransform)
      .transition()
      .duration(ANN_EDITOR_ANIM_DUR)
      .call(zoomBehaviorRef.current!.transform, onlyZoomTransform)
      .transition()
      .duration(ANN_EDITOR_ANIM_DUR)
      .call(zoomBehaviorRef.current!.transform, finalTransform);
  };

  const panThenZoom = (
    intermediateZoom: { x: number, y: number, k: number },
    newZoom: { x: number, y: number, k: number }
  ): void => {
    const onlyTranslateTransform = zoomIdentity
      .translate(intermediateZoom.x, intermediateZoom.y)
      .scale(intermediateZoom.k);
    const finalTransform = zoomIdentity
      .translate(newZoom.x, newZoom.y)
      .scale(newZoom.k);

    select<SVGSVGElement, unknown>(svgRef.current!)
      .transition()
      .duration(ANN_EDITOR_ANIM_DUR)
      .call(zoomBehaviorRef.current!.transform, onlyTranslateTransform)
      .transition()
      .duration(ANN_EDITOR_ANIM_DUR)
      .call(zoomBehaviorRef.current!.transform, finalTransform);
  };

  const zoomAndPan = (
    currZoom: { x: number, y: number, k: number },
    newZoom: { x: number, y: number, k: number },
  ): void => {
    const currTransform = zoomIdentity
      .translate(currZoom.x, currZoom.y)
      .scale(currZoom.k);

    const finalTransform = zoomIdentity
      .translate(newZoom.x, newZoom.y)
      .scale(newZoom.k);

    select<SVGSVGElement, unknown>(svgRef.current!)
      .call(zoomBehaviorRef.current!.transform, currTransform)
      .transition()
      .duration(ANN_EDITOR_ANIM_DUR)
      .call(zoomBehaviorRef.current!.transform, finalTransform);
  };

  useEffect(() => {
    createJourneyModalRef.current = createJourneyModal;
  }, [createJourneyModal]);

  /**
   *
   * Show screen editor
   * and
   * Rendering changes to annotations
   *
   */
  useEffect(() => {
    // reset previously selected ann's selection marker
    const annNodes = selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node');
    resetAnnNodeSelectionStyle(annNodes);
    if (!selectedAnnId && annEditorModal) {
      closeScreenEditor();
      return;
    }

    if (!selectedAnnId) {
      renderDagreAutoLayoutTimeline(true);
      return;
    }

    renderDagreAutoLayoutTimeline(false);
    if (annEditorModal && annEditorModal!.timelineY !== Number.MAX_VALUE) {
      renderTimelineInSingleLine(annEditorModal.timelineY);
    } else {
      // the selected multi node's y
      const g = select(rootGRef.current!);

      const selectedMultiNode = g.selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('g.multi-node')
        .filter(d => !!d.data.anns.find(ann => ann.annotation.refId === selectedAnnId));
      if (selectedMultiNode.empty()) return;
      const selectedMultiNodeData = selectedMultiNode.datum();

      const timelineNodeY = selectedMultiNodeData.origStoredData!.y;
      renderTimelineInSingleLine(timelineNodeY);
      setAnnEditorModal(prev => ({ ...prev!, timelineY: timelineNodeY }));
    }

    showScreenEditorForSelectedAnn();
  }, [selectedAnnId, props.allAnnotationsForTour, showAnnText, multiNodeModalData, props.tourOpts]);

  const showScreenEditorForSelectedAnn = (): void => {
    // set selection marker
    const annNode = selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node')
      .filter((d) => d.annotation.refId === selectedAnnId);
    setAnnNodeSelectionStyle(annNode, Tags.TILE_STROKE_COLORON_SELECT);

    const selectedAnn = selectAll<SVGRectElement, AnnotationNode<dagre.Node>>('g.node')
      .filter(d => d.annotation.refId === selectedAnnId);
    if (selectedAnn.empty()) return;

    const annCoords = selectedAnn.datum().storedData!;

    if (annEditorModal) {
      const { x: zoomAfterAnnModalShownX } = annEditorModal.newSvgZoom;
      const startX = zoomAfterAnnModalShownX + annCoords.x * ANN_EDITOR_ZOOM;
      const endX = zoomAfterAnnModalShownX + annCoords.x * ANN_EDITOR_ZOOM + (annCoords.width * ANN_EDITOR_ZOOM);

      const isAnnNodeInViewPort = startX > 0 && endX * ANN_EDITOR_ZOOM < window.innerWidth * ANN_EDITOR_ZOOM;
      if (isAnnNodeInViewPort) {
        setAnnEditorModal(prev => ({
          ...prev!,
          annId: selectedAnnId,
          applyTransitionToArrow: true,
          prevAnnId: getPrevSelectedAnnIdForEditor(prev, selectedAnnId),
        }));
        setScreenEditorArrowLeft(getAnnModalArrowLeftPos(annCoords.x + annCoords.width / 2, zoomAfterAnnModalShownX));
        return;
      }
    }

    const [currK] = zoomPanState.getValueFromBuffer();

    const selectedMultiNode = selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('g.multi-node')
      .filter(d => !!d.data.anns.find(ann => ann.annotation.refId === selectedAnnId));
    if (selectedMultiNode.empty()) return;

    const selectedMultiNodeData = selectedMultiNode.datum();
    const nodeDim = selectedMultiNodeData.storedData!;
    const timelineY = nodeDim.y - ANN_NODE_HEIGHT / 2;
    const newY = (-timelineY * ANN_EDITOR_ZOOM) + ANN_NODE_TOP_MARGIN_FOR_EDITOR;

    const nodeX = nodeDim.x + nodeDim.width / 2;
    const newX = window.innerWidth / 2 - (nodeX * ANN_EDITOR_ZOOM);

    const translateXWithoutZoom = window.innerWidth / 2 - ((nodeDim.x + nodeDim.width / 2) * currK!);

    let firstSelectedAnnId: string;
    if (annEditorModal) {
      const newSvgZoom = annEditorModal.newSvgZoom;
      zoomAndPan(
        { x: newSvgZoom.x, y: newSvgZoom.y, k: newSvgZoom.k },
        { x: newX, y: newY, k: ANN_EDITOR_ZOOM }
      );
      firstSelectedAnnId = annEditorModal.firstSelectedAnnId;
    } else {
      panThenZoom(
        { x: translateXWithoutZoom, y: newY * currK!, k: currK! },
        { x: newX, y: newY, k: ANN_EDITOR_ZOOM }
      );
      setTimeout(() => {
        setShowSceenEditor(true);
      }, ANN_EDITOR_ANIM_DUR * 2);
      firstSelectedAnnId = selectedAnnId;
    }

    setAnnEditorModal(prev => ({
      annId: selectedAnnId,
      newSvgZoom: { x: newX, y: newY, k: ANN_EDITOR_ZOOM, centerX: nodeDim.x },
      applyTransitionToArrow: true,
      prevAnnId: getPrevSelectedAnnIdForEditor(prev, selectedAnnId),
      firstSelectedAnnId,
      timelineY: prev?.timelineY || Number.MAX_VALUE
    }));
    setScreenEditorArrowLeft(getAnnModalArrowLeftPos(annCoords.x + annCoords.width / 2, newX));
  };

  const closeScreenEditor = (): void => {
    if (!annEditorModal) return;

    const [k, x, y,] = zoomPanState.getValueFromBuffer();
    const centerX = annEditorModal.newSvgZoom.centerX;

    const translateXWithoutZoom = window.innerWidth / 2 - (centerX * k!);

    const newSvgZoom = annEditorModal.newSvgZoom;

    zoomThenPan(
      { x: newSvgZoom.x, y: newSvgZoom.y, k: newSvgZoom.k },
      { x: translateXWithoutZoom, y: annEditorModal.newSvgZoom.y * k!, k: k! },
      { x: x!, y: y!, k: k! }
    );
    setTimeout(() => {
      renderDagreAutoLayoutTimeline(true);
    }, ANN_EDITOR_ANIM_DUR * 2);
    setAnnEditorModal(null);
    setShowSceenEditor(false);
  };

  useEffect(() => {
    setSelectedAnnId(props.toAnnotationId);
  }, [props.toAnnotationId]);

  const resetSelectedAnn = (): void => {
    setSelectedAnnId('');
    props.navigateBackToTour();
    resetScreenModeAndElPathKey();
  };

  const selectAnn = (annQualificationUri: string): void => {
    props.navigate(annQualificationUri, 'annotation-hotspot');
    setNewAnnPos(null);
    setSelectedAnnId(annQualificationUri.split('/')[1]);
  };

  const getPrevSelectedAnnIdForEditor = (prevAnnEditorData: AnnEditorModal | null, selectedAnnRid: string): string => {
    if (!prevAnnEditorData) return '';

    if (prevAnnEditorData.annId === selectedAnnRid) return prevAnnEditorData.prevAnnId;

    return prevAnnEditorData.annId;
  };

  const handleReselectionOfPrevAnnWhenCurAnnIsDeleted = (deletedAnnRid: string): void => {
    if (deletedAnnRid !== selectedAnnId) return;
    if (!annEditorModal) return;

    if (!annEditorModal.prevAnnId) {
      resetSelectedAnn();
      return;
    }

    const prevAnn = getAnnotationByRefId(annEditorModal!.prevAnnId, props.allAnnotationsForTour);
    if (!prevAnn) {
      resetSelectedAnn();
    } else {
      selectAnn(`${prevAnn!.screenId}/${annEditorModal!.prevAnnId}`);
    }
  };

  const viewBox = `0 0 ${window.innerWidth} ${window.innerHeight}`;

  const isAnnSelected = selectedAnnId && annEditorModal;

  const showMultiNodeModal = multiNodeModalData.selectedMultiNode && annEditorModal;

  const getFirstAnnotations = () : IAnnotationConfigWithScreen[] => {
    if (firstAnnotations.length !== 0) {
      zoomAnnInView(firstAnnotations[0].refId);
      return firstAnnotations;
    }
    const firstScreens : IAnnotationConfigWithScreen[] = [];
    props.timeline.forEach((flow) => {
      firstScreens.push(flow[0]);
    });
    zoomAnnInView(firstScreens[0].refId);
    setFirstAnnotations(firstScreens);
    return firstScreens;
  };

  const zoomAnnInView = (annRefId: string) : void => {
    const annNodes = selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node');
    resetAnnNodeSelectionStyle(annNodes);

    const selectedMultiNodeData = selectAll<SVGRectElement, MultiAnnotationNode<dagre.Node>>('g.multi-node')
      .filter(d => !!d.data.anns.find(ann => ann.annotation.refId === annRefId));
    if (selectedMultiNodeData.size() === 0) return;
    const annCoords = selectedMultiNodeData.datum().storedData!;
    const timelineY = annCoords.y - annCoords.height / 2;
    const newY = ((-timelineY + MODULE_EDITOR_TOP_GAP) * ANN_EDITOR_ZOOM);

    const nodeX = annCoords.x - annCoords.width;
    const newX = -(nodeX * ANN_EDITOR_ZOOM) + CREATE_JOURNEY_MODAL_WIDTH;

    const [currK] = zoomPanState.get();
    const translateXWithoutZoom = CREATE_JOURNEY_MODAL_WIDTH - (nodeX * currK!);
    const translateYWithoutZoom = timelineY + MODULE_EDITOR_TOP_GAP * currK!;
    if (createJourneyModal) {
      const { x: zoomAfterAnnModalShownX, y: zoomAfterAnnModalShownY } = createJourneyModal.newSvgZoom;
      const startY = zoomAfterAnnModalShownY + annCoords.y * ANN_EDITOR_ZOOM - (annCoords.height * ANN_EDITOR_ZOOM) / 2;
      const endY = zoomAfterAnnModalShownY + annCoords.y * ANN_EDITOR_ZOOM + (annCoords.height * ANN_EDITOR_ZOOM) / 2;

      const startX = zoomAfterAnnModalShownX
      + (nodeX) * ANN_EDITOR_ZOOM - (annCoords.width * ANN_EDITOR_ZOOM) / 2;
      const isAnnNodeYInViewPort = startY > 0 && endY * ANN_EDITOR_ZOOM < window.innerHeight * ANN_EDITOR_ZOOM;
      const isAnnNodeXInViewPort = startX > window.innerWidth * ANN_EDITOR_ZOOM
        && startX * ANN_EDITOR_ZOOM < window.innerWidth * ANN_EDITOR_ZOOM;

      const annNode = selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node')
        .filter((d) => d.annotation.refId === annRefId);
      setAnnNodeSelectionStyle(annNode, Tags.TILE_STROKE_COLOR_ON_HOVER);
      if (isAnnNodeYInViewPort && isAnnNodeXInViewPort) {
        return;
      }
      const newSvgZoom = createJourneyModal.newSvgZoom;

      zoomAndPan(
        { x: newSvgZoom.x, y: newSvgZoom.y, k: newSvgZoom.k },
        { x: newX, y: newY, k: ANN_EDITOR_ZOOM }
      );
      setCreateJourneyModal({ newSvgZoom: { x: newX, y: newY, k: ANN_EDITOR_ZOOM, centerX: annCoords.x } });
      return;
    }

    panThenZoom(
      { x: translateXWithoutZoom, y: translateYWithoutZoom, k: currK! },
      { x: newX, y: newY, k: ANN_EDITOR_ZOOM }
    );
    setCreateJourneyModal({ newSvgZoom: { x: newX, y: newY, k: ANN_EDITOR_ZOOM, centerX: annCoords.x } });
    setTimeout(() => {
      setShowJourneyEditor(true);
    }, ANN_EDITOR_ANIM_DUR * 2);
  };

  const resetCreateJourneyZoom = () : void => {
    const annNodes = selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node');
    resetAnnNodeSelectionStyle(annNodes);

    const [k, x, y,] = zoomPanState.get();
    const centerX = createJourneyModal!.newSvgZoom.centerX;

    const translateXWithoutZoom = CREATE_JOURNEY_MODAL_WIDTH - (centerX * k!);

    const newSvgZoom = createJourneyModal!.newSvgZoom;
    // while closing
    zoomThenPan(
      { x: newSvgZoom.x, y: newSvgZoom.y, k: newSvgZoom.k },
      { x: translateXWithoutZoom, y: newSvgZoom.y * k!, k: k! },
      { x: x!, y: y!, k: k! }
    );
    setCreateJourneyModal(null);
  };

  const resetZoom = (): void => {
    const transform = zoomIdentity
      .translate(canvasGrid.initial.tx, canvasGrid.initial.ty)
      .scale(canvasGrid.initial.scale);

    select<SVGSVGElement, unknown>(svgRef.current!)
      .transition()
      .duration(ANN_EDITOR_ANIM_DUR)
      .call(zoomBehaviorRef.current!.transform, transform);
  };

  const restrictCanvasActions = () : boolean => Boolean(annEditorModalRef.current || createJourneyModalRef.current);

  const restrictMultiGroupAction = (data: AnnotationNode<dagre.Node>)
  : boolean => data.sameMultiAnnGroupAnnRids!.length !== 0
  && !expandedMultAnnZIds.current.includes(data.annotation.zId);

  const isAnnPartOfGroup = (): boolean => {
    const [screenId, annId] = nodeMenuModalData.annId.split('/');
    const currentAnn = getAnnotationByRefId(annId, props.allAnnotationsForTour)!;
    return expandedMultAnnZIds.current.includes(currentAnn.zId);
  };

  const getFormatedAnnText = (annText: string) : string => `${annText.substring(0, 80)}${annText.length > 0 && '...'}`;

  const getTourMDData = (): string => {
    let mdData = '';

    const { displayName: title, description } = props.tour;
    mdData += getTourIntroMDStr(title, description, props.manifestPath);

    const isJourney = props.journey.flows.length > 0;
    if (isJourney) {
      props.journey.flows.forEach(flow => {
        const { main, header1: flowTitle, header2: flowDescription } = flow;
        mdData += getJourneyIntroMDStr(flowTitle, flowDescription);
        const annsInOrder = getAnnotationsInOrder(main, props.allAnnotationsForTour);
        mdData += getAnnotationTextsMDStr(annsInOrder);
      });
    } else if (props.tourOpts.main) {
      const annsInOrder = getAnnotationsInOrder(props.tourOpts.main, props.allAnnotationsForTour);
      mdData += getAnnotationTextsMDStr(annsInOrder);
    }

    return mdData;
  };

  const downloadTourData = (): void => {
    const content = getTourMDData();
    const filename = `${getValidFileName(props.tour.displayName || '')}.md`;
    downloadFile(content, filename, 'text/markdown');
  };

  const updateConnectionFromPannel = (fromMain: string, toMain: string) : void => {
    updateConnection(
      props.allAnnotationsForTour,
      allAnnsLookupMap,
      fromMain,
      toMain,
      props.onTourDataChange,
      props.tourOpts
    );
  };

  const resetScreenModeAndElPathKey = (): void => {
    setScreenMode(ScreenMode.DESKTOP);
    props.updateElPathKey('id');
  };

  const getBackgroundColorForJourneyButton = (): string => {
    if (!props.journey.flows.length) {
      return 'transparent';
    }

    if (props.headerProps.tourMainValidity === TourMainValidity.Journey_Main_Not_Present) {
      return '#EE7C5A';
    }

    return '#EEEEEE';
  };

  return (
    <>
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header
            showOnboardingGuides
            userGuidesToShow={[
              'Exploring Fable’s canvas',
              'Editing the interactive demo that you have captured',
              'Sharing or embedding your interactive demo'
            ]}
            {...props.headerProps}
            publishTour={props.publishTour}
            canvasOptions={{
              resetZoom: () => {
                if (annEditorModal) return;
                resetZoom();
              },
              showAnnText,
              setShowAnnText,
              downloadTourData,
            }}
            clickedFrom="editor"
          />
        </GTags.HeaderCon>
        <GTags.BodyCon
          style={{
            height: '100%',
            background: '#fff',
            overflowY: 'hidden',
            position: 'relative',
          }}
        >
          <Tags.SVGCanvas
            id="fab-tour-canvas"
            viewBox={viewBox}
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <clipPath id="fit-rect">
                <rect
                  x={ANN_NODE_PADDING}
                  y={ANN_NODE_PADDING}
                  rx={ANN_NODE_BORDER_RADIUS}
                  ry={ANN_NODE_BORDER_RADIUS}
                  width={ANN_NODE_WIDTH - 2 * ANN_NODE_PADDING}
                  height={ANN_NODE_HEIGHT - 2 * ANN_NODE_PADDING}
                />
              </clipPath>
              <marker
                id="triangle-arrowhead"
                markerWidth="5"
                markerHeight="10"
                refX="5"
                refY="5"
                orient="auto"
              >
                <path d="M 0 0 5 5 0 10 Z" style={{ fill: CONNECTOR_COLOR_NON_HOVERED }} />
              </marker>
            </defs>
            <rect width="100%" height="100%" fill="#F5F5F5" />
            <rect id="pattern-fill" width="100%" height="100%" />
            <g id="fab-tour-canvas-main" ref={rootGRef} />
          </Tags.SVGCanvas>

          {
            !annEditorModal && (
              <Tags.CanvasMenuCon
                onClick={prevent}
                onMouseUp={prevent}
                onMouseDown={prevent}
              >
                <Tags.CanvasMenuItemCon id="new-screen-btn">
                  <Tooltip
                    title="Add a new screen to this demo"
                    overlayStyle={{ fontSize: '0.75rem' }}
                    placement="right"
                  >
                    <Button
                      onClick={() => {
                        props.shouldShowScreenPicker(newScreenPickerData);
                        traceEvent(AMPLITUDE_EVENTS.OPEN_SCREEN_PICKER, {}, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
                      }}
                      icon={<FileAddFilled style={CANVAS_MENU_ITEM_STYLE} />}
                      size="large"
                      type="text"
                      style={{
                        margin: 0,
                        borderRadius: '4px',
                      }}
                    />
                  </Tooltip>
                </Tags.CanvasMenuItemCon>

                <Tags.CanvasMenuItemCon id="loader-btn">
                  <Tooltip
                    title="Design your loader"
                    overlayStyle={{ fontSize: '0.75rem' }}
                    placement="right"
                  >
                    <Button
                      onClick={() => setShowLoaderEditor(true)}
                      icon={<HourglassFilled style={CANVAS_MENU_ITEM_STYLE} />}
                      size="large"
                      type="text"
                      style={{
                        margin: 0,
                        borderRadius: '4px',
                      }}
                    />
                  </Tooltip>
                </Tags.CanvasMenuItemCon>

                <Tags.CanvasMenuItemCon id="journey-btn">
                  <Tooltip
                    title={props.journey.flows.length === 0 ? 'Create a Module' : 'Edit module'}
                    overlayStyle={{ fontSize: '0.75rem' }}
                    placement="right"
                  >
                    <div style={{
                      background: getBackgroundColorForJourneyButton(),
                      borderRadius: '8px',
                    }}
                    >
                      <Button
                        onClick={() => getFirstAnnotations()}
                        icon={<ContainerFilled style={CANVAS_MENU_ITEM_STYLE} />}
                        size="large"
                        type="text"
                        style={{
                          margin: 0,
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </Tooltip>
                </Tags.CanvasMenuItemCon>

                <Tags.CanvasMenuItemCon>
                  <Tooltip
                    title="Mobile Responsiveness"
                    overlayStyle={{ fontSize: '0.75rem' }}
                    placement="right"
                  >
                    <div style={{
                      background: isTourResponsive(props.tour) ? '#EEEEEE' : 'transparent',
                      borderRadius: '8px'
                    }}
                    >
                      <Button
                        onClick={() => {
                          setShowMobileResponsivenessDrawer(true);
                          amplitudeOpenResponsivenessDrawer();
                        }}
                        icon={<MobileFilled style={CANVAS_MENU_ITEM_STYLE} />}
                        size="large"
                        type="text"
                        style={{
                          margin: 0,
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </Tooltip>
                </Tags.CanvasMenuItemCon>
                <Tags.CanvasMenuItemCon>
                  <Tooltip
                    title="Miscellaneous"
                    overlayStyle={{ fontSize: '0.75rem' }}
                    placement="right"
                  >
                    <div style={{
                      background: isTourResponsive(props.tour) ? '#EEEEEE' : 'transparent',
                      borderRadius: '8px'
                    }}
                    >
                      <Button
                        onClick={() => {
                          setShowAdditionalSettingsDrawer(true);
                        }}
                        icon={<SettingFilled style={CANVAS_MENU_ITEM_STYLE} />}
                        size="large"
                        type="text"
                        style={{
                          margin: 0,
                          borderRadius: '4px',
                        }}

                      />
                    </div>
                  </Tooltip>
                </Tags.CanvasMenuItemCon>
              </Tags.CanvasMenuCon>
            )
      }
          {
            showLoaderEditor && <LoaderEditor closeEditor={() => setShowLoaderEditor(false)} />
          }
          {isMenuModalVisible(connectorMenuModalData.position) && (
            <Tags.MenuModalMask onClick={() => {
              ctxData.current = null;
              setConnectorMenuModalData(initialConnectorModalData);
            }}
            >
              <Tags.MenuModal xy={connectorMenuModalData.position} onClick={prevent}>
                <div
                  className="menu-item danger"
                  onClick={() => {
                    confirm({
                      title: 'Are you sure you want to delete the connector?',
                      content: `This connector will get deleted and previous 
                  annotation and next annotation will get separated`,
                      okText: 'Delete',
                      okType: 'danger',
                      onOk() {
                        traceEvent(
                          AMPLITUDE_EVENTS.EDGE_CONNECTION_DELETED,
                          {},
                          [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
                        );
                        const [, fromAnnId] = connectorMenuModalData.fromAnnId.split('/');
                        const [, toAnnId] = connectorMenuModalData.toAnnId.split('/');
                        const result = deleteConnection(
                          fromAnnId,
                          toAnnId,
                          props.allAnnotationsForTour
                        );
                        props.applyAnnButtonLinkMutations(result);
                        setConnectorMenuModalData(initialConnectorModalData);
                      },
                      onCancel() { },
                    });
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <DisconnectOutlined style={{ marginTop: '2px' }} />
                    <div>
                      Delete this connector
                      <div className="subtext">This action will break the flow in two parts</div>
                    </div>
                  </div>
                </div>
              </Tags.MenuModal>
            </Tags.MenuModalMask>
          )}
          {isMenuModalVisible(nodeMenuModalData.position) && (
            <Tags.MenuModalMask onClick={() => {
              ctxData.current = null;
              setNodeMenuModalData(initialAnnNodeModalData);
            }}
            >
              <Tags.MenuModal xy={nodeMenuModalData.position} onClick={prevent}>
                <div
                  className="menu-item"
                  onClick={() => {
                    confirm({
                      title: 'Are you sure you want to delete this annotation?',
                      content: `This annotation will be deleted and the previous annotation 
                    will get connected to the next`,
                      okText: 'Delete',
                      okType: 'danger',
                      onOk() {
                        traceEvent(AMPLITUDE_EVENTS.ANNOTATION_DELETED, {
                          annotation_op_location: 'canvas'
                        }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
                        const [screenId, annId] = nodeMenuModalData.annId.split('/');

                        handleReselectionOfPrevAnnWhenCurAnnIsDeleted(annId);

                        const currentAnn = getAnnotationByRefId(annId, props.allAnnotationsForTour)!;
                        const main = props.tourOpts.main;
                        const result = deleteAnnotation(
                          props.timeline,
                          { ...currentAnn, screenId: +screenId },
                          props.allAnnotationsForTour,
                          main,
                          true
                        );

                        props.applyAnnButtonLinkMutations(result);
                        setNodeMenuModalData(initialAnnNodeModalData);
                      },
                      onCancel() { }
                    });
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <img
                      src={DeleteIcon}
                      width="24px"
                      height="24px"
                      alt="delete annotation"
                      style={{ width: '1.5rem' }}
                    />
                    <div>
                      Delete this annotation
                      <div className="subtext">Prev and next annotation will be connected</div>
                    </div>
                  </div>
                </div>
                {isAnnPartOfGroup() && (
                <div
                  className="menu-item"
                  onClick={() => {
                    confirm({
                      title: 'Are you sure you want to remove this annotation from group?',
                      content: 'This annotation will be removed from group',
                      okText: 'Remove',
                      okType: 'danger',
                      onOk() {
                        const [screenId, annId] = nodeMenuModalData.annId.split('/');

                        const currentAnn = getAnnotationByRefId(annId, props.allAnnotationsForTour)!;
                        removeAnnFromGroup(currentAnn, parseInt(screenId, 10));
                        setNodeMenuModalData(initialAnnNodeModalData);
                      },
                      onCancel() { }
                    });
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <img
                      src={CloseIcon}
                      width="24px"
                      height="24px"
                      alt="remove annotation"
                      style={{ width: '1.5rem' }}
                    />
                    <div>
                      Remove this annotation from group
                      <div className="subtext">This annotation won't be part of this group</div>
                    </div>
                  </div>
                </div>
                )}
                <div
                  className="menu-item"
                  onClick={() => {
                    confirm({
                      title: 'Are you sure you want to make this the demo thumbnail?',
                      content: 'The image of this screen will be now the demo thumbnail.',
                      okText: 'Save',
                      okType: 'primary',
                      onOk() {
                        const [screenId, annId] = nodeMenuModalData.annId.split('/');
                        const currentScreen = props.tour.screens!.find(srn => srn.id === +screenId);
                        props.updateTourProp(props.tour.rid, 'info', { ...props.tour.info, thumbnail: currentScreen!.thumbnail });
                        setNodeMenuModalData(initialAnnNodeModalData);
                      },
                      onCancel() { }
                    });
                  }}
                >
                  <div
                    style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}
                  >
                    <div style={{
                      fontSize: '1.2rem',
                      width: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'gray'
                    }}
                    >
                      <FileImageOutlined />
                    </div>
                    <div>
                      Make this demo thumbnail
                      <div className="subtext" />
                    </div>
                  </div>
                </div>
              </Tags.MenuModal>
            </Tags.MenuModalMask>
          )}
          {isMenuModalVisible(addScreenModalData.position) && addScreenModalData.screenAnnotation && (
          <Tags.MenuModalMask onClick={() => {
            setAddScreenModalData(initialAddScreenModal);
          }}
          >
            <Tags.MenuModal xy={addScreenModalData.position} onClick={prevent}>
              <NewAnnotationPopup
                position={addScreenModalData.annotationPosition === 'next'
                  ? DestinationAnnotationPosition.next : DestinationAnnotationPosition.prev}
                annotation={addScreenModalData.screenAnnotation}
                hidePopup={() => setAddScreenModalData(initialAddScreenModal)}
                updateOriginAnnPos={(position) => {
                  const annotation = addScreenModalData.screenAnnotation;
                  props.navigate(`${annotation!.screen.id}/${annotation!.refId}`, 'annotation-hotspot');
                  setNewAnnPos(position);
                }}
                shouldShowScreenPicker={props.shouldShowScreenPicker}
              />
            </Tags.MenuModal>
          </Tags.MenuModalMask>
          )}
          {
            props.shouldShowOnlyScreen && (
            <Tags.AnnEditorModalWrapper
              top={20}
            >
              <Tags.AnnEditorModal style={{ position: 'relative' }}>
                <Tags.CloseIcon
                  alt=""
                  src={CloseIcon}
                  role="button"
                  tabIndex={0}
                  onClick={resetSelectedAnn}
                  style={{ position: 'absolute', top: '4px', right: '12px', zIndex: '2', border: 'none' }}
                />
                {
                  props.isScreenLoaded && (
                  <ScreenEditor
                    allGlobalEdits={props.allGlobalEdits}
                    journey={props.journey}
                    // annotationSerialIdMap={props.annotationSerialIdMap}
                    key={props.screen!.rid}
                    screen={props.screen!}
                    tour={props.tour!}
                    screenData={props.screenData!}
                    allEdits={props.allEdits}
                    toAnnotationId={selectedAnnId}
                    subs={props.subs}
                    navigate={props.navigate}
                    setAlert={props.setAlert}
                    timeline={props.timeline}
                    allAnnotationsForScreen={props.allAnnotationsForScreen}
                    allAnnotationsForTour={props.allAnnotationsForTour}
                    tourDataOpts={props.tourOpts}
                    commitTx={props.commitTx}
                    onScreenEditStart={props.onScreenEditStart}
                    onScreenEditFinish={props.onScreenEditFinish}
                    onScreenEditChange={props.onScreenEditChange}
                    onGlobalEditChange={props.onGlobalEditChange}
                    onAnnotationCreateOrChange={props.onAnnotationCreateOrChange}
                    applyAnnButtonLinkMutations={props.applyAnnButtonLinkMutations}
                    isScreenLoaded={props.isScreenLoaded}
                    updateScreen={props.updateScreen}
                    newAnnPos={newAnnPos}
                    resetNewAnnPos={() => setNewAnnPos(null)}
                    onTourDataChange={props.onTourDataChange}
                    updateConnection={updateConnectionFromPannel}
                    shouldCreateNewFlow
                    screenMode={screenMode}
                    setScreenMode={setScreenMode}
                    elpathKey={props.elpathKey}
                    updateElPathKey={props.updateElPathKey}
                    updateTourProp={props.updateTourProp}
                    featurePlan={props.featurePlan}
                    // hideAnnForCapture={hideAnnForCapture}
                    globalOpts={props.globalOpts}
                  />
                  )
                }
              </Tags.AnnEditorModal>
            </Tags.AnnEditorModalWrapper>
            )
          }
          {
            isAnnSelected && (
            <Tags.AnnEditorModalCon>
              <Tags.AnnEditorModalArrow
                top={ANN_EDITOR_TOP - 12}
                left={screenEditorArrowLeft}
                applyTransition={annEditorModal.applyTransitionToArrow}
                width={`${15}px`}
                height={`${12}px`}
                viewBox="-50 0 100 80"
                style={{ verticalAlign: 'bottom' }}
              >
                <path
                  fill="#424242"
                  d="M-50 80 L-14 14 C-14 14, 0 1, 14 14 L14 14 L50 80 Z"
                />
              </Tags.AnnEditorModalArrow>
              <Tags.AnnEditorModalWrapper
                top={ANN_EDITOR_TOP}
                id={SCREEN_EDITOR_ID}
              >
                <Tags.AnnEditorModal style={{ position: 'relative' }}>
                  <Tags.CloseIcon
                    alt=""
                    src={CloseIcon}
                    role="button"
                    tabIndex={0}
                    onClick={resetSelectedAnn}
                    style={{ position: 'absolute', top: '4px', right: '12px', zIndex: '2', border: 'none' }}
                  />
                  {
                props.isScreenLoaded && showScreenEditor && (
                  <ScreenEditor
                    allGlobalEdits={props.allGlobalEdits}
                    journey={props.journey}
                    // annotationSerialIdMap={props.annotationSerialIdMap}
                    key={props.screen!.rid}
                    screen={props.screen!}
                    tour={props.tour!}
                    screenData={props.screenData!}
                    allEdits={props.allEdits}
                    subs={props.subs}
                    toAnnotationId={selectedAnnId}
                    navigate={props.navigate}
                    setAlert={props.setAlert}
                    timeline={props.timeline}
                    allAnnotationsForScreen={props.allAnnotationsForScreen}
                    allAnnotationsForTour={props.allAnnotationsForTour}
                    tourDataOpts={props.tourOpts}
                    commitTx={props.commitTx}
                    onScreenEditStart={props.onScreenEditStart}
                    onScreenEditFinish={props.onScreenEditFinish}
                    onScreenEditChange={props.onScreenEditChange}
                    onGlobalEditChange={props.onGlobalEditChange}
                    onAnnotationCreateOrChange={props.onAnnotationCreateOrChange}
                    applyAnnButtonLinkMutations={props.applyAnnButtonLinkMutations}
                    isScreenLoaded={props.isScreenLoaded}
                    onDeleteAnnotation={handleReselectionOfPrevAnnWhenCurAnnIsDeleted}
                    updateScreen={props.updateScreen}
                    newAnnPos={newAnnPos}
                    resetNewAnnPos={() => setNewAnnPos(null)}
                    onTourDataChange={props.onTourDataChange}
                    updateConnection={updateConnectionFromPannel}
                    shouldCreateNewFlow={false}
                    screenMode={screenMode}
                    setScreenMode={setScreenMode}
                    elpathKey={props.elpathKey}
                    updateElPathKey={props.updateElPathKey}
                    updateTourProp={props.updateTourProp}
                    featurePlan={props.featurePlan}
                    // hideAnnForCapture={hideAnnForCapture}
                    globalOpts={props.globalOpts}

                  />
                )
              }
                </Tags.AnnEditorModal>
              </Tags.AnnEditorModalWrapper>
            </Tags.AnnEditorModalCon>
            )
          }
          {
            showJourneyEditor && <CreateJourney
              closeEditor={() => { setShowJourneyEditor(false); resetCreateJourneyZoom(); setFirstAnnotations([]); }}
              firstAnnotations={firstAnnotations}
              getAnnInView={zoomAnnInView}
              onTourJourneyChange={props.onTourJourneyChange}
              tourOpts={props.tourOpts}
              journey={props.journey}
              featurePlan={props.featurePlan}
              allAnnotationsForTour={props.allAnnotationsForTour}
              globalOpts={props.globalOpts}
            />
          }
          {
            showMultiNodeModal && (
            <Tags.MultiNodeModalWrapper
              top={ANN_EDITOR_TOP}
              left={multiNodeModalData.leftCoord}
              width={MULTI_NODE_MODAL_WIDTH}
              maxHeight={multiNodeModalData.selectedMultiNode!.length > 2 ? '50vh'
                : `${(ANN_NODE_HEIGHT * ANN_EDITOR_ZOOM + 20) * 2 + 20}px`}
            >
              <Tags.MultiNodeModal>
                <Tags.MultiNodeModalClose>
                  <div
                    onClick={() => setMultiNodeModalData(initialMultiNodeModalData)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img
                      src={CloseIcon}
                      alt="close"
                      style={{ height: '14px' }}
                    />
                  </div>
                </Tags.MultiNodeModalClose>
                <div>
                  {multiNodeModalData.selectedMultiNode!.map(((ann, ind) => (
                    <Tags.AnnNode
                      key={ann.id}
                      height={ANN_NODE_HEIGHT * ANN_EDITOR_ZOOM}
                      width={ANN_NODE_WIDTH * ANN_EDITOR_ZOOM}
                      borderRadius={ANN_NODE_BORDER_RADIUS}
                      isSelected={ann.refId === selectedAnnId}
                      onClick={() => {
                        selectAnn(`${ann.screen.id}/${ann.refId}`);
                        setMultiNodeModalData(initialMultiNodeModalData);
                      }}
                      style={{ animationDelay: `${(ind + 1) * 0.1}s` }}
                    >
                      <img
                        src={ann.screen.thumbnailUri.href}
                        alt={ann.displayText}
                        style={{ width: '100%', height: '100%', borderRadius: ANN_NODE_BORDER_RADIUS }}
                      />
                      <div style={{ borderRadius: '10px 14px', position: 'absolute', bottom: 0, overflow: 'hidden' }}>
                        <Tags.StepNumberWrapper>
                          <Tags.AnnNodeStepNumber>{ann.stepNumber}</Tags.AnnNodeStepNumber>
                        </Tags.StepNumberWrapper>
                      </div>
                      {showAnnText && <Tags.AnnDisplayText>{getFormatedAnnText(ann.displayText)}</Tags.AnnDisplayText>}
                    </Tags.AnnNode>
                  )
                  ))}
                </div>
              </Tags.MultiNodeModal>
            </Tags.MultiNodeModalWrapper>
            )
          }
          {/* {
            annEditorModal && (
              <Tags.CaptureCon
                onClick={prevent}
                onMouseUp={prevent}
                onMouseDown={prevent}
              >
                <Tags.CanvasMenuItemCon id="new-screen-btn">
                  <Tooltip
                    title="Capture"
                    overlayStyle={{ fontSize: '0.75rem' }}
                    placement="right"
                  >
                    <Button
                      onClick={async () => {
                        const iframe = document.querySelectorAll('[id^="fab-reifi-"]');
                        if (iframe.length > 0) {
                          const rect = iframe[0].getBoundingClientRect();
                          if (rect) {
                            setHideAnnForCapture(true);
                            setTimeout(async () => {
                              const res = await captureScreenEditor(rect.x, rect.y, rect.width, rect.height);
                              res && setImg(res);
                              setHideAnnForCapture(false);
                            }, 1000);
                          }
                        }
                      }}
                      icon={<CameraOutlined style={CANVAS_MENU_ITEM_STYLE} />}
                      size="large"
                      type="text"
                      style={{
                        margin: 0,
                        borderRadius: '4px',
                      }}
                    />
                  </Tooltip>
                </Tags.CanvasMenuItemCon>
              </Tags.CaptureCon>
            )
          } */}
          {props.timeline.length && <SelectorComponent key={selectorComponentKey} userGuides={userGuides} />}
          {img && <img src={img} id="fable-srn-ed" alt="captured frame" style={{ zIndex: 9999, height: '20vh', width: '40vw' }} />}
          <ResponsiveStrategyDrawer
            showMobileResponsivenessDrawer={showMobileResponsivenessDrawer}
            setShowMobileResponsivenessDrawer={setShowMobileResponsivenessDrawer}
            selectedResponsivenessStrategy={selectedResponsivenessStrategy}
            setSelectedResponsivenessStrategy={setSelectedResponsivenessStrategy}
            tour={props.tour}
            updateResponsiveness={(responsiveness: Responsiveness) => {
              props.updateTourProp(props.tour.rid, 'responsive2', responsiveness);
              resetScreenModeAndElPathKey();
            }}
          />
          <FrameSettingsDrawer
            showFrameSettingsDrawer={showAdditionalSettingsDrawer}
            setShowFrameSettingsDrawer={setShowAdditionalSettingsDrawer}
            updateFrameSetting={(frameSetting : FrameSettings) => {
              props.updateTourProp(props.tour.rid, 'info', { ...props.tour.info, frameSettings: frameSetting });
            }}
            tour={props.tour}
          />
        </GTags.BodyCon>
      </GTags.ColCon>
    </>
  );
}
