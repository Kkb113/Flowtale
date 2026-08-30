import raiseDeferredError from '@fable/common/dist/deferred-error';
import { RefForMMV } from '@fable/common/dist/llm-contract';
import { TourData, IGlobalConfig, IAnnotationConfig, IAnnotationOriginConfig, TourScreenEntity } from '@fable/common/dist/types';
import { getSampleConfig, deepcopy, getSampleJourneyData, createLiteralProperty } from '@fable/common/dist/utils';
import { nanoid } from 'nanoid';
import { SAMPLE_AI_ANN_CONFIG_TEXT } from '../constants';
import { createDemoUsingAI, getDemoMetaData, getAllDemoAnnotationText, postProcessAIText } from '../container/create-tour/utils';
import { P_RespSubscription } from '../entity-processor';
import { AnnotationPerScreen, DemoState } from '../types';
import { extractTextFromHTMLString, createAnnotationHotspot } from '../utils';
import { IAnnotationConfigWithScreenId } from '../component/annotation/annotation-config-utils';

interface RefForMMVAI extends RefForMMV {
    annRefId: string;
}

interface AnnWithScreenId {
    screenId: number;
    ann: IAnnotationConfig;
}

export const extractMarkedImageArray = (annInOrder: IAnnotationConfigWithScreenId[]): RefForMMVAI[] => {
  const markedImageArr : RefForMMVAI[] = [];
  try {
    let id = 0;
    annInOrder.forEach(ann => {
      if (ann.markedImage) {
        markedImageArr.push({
          id,
          annRefId: ann.refId,
          url: ann.markedImage,
        });
        id++;
      }
    });
    return markedImageArr;
  } catch (err) {
    raiseDeferredError(err as Error);
    return markedImageArr;
  }
};

const callAndProcessLLMData = async (
  anonymousDemoId: string,
  productDetails: string,
  demoObjective: string,
  subs: P_RespSubscription | null,
  markedImageArr: RefForMMVAI[],
  allAnnotationsForTour: AnnotationPerScreen[],
  globalOpts: IGlobalConfig,
): Promise<AnnWithScreenId[]> => {
  // base ai data
  const baseAiData = await createDemoUsingAI(
    anonymousDemoId,
    productDetails,
    demoObjective
  );

  if (!baseAiData) {
    throw new Error('Failed to get base data');
  }

  // demo metadata
  const llmMetadata = await getDemoMetaData(
    anonymousDemoId,
    productDetails,
    demoObjective,
    markedImageArr,
    baseAiData.categoryOfDemo,
    subs
  );

  // handle skip
  const newImageWithMarkUrls = markedImageArr.filter(obj => !llmMetadata.screenCleanup.includes(obj.id));

  // demo text
  const annTextData = await getAllDemoAnnotationText(
    anonymousDemoId,
    newImageWithMarkUrls,
    productDetails,
    demoObjective,
    baseAiData,
    (progress) => {},
    llmMetadata.metaData
  );
  annTextData.items = annTextData.items.filter(item => !item.skip);

  if (annTextData.items.length === 0) {
    throw new Error('No content found to updated annotation.');
  }

  // post process - intro, outro, modules
  const demoState: DemoState[] = annTextData.items.map(item => ({
    id: item.screenId,
    text: item.text,
    nextButtonText: item.nextButtonText
  }));
  const processedTextData = await postProcessAIText(
    anonymousDemoId,
    productDetails,
    demoObjective,
    JSON.stringify(demoState),
    false,
    baseAiData.moduleRequirement
  );

  const updatedDemoContent = processedTextData?.updateCurrentDemoStateContent || [];
  const updatedDemoContentMap = new Map(
    updatedDemoContent.map(item => [item.id, item])
  );

  // Only way to map response data and annotation is using id, so we create id map using markedImageArr
  // Using this we need to update annotation data so we create refIdTextMap.
  // We then update screen annotations based on refIdTextMap.
  const markedImgMap = new Map(
    markedImageArr.map(item => [item.id, item])
  );

  const refIdTextMap = new Map<string, {richText: string, nextBtnText: string}>();

  annTextData.items.forEach((data) => {
    const markedImageData = markedImgMap.get(data.screenId);
    if (markedImageData) {
      refIdTextMap.set(markedImageData.annRefId, {
        richText: updatedDemoContentMap.get(data.screenId)?.richText || data.richText || SAMPLE_AI_ANN_CONFIG_TEXT,
        nextBtnText: updatedDemoContentMap.get(data.screenId)?.nextButtonText || data.nextButtonText || 'Next',
      });
    }
  });

  const grpId = nanoid();
  const annArr: AnnWithScreenId[] = [];
  allAnnotationsForTour.forEach(screen => {
    screen.annotations.forEach((ann => {
      const newDetails = refIdTextMap.get(ann.refId);
      if (newDetails) {
        const newAnn = { ...ann };
        newAnn.bodyContent = newDetails.richText;
        newAnn.displayText = extractTextFromHTMLString(newDetails.richText);
        newAnn.grpId = grpId;
        const nextBtn = newAnn.buttons.filter(btn => btn.type === 'next')[0];
        nextBtn.text = createLiteralProperty(newDetails.nextBtnText);

        // reset voiceover, audio, video, multi-ann, leadform
        newAnn.voiceover = null;
        newAnn.videoUrl = '';
        newAnn.videoUrlHls = '';
        newAnn.videoUrlMp4 = '';
        newAnn.videoUrlWebm = '';
        newAnn.audio = null;
        newAnn.zId = newAnn.refId;
        newAnn.isLeadFormPresent = false;

        annArr.push({
          screenId: screen.screen.id,
          ann: newAnn
        });
      }
    }));
  });

  if (annArr.length === 0) throw new Error('No annotation found to updated content.');

  // add intro and outro ann to first and last annArr
  if (processedTextData) {
    const introAnn = getSampleConfig(
      '$',
      grpId,
      globalOpts,
      extractTextFromHTMLString(processedTextData.demo_intro_guide.richText),
      processedTextData.demo_intro_guide.nextButtonText,
      processedTextData.demo_intro_guide.richText,
      true
    );

    annArr.unshift({
      screenId: annArr[0].screenId,
      ann: introAnn
    });

    const outroAnn = getSampleConfig(
      '$',
      grpId,
      globalOpts,
      extractTextFromHTMLString(processedTextData.demo_outro_guide.richText),
      processedTextData.demo_outro_guide.nextButtonText,
      processedTextData.demo_outro_guide.richText,
      true
    );
    annArr.push({
      screenId: annArr[annArr.length - 1].screenId,
      ann: outroAnn
    });
  }

  return annArr;
};

export const getUpdatedDemoDataUsingAI = async (
  anonymousDemoId: string,
  productDetails: string,
  demoObjective: string,
  subs: P_RespSubscription | null,
  markedImageArr: RefForMMVAI[],
  tourData: TourData,
  allAnnotationsForTour: AnnotationPerScreen[],
  globalOpts: IGlobalConfig
): Promise<TourData> => {
  const annArr = await callAndProcessLLMData(
    anonymousDemoId,
    productDetails,
    demoObjective,
    subs,
    markedImageArr,
    allAnnotationsForTour,
    globalOpts
  );

  // update button to link all annotations & add to screenIdAnnMap
  const screenIdAnnMap = new Map<number, Record<string, IAnnotationOriginConfig>>();
  annArr.forEach((item, index) => {
    const annotation = item.ann;
    const nextBtn = annotation.buttons.filter(btn => btn.type === 'next')[0];
    const prevBtn = annotation.buttons.filter(btn => btn.type === 'prev')[0];

    if (index === 0) {
      prevBtn.hotspot = null;
      prevBtn.exclude = true;
    } else {
      const prevItem = annArr[index - 1];
      const prevAnn = prevItem.ann;
      prevBtn.hotspot = createAnnotationHotspot(prevItem.screenId, prevAnn.refId);
      prevBtn.exclude = false;
    }

    if (index === annArr.length - 1) {
      nextBtn.hotspot = null;
    } else {
      const nextItem = annArr[index + 1];
      const nextAnn = nextItem.ann;
      nextBtn.hotspot = createAnnotationHotspot(nextItem.screenId, nextAnn.refId);
    }

    const existingAnnotations = screenIdAnnMap.get(item.screenId) || {};
    screenIdAnnMap.set(item.screenId, { ...existingAnnotations, [annotation.id]: annotation });
  });

  // update demo data
  const updatedTourData = deepcopy(tourData);
  for (const entity of Object.values(updatedTourData.entities)) {
    if (entity.type === 'screen') {
      const screenEntity = entity as TourScreenEntity;
      const updatedAnnotations = screenIdAnnMap.get(parseInt(screenEntity.ref, 10));
      screenEntity.annotations = { ...screenEntity.annotations, ...updatedAnnotations };
      for (const [anId, ann] of Object.entries(screenEntity.annotations)) {
        if (!updatedAnnotations || !updatedAnnotations[anId]) {
          (screenEntity.annotations as any)[anId] = null;
        }
      }
    }
  }

  // reset main & journey
  updatedTourData.opts.main = `${annArr[0].screenId}/${annArr[0].ann.refId}`;
  updatedTourData.journey = getSampleJourneyData(globalOpts);
  return updatedTourData;
};
