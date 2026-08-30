import { IAnnotationButton, IAnnotationConfig, IGlobalConfig, ITourDataOpts, ITourEntityHotspot } from '@fable/common/dist/types';
import { nanoid } from 'nanoid';
import { getSampleConfig } from '@fable/common/dist/utils';
import { AnnotationPerScreen, DestinationAnnotationPosition, IAnnotationConfigWithScreen, Timeline } from '../../types';
import { IAnnotationConfigWithScreenId, updateAnnotationGrpId } from './annotation-config-utils';
import { AnnUpdate, AnnUpdateType, GroupUpdatesByAnnotationType } from './types';
import { doesBtnOpenALink, isNavigateHotspot, updateLocalTimelineGroupProp } from '../../utils';
import { AnnAdd } from '../../action/creator';

function getValidNavigateValueForActionType(btn: IAnnotationButton): string | null {
  return isNavigateHotspot(btn.hotspot)
    ? btn.hotspot!.actionValue._val
    : null;
}

export const addNextAnnotation = (
  newAnnConfig: IAnnotationConfigWithScreenId,
  selectedAnnId: string,
  allAnnotationsForTour: AnnotationPerScreen[],
  main: string | null,
): AnnUpdateType => {
  const updates: AnnUpdate[] = [];

  const selectedAnnConfig = getAnnotationByRefId(selectedAnnId, allAnnotationsForTour)!;
  if (doesBtnOpenALink(selectedAnnConfig, 'next')) {
    return {
      status: 'denied',
      deniedReason: 'The selected annotation will open a new url when next button is cliced, hence a new annotation can\'t be added. Deleting the url and try again.',
      main,
      groupedUpdates: {},
      updates: [],
      deletionUpdate: null
    };
  }

  const prevBtnOfNewAnn = getAnnotationBtn(newAnnConfig, 'prev');
  const nextBtnOfSelectedAnn = getAnnotationBtn(selectedAnnConfig, 'next');

  if (isNavigateHotspot(nextBtnOfSelectedAnn.hotspot) && nextBtnOfSelectedAnn.hotspot!.actionValue._val.split('/')[1] === newAnnConfig.refId) {
    return {
      status: 'denied',
      deniedReason: 'The selected annotation is already the next of the destination annotation. Nothing to do here.',
      main,
      groupedUpdates: {},
      updates: [],
      deletionUpdate: null
    };
  }

  const prevBtnOfNewAnnUpdate = {
    config: newAnnConfig,
    btnId: prevBtnOfNewAnn.id,
    screenId: newAnnConfig.screenId,
    actionValue: `${selectedAnnConfig.screenId}/${selectedAnnConfig.refId}`,
  };
  updates.push(prevBtnOfNewAnnUpdate);

  const nextBtnOfSelectedAnnUpdate = {
    config: selectedAnnConfig,
    btnId: nextBtnOfSelectedAnn.id,
    screenId: selectedAnnConfig.screenId,
    actionValue: `${newAnnConfig.screenId}/${newAnnConfig.refId}`,
  };
  updates.push(nextBtnOfSelectedAnnUpdate);

  if (isNavigateHotspot(nextBtnOfSelectedAnn.hotspot)) {
    const [nextScreenId, nextAnnRefId] = nextBtnOfSelectedAnn.hotspot!.actionValue._val.split('/');
    const oldNextAnnOfSelectedAnnConfig = getAnnotationByRefId(nextAnnRefId, allAnnotationsForTour)!;
    const prevBtnOfOldNextAnn = getAnnotationBtn(oldNextAnnOfSelectedAnnConfig, 'prev');
    const nextBtnOfNewAnn = getAnnotationBtn(newAnnConfig, 'next');

    const prevBtnOfOldNextAnnUpdate = {
      config: oldNextAnnOfSelectedAnnConfig,
      btnId: prevBtnOfOldNextAnn.id,
      screenId: +nextScreenId,
      actionValue: `${newAnnConfig.screenId}/${newAnnConfig.refId}`,
    };
    updates.push(prevBtnOfOldNextAnnUpdate);

    const nextBtnOfNewAnnUpdate = {
      config: newAnnConfig,
      btnId: nextBtnOfNewAnn.id,
      screenId: newAnnConfig.screenId,
      actionValue: nextBtnOfSelectedAnn.hotspot!.actionValue._val,
    };
    updates.push(nextBtnOfNewAnnUpdate);
  } else {
    const nextBtnOfNewAnn = getAnnotationBtn(newAnnConfig, 'next');
    const nextBtnOfNewAnnUpdate = {
      config: newAnnConfig,
      btnId: nextBtnOfNewAnn.id,
      screenId: newAnnConfig.screenId,
      actionValue: null,
    };
    updates.push(nextBtnOfNewAnnUpdate);
  }

  const groupedUpdates = groupUpdatesByAnnotation(updates);
  return { groupedUpdates, updates, main: null, deletionUpdate: null, status: 'accepted' };
};

export const addPrevAnnotation = (
  newAnnConfig: IAnnotationConfigWithScreenId,
  selectedAnnId: string,
  allAnnotationsForTour: AnnotationPerScreen[],
  main: string | null,
): AnnUpdateType => {
  let newMain = null;
  const updates: AnnUpdate[] = [];

  const selectedAnnConfig = getAnnotationByRefId(selectedAnnId, allAnnotationsForTour)!;
  const nextBtnOfNewAnn = getAnnotationBtn(newAnnConfig, 'next');
  const prevBtnOfSelectedAnn = getAnnotationBtn(selectedAnnConfig, 'prev');
  // TODO[clarify] why is this needed here. Looks like reordering code
  // let's say reorder function is calling this, shouldn't it be the job of reordering function
  if (isNavigateHotspot(prevBtnOfSelectedAnn.hotspot) && prevBtnOfSelectedAnn.hotspot!.actionValue._val.split('/')[1] === newAnnConfig.refId) {
    return {
      status: 'denied',
      deniedReason: 'The selected annotation is already the previous of the destination annotation, Nothing to do here.',
      main,
      groupedUpdates: {},
      updates: [],
      deletionUpdate: null
    };
  }
  const nextBtnOfNewAnnUpdate = {
    config: newAnnConfig,
    btnId: nextBtnOfNewAnn.id,
    screenId: newAnnConfig.screenId,
    actionValue: `${selectedAnnConfig.screenId}/${selectedAnnConfig.refId}`,
  };
  updates.push(nextBtnOfNewAnnUpdate);

  const prevBtnOfSelectedAnnUpdate = {
    config: selectedAnnConfig,
    btnId: prevBtnOfSelectedAnn.id,
    screenId: selectedAnnConfig.screenId,
    actionValue: `${newAnnConfig.screenId}/${newAnnConfig.refId}`,
  };
  updates.push(prevBtnOfSelectedAnnUpdate);

  if (isNavigateHotspot(prevBtnOfSelectedAnn.hotspot)) {
    const [prevScreenId, prevAnnRefId] = prevBtnOfSelectedAnn.hotspot!.actionValue._val.split('/');
    const oldPrevAnnOfSelectedAnnConfig = getAnnotationByRefId(prevAnnRefId, allAnnotationsForTour)!;
    const nextBtnOfOldPrevAnn = getAnnotationBtn(oldPrevAnnOfSelectedAnnConfig, 'next');
    const prevBtnOfNewAnn = getAnnotationBtn(newAnnConfig, 'prev');

    const nextBtnOfOldPrevAnnUpdate = {
      config: oldPrevAnnOfSelectedAnnConfig,
      btnId: nextBtnOfOldPrevAnn.id,
      screenId: +prevScreenId,
      actionValue: `${newAnnConfig.screenId}/${newAnnConfig.refId}`,
    };
    updates.push(nextBtnOfOldPrevAnnUpdate);

    const prevBtnOfNewAnnUpdate = {
      config: newAnnConfig,
      btnId: prevBtnOfNewAnn.id,
      screenId: newAnnConfig.screenId,
      actionValue: prevBtnOfSelectedAnn.hotspot!.actionValue._val,
    };
    updates.push(prevBtnOfNewAnnUpdate);
  } else {
    const prevBtnOfNewAnn = getAnnotationBtn(newAnnConfig, 'prev');
    const prevBtnOfNewAnnUpdate = {
      config: newAnnConfig,
      btnId: prevBtnOfNewAnn.id,
      screenId: newAnnConfig.screenId,
      actionValue: null,
    };
    updates.push(prevBtnOfNewAnnUpdate);
  }

  if (main && selectedAnnConfig.refId === main.split('/')[1]) {
    newMain = `${newAnnConfig.screenId}/${newAnnConfig.refId}`;
  }

  const groupedUpdates = groupUpdatesByAnnotation(updates);
  return { groupedUpdates, updates, main: newMain, deletionUpdate: null, status: 'accepted' };
};

export const getFirstAnnOfNewFlow = (
  timeline: Timeline,
  config: IAnnotationConfigWithScreenId,
): IAnnotationConfigWithScreen | undefined => {
  for (const flow of timeline) {
    if (flow[0].refId !== config.refId) {
      return flow[0];
    }
  }

  return undefined;
};

export const deleteAnnotation = (
  timeline: Timeline,
  annToBeDeletedConfig: IAnnotationConfigWithScreenId,
  allAnnotationsForTour: AnnotationPerScreen[],
  main: string | null,
  hardDelete: boolean
): AnnUpdateType => {
  const updates: AnnUpdate[] = [];
  let newMain = null;
  let deletionUpdate: AnnUpdate | null = null;

  const nextBtnOfCurrentAnn = getAnnotationBtn(annToBeDeletedConfig, 'next');
  const prevBtnOfCurrentAnn = getAnnotationBtn(annToBeDeletedConfig, 'prev');

  // a <- [b] <- c
  if (isNavigateHotspot(prevBtnOfCurrentAnn.hotspot)) {
    const [prevScreenId, prevAnnRefId] = prevBtnOfCurrentAnn.hotspot!.actionValue._val.split('/');
    const oldPrevAnnConfig = getAnnotationByRefId(prevAnnRefId, allAnnotationsForTour)!;
    const nextBtnOfOldPrevAnn = getAnnotationBtn(oldPrevAnnConfig, 'next');

    const nextBtnOfOldPrevAnnUpdate = {
      config: oldPrevAnnConfig,
      btnId: nextBtnOfOldPrevAnn.id,
      screenId: +prevScreenId,
      actionValue: getValidNavigateValueForActionType(nextBtnOfCurrentAnn)
    };
    updates.push(nextBtnOfOldPrevAnnUpdate);
  }

  // a -> [b] -> c
  if (isNavigateHotspot(nextBtnOfCurrentAnn.hotspot)) {
    const [nextScreenId, nextAnnRefId] = nextBtnOfCurrentAnn.hotspot!.actionValue._val.split('/');
    const oldNextAnnOfAnnConfig = getAnnotationByRefId(nextAnnRefId, allAnnotationsForTour)!;
    const prevBtnOfOldNextAnn = getAnnotationBtn(oldNextAnnOfAnnConfig, 'prev');

    const prevBtnOfOldNextAnnUpdate = {
      config: oldNextAnnOfAnnConfig,
      btnId: prevBtnOfOldNextAnn.id,
      screenId: +nextScreenId,
      actionValue: getValidNavigateValueForActionType(prevBtnOfCurrentAnn),
    };
    updates.push(prevBtnOfOldNextAnnUpdate);
  }

  if (hardDelete) {
    if (main && annToBeDeletedConfig.refId === main.split('/')[1]) {
      newMain = '';

      const nextBtnOfAnnToBeDeleted = annToBeDeletedConfig.buttons.find(btn => btn.type === 'next');
      const newAnn = getFirstAnnOfNewFlow(timeline, annToBeDeletedConfig);

      if (nextBtnOfAnnToBeDeleted && nextBtnOfAnnToBeDeleted.hotspot) {
        newMain = nextBtnOfAnnToBeDeleted.hotspot.actionValue._val;
      } else if (newAnn) {
        newMain = `${newAnn.screen.id}/${newAnn.refId}`;
      }
    }
    deletionUpdate = {
      config: annToBeDeletedConfig,
      btnId: '',
      screenId: annToBeDeletedConfig.screenId,
      actionValue: null,
    };
  }

  const groupedUpdates = groupUpdatesByAnnotation(updates);
  return { groupedUpdates, updates, main: newMain, deletionUpdate, status: 'accepted' };
};

export const deleteConnection = (
  fromAnnId: string,
  toId: string,
  allAnnotationsForTour: AnnotationPerScreen[],
): AnnUpdateType => {
  const updates: AnnUpdate[] = [];
  const fromAnnConfig = getAnnotationByRefId(fromAnnId, allAnnotationsForTour)!;
  const toAnnConfig = getAnnotationByRefId(toId, allAnnotationsForTour)!;

  const nextBtnOfFromAnn = getAnnotationBtn(fromAnnConfig, 'next');
  const prevBtnOfToAnn = getAnnotationBtn(toAnnConfig, 'prev');

  const nextBtnOfFromAnnUpdate = {
    config: fromAnnConfig,
    btnId: nextBtnOfFromAnn.id,
    screenId: fromAnnConfig.screenId,
    actionValue: null,
  };
  updates.push(nextBtnOfFromAnnUpdate);

  const prevBtnOfToAnnUpdate = {
    config: toAnnConfig,
    btnId: prevBtnOfToAnn.id,
    screenId: toAnnConfig.screenId,
    actionValue: null,
  };
  updates.push(prevBtnOfToAnnUpdate);

  const newGrpId = nanoid();
  updateLocalTimelineGroupProp(newGrpId, fromAnnConfig.grpId);
  const grpIdUpdates = updateGrpIdForTimelineTillEnd(toAnnConfig, allAnnotationsForTour, newGrpId);

  const groupedUpdates = groupUpdatesByAnnotation([...updates, ...grpIdUpdates]);
  return { groupedUpdates, updates, main: null, deletionUpdate: null, status: 'accepted' };
};

export const findFirstAnnOfFlowUsingAnn = (
  timeline: Timeline,
  currentAnnConfig: IAnnotationConfig,
  n: number
): IAnnotationConfigWithScreen | undefined => {
  for (const flow of timeline) {
    for (const ann of flow) {
      if (ann.refId === currentAnnConfig.refId) {
        return flow[n];
      }
    }
  }

  return undefined;
};

export const reorderAnnotation = (
  timeline: Timeline,
  currentAnnConfig: IAnnotationConfigWithScreenId,
  destinationAnnId: string,
  allAnnotationsForTour: AnnotationPerScreen[],
  main: string | null,
  position: DestinationAnnotationPosition,
): AnnUpdateType => {
  const destinationAnnotation = getAnnotationByRefId(destinationAnnId, allAnnotationsForTour)!;
  const nextBtnOfDestinationAnn = getAnnotationBtn(destinationAnnotation, 'next');

  if (doesBtnOpenALink(currentAnnConfig, 'next') && (position === DestinationAnnotationPosition.prev || nextBtnOfDestinationAnn.hotspot)) {
    // if current annotation has a link in next button it can only be placec at the very end
    return {
      status: 'denied',
      deniedReason: 'The selected annotation would open a url when next button is clicked, hence, it can\'t be reordered in between. Delete the url and try again.',
      main,
      groupedUpdates: {},
      updates: [],
      deletionUpdate: null
    };
  }
  if (destinationAnnotation.refId === currentAnnConfig.refId) {
    return {
      status: 'denied',
      deniedReason: 'The selected annotation is already a previous annotation, nothing to do',
      main,
      groupedUpdates: {},
      updates: [],
      deletionUpdate: null
    };
  }

  if (doesBtnOpenALink(destinationAnnotation, 'next') && position === DestinationAnnotationPosition.next) {
    return {
      status: 'denied',
      deniedReason: 'The destination annotation would open a link when next button is clicked, hence it can\'t be reordered. Delete the url and try again.',
      main,
      groupedUpdates: {},
      updates: [],
      deletionUpdate: null
    };
  }

  currentAnnConfig = updateAnnotationGrpId(currentAnnConfig, destinationAnnotation.grpId);
  let updates: AnnUpdate[] = [];
  let result: AnnUpdateType;
  if (position === DestinationAnnotationPosition.next) {
    result = addNextAnnotation(
      currentAnnConfig,
      destinationAnnId,
      allAnnotationsForTour,
      main
    );
    updates = [...result.updates];
  } else {
    result = addPrevAnnotation(
      currentAnnConfig,
      destinationAnnId,
      allAnnotationsForTour,
      main
    );
    updates = [...result.updates];
  }

  const {
    updates: deleteUpdates,
    main: afterDeleteMain
  } = deleteAnnotation(timeline, currentAnnConfig, allAnnotationsForTour, main, false);

  let newMain = '';
  if (main?.split('/')[1] === currentAnnConfig.refId) {
    const firstAnnOfFlow = findFirstAnnOfFlowUsingAnn(timeline, destinationAnnotation, 0);

    if (firstAnnOfFlow?.refId === currentAnnConfig.refId) {
      const secondAnnOfFlow = findFirstAnnOfFlowUsingAnn(timeline, destinationAnnotation, 1);
      if (secondAnnOfFlow) newMain = `${secondAnnOfFlow.screen.id}/${secondAnnOfFlow.refId}`;
    } else if (firstAnnOfFlow) {
      const prevBtn = getAnnotationBtn(destinationAnnotation, 'prev');
      if (position === DestinationAnnotationPosition.next) {
        newMain = `${firstAnnOfFlow.screen.id}/${firstAnnOfFlow.refId}`;
      } else if (prevBtn.hotspot?.actionType !== 'navigate') {
        newMain = main;
      } else {
        newMain = `${firstAnnOfFlow.screen.id}/${firstAnnOfFlow.refId}`;
      }
    }
  }

  const groupUpdates = groupUpdatesByAnnotation([...updates, ...deleteUpdates]);

  return {
    status: result.status,
    main: newMain || result.main || afterDeleteMain,
    groupedUpdates: groupUpdates,
    updates,
    deletionUpdate: null
  };
};

export const groupUpdatesByAnnotation = (updates: AnnUpdate[]): GroupUpdatesByAnnotationType => {
  const result: GroupUpdatesByAnnotationType = {};
  for (const update of updates) {
    const key = `${update.screenId}/${update.config.id}`;
    if (key in result) result[key].push(update);
    else result[key] = [update];
  }

  return result;
};

export const updateGrpIdForTimelineTillEnd = (
  annConfig: IAnnotationConfigWithScreenId,
  allAnnotationsForTour: AnnotationPerScreen[],
  grpId: string
): AnnUpdate[] => {
  const updates: AnnUpdate[] = [];
  let ptr = annConfig;
  while (true) {
    const updatedAnn = updateAnnotationGrpId(ptr, grpId);
    const nextAnnBtn = getAnnotationBtn(updatedAnn, 'next')!;
    // TODO why is actionValue required for groupid updates?
    updates.push({
      config: ptr,
      btnId: nextAnnBtn!.id,
      screenId: ptr.screenId,
      actionValue: getValidNavigateValueForActionType(nextAnnBtn),
      grpId
    });
    if (!isNavigateHotspot(nextAnnBtn.hotspot)) break;
    const [, nextAnnId] = nextAnnBtn.hotspot!.actionValue._val.split('/');
    ptr = getAnnotationByRefId(nextAnnId, allAnnotationsForTour)!;
  }
  return updates;
};

export const getAnnotationByRefId = (
  refId: string,
  allAnnotationsForTour: AnnotationPerScreen[]
): IAnnotationConfigWithScreenId | null => {
  for (const screenGroup of allAnnotationsForTour) {
    const screenId = screenGroup.screen.id;
    for (const annotation of screenGroup.annotations) {
      if (annotation.refId === refId) {
        return { ...annotation, screenId };
      }
    }
  }
  return null;
};

export const getAnnotationBtn = (
  config: IAnnotationConfig,
  type: 'prev' | 'next'
): IAnnotationButton => config.buttons.find(btn => btn.type === type)!;

export type AnnotationSerialIdMap = Record<string, {
  // in case module is present absIdx & absTotalAnns contains index and length of annotation wrt
  // start of the module
  // if module is not present absIdx == idx and absLen == len
  absIdx: number;
  absLen: number;
  idx: number;
  len: number;
}>
export const getAnnotationSerialIdMap = (
  main: string,
  allAnnotationsForTour: AnnotationPerScreen[],
  annotationSerialIdMap: AnnotationSerialIdMap,
  start: number,
): [AnnotationSerialIdMap, number] => {
  let refId = main.split('/')[1];
  const refs = [];
  let idx = 0;
  while (true) {
    const annotation = getAnnotationByRefId(refId, allAnnotationsForTour);
    if (!annotation) break; // sometime main would not point to proper annotation
    refs.push(refId);
    annotationSerialIdMap[refId] = {
      absIdx: idx + start,
      absLen: -1, // init here. to be adjusted at the end
      idx,
      len: -1 // init here. to be adjusted at the end
    };

    const nextBtn = getAnnotationBtn(annotation!, 'next');
    if (!isNavigateHotspot(nextBtn.hotspot)) break;
    idx += 1;
    refId = nextBtn.hotspot!.actionValue._val.split('/')[1];
  }

  for (const annRefId of Object.keys(annotationSerialIdMap)) {
    annotationSerialIdMap[annRefId].absLen = idx + start + 1;
  }

  // Only for current module (instance of map) update the local length
  for (const ref of refs) {
    annotationSerialIdMap[ref].len = idx + 1;
  }

  return [annotationSerialIdMap, idx + start + 1];
};

export const addNewAnn = (
  allAnnotationsForTour: AnnotationPerScreen[],
  annData: AnnAdd,
  tourDataOpts: ITourDataOpts,
  raiseAlertIfOpsDenied: (msg?: string) => void,
  applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void,
  globalOpts: IGlobalConfig,
  id?: string | null,
  clearRelayScreenAndAnnAdd?: () => void,
): IAnnotationConfig => {
  const newAnnConfig = getSampleConfig(id || '$', annData.grpId, globalOpts);
  const screenId = annData.screenId;
  let result;
  if (annData.position === DestinationAnnotationPosition.prev) {
    result = addPrevAnnotation(
      { ...newAnnConfig, screenId },
      annData.refId,
      allAnnotationsForTour,
      tourDataOpts.main,
    );
  } else {
    result = addNextAnnotation(
      { ...newAnnConfig, screenId },
      annData.refId,
      allAnnotationsForTour,
      null,
    );
  }

  if (result.status === 'denied') raiseAlertIfOpsDenied(result.deniedReason);
  else {
    applyAnnButtonLinkMutations(result);
    if (clearRelayScreenAndAnnAdd) {
      clearRelayScreenAndAnnAdd();
    }
  }

  return newAnnConfig;
};
