import { IAnnotationConfig, IChronoUpdatable, IGlobalConfig, ITourDataOpts } from '@fable/common/dist/types';
import { createLiteralProperty, getCurrentUtcUnixTime } from '@fable/common/dist/utils';

function newGlobalConfigFrom<T extends IChronoUpdatable>(c: T): T {
  const newConfig = { ...c };
  newConfig.monoIncKey++;
  newConfig.updatedAt = getCurrentUtcUnixTime();
  return newConfig;
}

export const updateGlobalConfig = (
  globalConfig: IGlobalConfig,
  key: keyof IGlobalConfig,
  value: IGlobalConfig[keyof IGlobalConfig]
): IGlobalConfig => {
  const newGlobalConfig = newGlobalConfigFrom(globalConfig);
  (newGlobalConfig as any)[key] = value;
  return newGlobalConfig;
};

export const updateAnnConfigForPreview = (
  sampleConfig: IAnnotationConfig,
  globalStyleConfig: IGlobalConfig
): IAnnotationConfig => {
  const updatedConfig = { ...sampleConfig };

  updatedConfig.refId = 'refId';

  updatedConfig.selectionEffect = createLiteralProperty(globalStyleConfig.selEffect);
  updatedConfig.annotationSelectionColor = createLiteralProperty(globalStyleConfig.selColor);
  updatedConfig.selectionShape = createLiteralProperty(globalStyleConfig.selShape);

  const nextBtn = updatedConfig.buttons.find(b => b.type === 'next')!;
  const prevBtn = updatedConfig.buttons.find(b => b.type === 'prev')!;

  nextBtn.text = createLiteralProperty(globalStyleConfig.nextBtnText);
  nextBtn.style = createLiteralProperty(globalStyleConfig.nextBtnStyle);
  nextBtn.size = createLiteralProperty(globalStyleConfig.ctaSize);

  prevBtn.text = createLiteralProperty(globalStyleConfig.prevBtnText);
  prevBtn.style = createLiteralProperty(globalStyleConfig.prevBtnStyle);
  prevBtn.size = createLiteralProperty(globalStyleConfig.ctaSize);

  updatedConfig.buttons = [nextBtn, prevBtn];

  return updatedConfig;
};

export const updateTourOptsForPreview = (
  sampleOpts: ITourDataOpts,
  globalStyleConfig: IGlobalConfig,
): ITourDataOpts => {
  const updatedOpts = { ...sampleOpts };

  updatedOpts.primaryColor = createLiteralProperty(globalStyleConfig.primaryColor);
  updatedOpts.annotationBodyBackgroundColor = createLiteralProperty(globalStyleConfig.annBodyBgColor);
  updatedOpts.annotationBodyBorderColor = createLiteralProperty(globalStyleConfig.annBorderColor);
  updatedOpts.annotationFontFamily = createLiteralProperty(globalStyleConfig.fontFamily);
  updatedOpts.annotationFontColor = createLiteralProperty(globalStyleConfig.fontColor);
  updatedOpts.borderRadius = createLiteralProperty(globalStyleConfig.annBorderRadius);
  updatedOpts.showFableWatermark = createLiteralProperty(globalStyleConfig.showWatermark);
  updatedOpts.annotationPadding = createLiteralProperty(globalStyleConfig.annConPad);
  updatedOpts.showStepNum = createLiteralProperty(globalStyleConfig.showStepNo);

  return updatedOpts;
};

// todo[keynames]
type GlobalConfig = Pick<IAnnotationConfig & ITourDataOpts, 'selectionShape' | 'borderRadius'>
