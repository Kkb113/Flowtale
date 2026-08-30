import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input as AntInput, Progress, Spin } from 'antd';
import {
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationSelectionEffect,
  AnnotationSelectionEffectType,
  AnnotationSelectionShape,
  AnnotationSelectionShapeType,
  CmnEvtProp,
  IAnnotationConfig,
  IGlobalConfig,
  ITourDataOpts,
  LoadingStatus
} from '@fable/common/dist/types';
import { getSampleConfig } from '@fable/common/dist/utils';
import { LoadingOutlined } from '@ant-design/icons';
import { traceEvent } from '@fable/common/dist/amplitude';
import FileInput from '../file-input';
import Input from '../input';
import * as GTags from '../../common-styled';
import Button from '../button';
import { InputNumberBorderRadius, InputText, StyledSwitch } from '../screen-editor/styled';
import CaretOutlined from '../icons/caret-outlined';
import * as Tags from './styled';
import { updateAnnConfigForPreview, updateGlobalConfig, updateTourOptsForPreview } from './utils';
import { getWebFonts } from '../screen-editor/utils/get-web-fonts';
import CloseOutlined from '../icons/close-outlines';
import { ABtn } from '../annotation/styled';
import { generateCSSSelectorFromText } from '../screen-editor/utils/css-styles';
import { AnnotationContent } from '../annotation';
import { getThemeAnnotationOpts } from '../../container/create-tour/utils';
import { debounce, getColorContrast, isFeatureAvailable } from '../../utils';
import FocusBubble from '../annotation/focus-bubble';
import useUploadFileToAws from '../../hooks/useUploadFileToAws';
import { FeatureForPlan } from '../../plans';
import UpgradeIcon from '../upgrade/icon';
import UpgradeModal from '../upgrade/upgrade-modal';
import { P_RespSubscription } from '../../entity-processor';
import { FeatureAvailability } from '../../types';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { amplitudeGlobalStyleEdited, amplitudeUpgradeModalOpen } from '../../amplitude';
import Upgrade from '../upgrade';

interface Props {
  globalConfig: IGlobalConfig;
  updateGlobalConfig: (updatedGlobalConfig: IGlobalConfig) => void;
  republishAllPublishedDemos: () => Promise<void>;
  totalPublishedDemos: number;
  totalRepublishedDemos: number;
  republishingStatus: LoadingStatus;
  featurePlan: FeatureForPlan | null;
  subs: P_RespSubscription | null;
}

export default function Editor(props: Props): JSX.Element {
  const [gConfig, setGConfig] = useState(props.globalConfig);
  const [webFonts, setWebFonts] = useState<string[]>([]);
  const [sampleAnnConfig, setSampleAnnConfig] = useState<IAnnotationConfig>(() => getSampleConfig('$', '', gConfig));
  const [sampleTourOpts, setSampleTourOpts] = useState<ITourDataOpts>(() => getThemeAnnotationOpts(
    gConfig.annBodyBgColor,
    gConfig,
    gConfig.annBorderRadius,
  ));
  const [upgradeModalDetail, setUpgradeModalDetail] = useState({
    open: false,
    isInBeta: false
  });
  const isFirstRenderRef = useRef(true);
  const { uploadFile, loading: isCompanyLogoUploading } = useUploadFileToAws();

  const debouncedUpdateGlobalConfig = useCallback(
    debounce((gc) => props.updateGlobalConfig(gc), 2000),
    [props.updateGlobalConfig]
  );

  useEffect(() => {
    setSampleAnnConfig(updateAnnConfigForPreview(sampleAnnConfig, gConfig));
    setSampleTourOpts(updateTourOptsForPreview(sampleTourOpts, gConfig));

    if (!isFirstRenderRef.current) {
      debouncedUpdateGlobalConfig(gConfig);
    }

    isFirstRenderRef.current = false;
  }, [gConfig.monoIncKey]);

  useEffect(() => {
    const linkHref = `https://fonts.googleapis.com/css?family=${gConfig.fontFamily.replace(/\s+/g, '+')}`;

    const existingLinks = Array.from(document.head.querySelectorAll('link[gFont]')) as HTMLLinkElement[];
    const hasExistingLink = existingLinks.some((link) => link.href === linkHref);
    if (hasExistingLink) return;

    existingLinks.forEach((link) => {
      link.remove();
    });

    const link = document.createElement('link');
    link.href = linkHref;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.setAttribute('gFont', '');

    document.head.prepend(link);
  }, [gConfig.fontFamily]);

  const loadWebFonts = async (): Promise<void> => {
    const data = await getWebFonts();
    setWebFonts(data.items);
  };

  const handleCompanyLogoImgChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!e.target.files || e.target.files.length < 1) return;
    const selectedImage = e.target.files[0];
    const newImageUrl = await uploadFile(selectedImage);
    setGConfig(gc => updateGlobalConfig(gc, 'logo', newImageUrl));
    amplitudeGlobalStyleEdited('company_logo', newImageUrl, 'common');
  };

  const handleRepublishAllDemosClick = async (): Promise<void> => {
    await props.republishAllPublishedDemos();

    traceEvent(AMPLITUDE_EVENTS.REPUBLISH_ALL_DEMOS, {}, [CmnEvtProp.EMAIL]);
  };
  const watermarkFeatureAvailable = isFeatureAvailable(props.featurePlan, 'no_watermark');
  const customizeLoaderFeatureAvailable = isFeatureAvailable(props.featurePlan, 'custom_demo_loader');

  return (
    <div>

      {/* Info bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          justifyContent: 'space-between'
        }}
      >
        <div
          className="typ-sm"
        >
          If you make any changes to global styles, the changes will not be reflected to
          already published demo unless you republish the demos again.
        </div>

        {props.republishingStatus === LoadingStatus.InProgress ? (
          <>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            >
              <Progress
                size={25}
                strokeColor="gray"
                showInfo={false}
                type="circle"
                percent={Math.round((props.totalRepublishedDemos / props.totalPublishedDemos) * 100)}
              />
              <div className="nowrap typ-sm">{props.totalRepublishedDemos} / {props.totalPublishedDemos}</div>
            </div>
          </>
        ) : (
          <Button
            style={{
              minWidth: '250px',
              padding: '0.75rem 0.25rem'
            }}
            onClick={handleRepublishAllDemosClick}
          >
            Republish all published demos
          </Button>
        )}

      </div>

      {/* Common section */}
      <Tags.SecCon
        style={{
          marginTop: '1rem',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
        }}
      >

        {/* Common section header */}
        <Tags.CommonSecActionCon>
          <div
            className="typ-h2"
          >
            Common
          </div>
          <div
            className="typ-sm"
          >
            Common global styles that are used across demo components
          </div>
        </Tags.CommonSecActionCon>

        {/* Common section options */}
        <Tags.SectionOptionsCon
          style={{
            flexDirection: 'column',
          }}
        >
          <Tags.CommonSecOptionCon>
            <Tags.OptionTitle className="typ-reg">
              Company Logo
            </Tags.OptionTitle>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              <Tags.CommonSecActionCon
                style={{ minWidth: '500px' }}
              >
                <>
                  {customizeLoaderFeatureAvailable.isAvailable
                    ? (
                      <>
                        <FileInput
                          accept="image/png, image/jpeg, image/webp, image/svg+xml"
                          onChange={handleCompanyLogoImgChange}
                        />
                        <div
                          className="typ-sm"
                        >
                          Your logo will be used in pages where the demo is hosted
                        </div>
                      </>
                    )
                    : <Upgrade subs={props.subs} inline clickedFrom="global_edit" />}
                </>
              </Tags.CommonSecActionCon>
              {isCompanyLogoUploading ? (
                <div
                  style={{
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Spin />
                </div>) : <img
                  height={36}
                  alt=""
                  src={gConfig.logo}
                />}
            </div>
          </Tags.CommonSecOptionCon>

          <Tags.CommonSecOptionCon>
            <Tags.OptionTitle className="typ-reg">
              Company URL
            </Tags.OptionTitle>

            <Tags.CommonSecActionCon>
              <Input
                type="url"
                label=""
                defaultValue={gConfig.companyUrl}
                onBlur={e => {
                  setGConfig(gc => updateGlobalConfig(gc, 'companyUrl', e.target.value));
                  amplitudeGlobalStyleEdited('company_url', e.target.value, 'common');
                }}
              />
              <div
                className="typ-sm"
              >
                Company URL will be used to add a hreflink to the logo where the demo is hosted
              </div>
            </Tags.CommonSecActionCon>
          </Tags.CommonSecOptionCon>

          <Tags.CommonSecOptionCon>
            <Tags.OptionTitle className="typ-reg">
              Demo loading text
            </Tags.OptionTitle>

            <Tags.CommonSecActionCon>
              <Input
                defaultValue={gConfig.demoLoadingText}
                label=""
                onBlur={e => {
                  setGConfig(gc => updateGlobalConfig(gc, 'demoLoadingText', e.target.value));
                  amplitudeGlobalStyleEdited('demo_loading_text', e.target.value, 'common');
                }}
              />
              <div
                className="typ-sm"
              >
                This is demo loading text
              </div>
            </Tags.CommonSecActionCon>
          </Tags.CommonSecOptionCon>

          <Tags.CommonSecOptionCon>
            <Tags.OptionTitle className="typ-reg">
              Font Family
            </Tags.OptionTitle>

            <Tags.CommonSecActionCon>
              <GTags.FableSelect
                className="typ-ip"
                bordered={false}
                suffixIcon={<CaretOutlined dir="down" />}
                defaultValue={gConfig.fontFamily}
                placeholder="Select font"
                onClick={loadWebFonts}
                notFoundContent="No font found"
                showSearch
                allowClear={{ clearIcon: <CloseOutlined bgColor="white" /> }}
                options={webFonts.map(v => ({
                  value: v,
                  label: v,
                }))}
                onChange={(e) => {
                  let fontFamily = '';
                  if (e) {
                    fontFamily = e as string;
                  }
                  setGConfig(gc => updateGlobalConfig(gc, 'fontFamily', fontFamily));
                  amplitudeGlobalStyleEdited('font_family', fontFamily, 'common');
                }}
              />
              <div
                className="typ-sm"
              >
                If the font is unset, font will be inherited from your recorded page
              </div>
            </Tags.CommonSecActionCon>
          </Tags.CommonSecOptionCon>

          <div>
            <Tags.OptionTitle className="typ-reg">
              CTA Style
            </Tags.OptionTitle>
            <div
              className="typ-sm"
            >
              Configure styles for CTAs in annotation, modules, live page
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: '1rem'
              }}
            >
              <div
                style={{
                  flex: '1',
                  borderRight: '1px solid lightgray',
                  padding: '0 1rem'
                }}
              >
                <div>
                  <div>Button size</div>
                  <GTags.FableSelect
                    className="typ-ip"
                    size="small"
                    bordered={false}
                    suffixIcon={<CaretOutlined dir="down" />}
                    defaultValue={gConfig.ctaSize}
                    options={Object.values(AnnotationButtonSize).map(v => ({
                      value: v,
                      label: v,
                    }))}
                    onSelect={(val) => {
                      setGConfig(gc => updateGlobalConfig(gc, 'ctaSize', val as AnnotationButtonSize));
                      amplitudeGlobalStyleEdited('cta_btn_size', val as string, 'common');
                    }}
                  />
                </div>

                <div>
                  <div>Primary color</div>
                  <GTags.ColorPicker
                    className="typ-ip"
                    showText={(color) => color.toHexString()}
                    onChangeComplete={e => {
                      setGConfig(gc => updateGlobalConfig(gc, 'primaryColor', e.toHexString()));
                      amplitudeGlobalStyleEdited('cta_btn_color', e.toHexString(), 'common');
                    }}
                    defaultValue={gConfig.primaryColor}
                  />
                </div>
              </div>
              <Tags.BtnCon>
                <ABtn
                  bg={gConfig.annBodyBgColor}
                  className={`f-${generateCSSSelectorFromText('Next')}-btn f-ann-btn`}
                  noPad={false}
                  btnStyle={AnnotationButtonStyle.Primary}
                  color={gConfig.primaryColor}
                  size={gConfig.ctaSize}
                  fontFamily={gConfig.fontFamily}
                  btnLayout="default"
                  borderRadius={gConfig.annBorderRadius}
                >
                  Primary
                </ABtn>
                <div style={{
                  backgroundColor: `${getColorContrast(gConfig.annBodyBgColor) === 'light' ? '#fff' : '#424242'}`,
                  padding: '1rem',
                  borderRadius: '8px',
                }}
                >
                  <ABtn
                    bg={gConfig.annBodyBgColor}
                    className={`f-${generateCSSSelectorFromText('Next')}-btn f-ann-btn`}
                    noPad={false}
                    btnStyle={AnnotationButtonStyle.Outline}
                    color={gConfig.primaryColor}
                    size={gConfig.ctaSize}
                    fontFamily={gConfig.fontFamily}
                    btnLayout="default"
                    borderRadius={gConfig.annBorderRadius}
                  >
                    Outline
                  </ABtn>

                  <ABtn
                    bg={gConfig.annBodyBgColor}
                    className={`f-${generateCSSSelectorFromText('Next')}-btn f-ann-btn`}
                    noPad={false}
                    btnStyle={AnnotationButtonStyle.Link}
                    color={gConfig.primaryColor}
                    size={gConfig.ctaSize}
                    fontFamily={gConfig.fontFamily}
                    btnLayout="default"
                    borderRadius={gConfig.annBorderRadius}
                  >
                    Link
                  </ABtn>
                </div>
              </Tags.BtnCon>
            </div>
          </div>
        </Tags.SectionOptionsCon>
      </Tags.SecCon>

      {/* Common section */}
      <Tags.SecCon
        style={{
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
        }}
      >

        {/* Annotation style section header */}
        <Tags.CommonSecActionCon>
          <div
            className="typ-h2"
          >
            Annotation Style
          </div>
          <div
            className="typ-sm"
          >
            Style of annotation on the demo. You can override these styles from inside the demos.
          </div>
        </Tags.CommonSecActionCon>

        {/* Common section options */}
        <Tags.SectionOptionsCon>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Body Background Color
              </Tags.OptionTitle>

              <GTags.ColorPicker
                className="typ-ip"
                showText={(color) => color.toHexString()}
                onChangeComplete={e => {
                  const color = e.toHexString();
                  setGConfig(gc => updateGlobalConfig(gc, 'annBodyBgColor', color));
                  amplitudeGlobalStyleEdited('body_bg_color', color, 'annotation_style');
                }}
                defaultValue={gConfig.annBodyBgColor}
              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Body Border Color
              </Tags.OptionTitle>

              <GTags.ColorPicker
                className="typ-ip"
                showText={(color) => color.toHexString()}
                onChangeComplete={e => {
                  const color = e.toHexString();
                  setGConfig(gc => updateGlobalConfig(gc, 'annBorderColor', color));
                  amplitudeGlobalStyleEdited('body_border_color', color, 'annotation_style');
                }}
                defaultValue={gConfig.annBorderColor}
              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Font color
              </Tags.OptionTitle>

              <GTags.ColorPicker
                className="typ-ip"
                showText={(color) => color.toHexString()}
                onChangeComplete={e => {
                  const color = e.toHexString();
                  setGConfig(gc => updateGlobalConfig(gc, 'fontColor', color));
                  amplitudeGlobalStyleEdited('font_color', color, 'annotation_style');
                }}
                defaultValue={gConfig.fontColor}
              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Container Border Radius
              </Tags.OptionTitle>

              <InputNumberBorderRadius
                className="typ-ip"
                min={0}
                addonAfter="px"
                style={{
                  height: '40px',
                  width: '100%'
                }}
                defaultValue={gConfig.annBorderRadius}
                onChange={(e) => {
                  setGConfig(gc => updateGlobalConfig(gc, 'annBorderRadius', e as number));
                }}
                onBlur={(e) => {
                  amplitudeGlobalStyleEdited('container_border_radius', e.target.value, 'annotation_style');
                }}
              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Container Padding
              </Tags.OptionTitle>

              <InputText
                style={{
                  height: '40px',
                  width: '100%'
                }}
                className="typ-ip"
                bordered={false}
                placeholder="Enter padding"
                defaultValue={gConfig.annConPad}
                onChange={(e) => {
                  setGConfig(gc => updateGlobalConfig(gc, 'annConPad', e.target.value));
                }}
                onBlur={(e) => {
                  amplitudeGlobalStyleEdited('container_padding', e.target.value, 'annotation_style');
                }}
              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              {/* TODO show dummy selection to show sel col and sel eff */}
              <Tags.OptionTitle className="typ-reg">
                Selection Color
              </Tags.OptionTitle>

              <GTags.ColorPicker
                className="typ-ip"
                showText={(color) => color.toHexString()}
                defaultValue={gConfig.selColor}
                onChangeComplete={e => {
                  const color = e.toHexString();
                  setGConfig(gc => updateGlobalConfig(gc, 'selColor', color));
                  amplitudeGlobalStyleEdited('selection_color', color, 'annotation_style');
                }}
              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Selection Shape
              </Tags.OptionTitle>

              <GTags.FableSelect
                className="typ-ip"
                size="small"
                bordered={false}
                suffixIcon={<CaretOutlined dir="down" />}
                defaultValue={gConfig.selShape}
                options={AnnotationSelectionShape.map(v => ({
                  value: v,
                  label: v.charAt(0).toUpperCase() + v.slice(1),
                }))}
                onChange={(value) => {
                  setGConfig(gc => updateGlobalConfig(gc, 'selShape', value as AnnotationSelectionShapeType));
                  amplitudeGlobalStyleEdited('selection_shape', value as string, 'annotation_style');
                }}

              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Selection Effect
              </Tags.OptionTitle>

              <GTags.FableSelect
                className="typ-ip"
                size="small"
                bordered={false}
                suffixIcon={<CaretOutlined dir="down" />}
                title={gConfig.selShape === 'pulse' ? 'Mask type is set to `regular` for Pulse shaped box' : ''}
                defaultValue={gConfig.selEffect}
                options={AnnotationSelectionEffect.map(v => ({
                  value: v,
                  label: v.charAt(0).toUpperCase() + v.slice(1),
                }))}
                onChange={(value) => {
                  setGConfig(gc => updateGlobalConfig(gc, 'selEffect', value as AnnotationSelectionEffectType));
                  amplitudeGlobalStyleEdited('selection_effect', value as string, 'annotation_style');
                }}
              />
            </Tags.CommonSecActionCon>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}
            >
              <Tags.OptionTitle className="typ-reg">
                Show step progress
              </Tags.OptionTitle>

              <StyledSwitch
                size="small"
                defaultChecked={gConfig.showStepNo}
                onChange={(e) => {
                  setGConfig(gc => updateGlobalConfig(gc, 'showStepNo', e));
                  amplitudeGlobalStyleEdited('show_step_number', e as boolean, 'annotation_style');
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}

            >
              <Tags.OptionTitle
                className="typ-reg"
                onClick={() => {
                  if (!watermarkFeatureAvailable.isAvailable) {
                    setUpgradeModalDetail({ isInBeta: watermarkFeatureAvailable.isInBeta, open: true });
                    amplitudeUpgradeModalOpen('global_edit');
                  }
                }}
                style={{ display: 'flex', gap: '0.25rem' }}
              >
                <div>Show watermark</div>
                {!watermarkFeatureAvailable.isAvailable && (
                  <UpgradeIcon
                    isInBeta={watermarkFeatureAvailable.isInBeta}
                  />
                )}
              </Tags.OptionTitle>

              <StyledSwitch
                size="small"
                style={{ backgroundColor: gConfig.showWatermark ? '#7567FF' : '#BDBDBD' }}
                defaultChecked={gConfig.showWatermark}
                checked={gConfig.showWatermark}
                onChange={(e) => {
                  if (!watermarkFeatureAvailable.isAvailable) {
                    setUpgradeModalDetail({ isInBeta: watermarkFeatureAvailable.isInBeta, open: true });
                    amplitudeUpgradeModalOpen('global_edit');
                    return;
                  }
                  setGConfig(gc => updateGlobalConfig(gc, 'showWatermark', e));
                  amplitudeGlobalStyleEdited('show_watermark', e, 'annotation_style');
                }}
              />
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div
              style={{
                minHeight: '210px'
              }}
            >
              <Tags.AnnotationPreviewCon
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '1.5rem',
                  transform: 'scale(0.75)',
                  transformOrigin: 'top center',
                }}
                fontFamily={gConfig.fontFamily}
              >
                <AnnotationContent
                  config={sampleAnnConfig}
                  opts={sampleTourOpts}
                  isInDisplay
                  width={350}
                  dir="l"
                  tourId={0}
                  top={0}
                  left={0}
                  navigateToAdjacentAnn={() => {}}
                  isThemeAnnotation
                  isMediaAnn={false}
                />

                {gConfig.selShape === 'pulse' && <FocusBubble
                  diameter={18}
                  style={{
                    position: 'absolute',
                    bottom: -30,
                    left: '47%',
                  }}
                  selColor={gConfig.selColor}
                />}

                <svg
                  width="30px"
                  height="15px"
                  viewBox="-100 0 200 100"
                  style={{
                    transform: 'rotate(180deg) translateY(-100%)',
                    verticalAlign: 'top',
                    filter: 'none',
                    position: 'absolute',
                    bottom: 0,
                  }}
                >
                  <path
                    className="fab-arr-path"
                    fill={gConfig.annBorderColor}
                    d="M-100 100 L-14 14 C-14 14, 0 1, 14 14 L14 14 L100 100 Z"
                  />
                </svg>

                {gConfig.selShape === 'box' && <Tags.DummyElMask
                  shouldAnimate={gConfig.selEffect === 'blinking'}
                  selColor={gConfig.selColor}
                />}
              </Tags.AnnotationPreviewCon>
            </div>

            {/* Bottom Sec */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}
            >

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <Tags.OptionTitle className="typ-reg">
                    Next button
                  </Tags.OptionTitle>
                  <div
                    className="typ-sm"
                  >
                    This button is provided by Fable to navigate to next step
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '100%'
                    }}
                  >
                    <Tags.OptionTitle className="typ-reg">
                      Button Text
                    </Tags.OptionTitle>

                    <AntInput
                      className="typ-ip"
                      size="small"
                      bordered={false}
                      style={{
                        background: '#fff',
                        borderRadius: '8px',
                        height: '40px',
                        border: '1px solid #E8E8E8',
                      }}
                      placeholder="Button text"
                      defaultValue={gConfig.nextBtnText}
                      onChange={(e) => {
                        setGConfig(gc => updateGlobalConfig(gc, 'nextBtnText', e.target.value));
                      }}
                      onBlur={e => {
                        amplitudeGlobalStyleEdited('next_button_text', e.target.value, 'annotation_style');
                      }}
                    />
                  </div>

                  <div
                    style={{
                      width: '100%'
                    }}
                  >
                    <Tags.OptionTitle className="typ-reg">
                      Button Type
                    </Tags.OptionTitle>

                    <GTags.FableSelect
                      size="small"
                      bordered={false}
                      suffixIcon={<CaretOutlined dir="down" />}
                      defaultValue={gConfig.nextBtnStyle}
                      options={Object.values(AnnotationButtonStyle).map(v => ({
                        value: v,
                        label: v,
                      }))}
                      onSelect={(val) => {
                        setGConfig(gc => updateGlobalConfig(gc, 'nextBtnStyle', val as AnnotationButtonStyle));
                        amplitudeGlobalStyleEdited('next_button_type', val as string, 'annotation_style');
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <Tags.OptionTitle className="typ-reg">
                    Prev button
                  </Tags.OptionTitle>
                  <div
                    className="typ-sm"
                  >
                    This button is provided by Fable to navigate to prev step
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '100%'
                    }}
                  >
                    <Tags.OptionTitle className="typ-reg">
                      Button Text
                    </Tags.OptionTitle>

                    <AntInput
                      className="typ-ip"
                      size="small"
                      bordered={false}
                      style={{
                        background: '#fff',
                        borderRadius: '8px',
                        height: '40px',
                        border: '1px solid #E8E8E8',
                      }}
                      placeholder="Button text"
                      defaultValue={gConfig.prevBtnText}
                      onChange={(e) => {
                        setGConfig(gc => updateGlobalConfig(gc, 'prevBtnText', e.target.value));
                      }}
                      onBlur={e => {
                        amplitudeGlobalStyleEdited('prev_button_text', e.target.value, 'annotation_style');
                      }}
                    />
                  </div>

                  <div
                    style={{
                      width: '100%'
                    }}
                  >
                    <Tags.OptionTitle className="typ-reg">
                      Button Type
                    </Tags.OptionTitle>

                    <GTags.FableSelect
                      size="small"
                      bordered={false}
                      suffixIcon={<CaretOutlined dir="down" />}
                      defaultValue={gConfig.prevBtnStyle}
                      options={Object.values(AnnotationButtonStyle).map(v => ({
                        value: v,
                        label: v,
                      }))}
                      onSelect={(val) => {
                        setGConfig(gc => updateGlobalConfig(gc, 'prevBtnStyle', val as AnnotationButtonStyle));
                        amplitudeGlobalStyleEdited('prev_button_type', val as string, 'annotation_style');
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <Tags.OptionTitle className="typ-reg">
                    Default Custom CTA
                  </Tags.OptionTitle>
                  <div
                    className="typ-sm"
                  >
                    CTA at the end of the demo
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <div
                      style={{
                        width: '100%'
                      }}
                    >
                      <Tags.OptionTitle className="typ-reg">
                        Button Text
                      </Tags.OptionTitle>

                      <AntInput
                        className="typ-ip"
                        size="small"
                        bordered={false}
                        style={{
                          background: '#fff',
                          borderRadius: '8px',
                          height: '40px',
                          border: '1px solid #E8E8E8',
                        }}
                        placeholder="Button text"
                        defaultValue={gConfig.customBtn1Text}
                        onBlur={e => {
                          setGConfig(gc => updateGlobalConfig(gc, 'customBtn1Text', e.target.value));
                          amplitudeGlobalStyleEdited('custom_cta_text', e.target.value, 'annotation_style');
                        }}
                      />
                    </div>

                    <div
                      style={{
                        width: '100%'
                      }}
                    >
                      <Tags.OptionTitle className="typ-reg">
                        Button Type
                      </Tags.OptionTitle>

                      <GTags.FableSelect
                        size="small"
                        bordered={false}
                        suffixIcon={<CaretOutlined dir="down" />}
                        defaultValue={gConfig.customBtn1Style}
                        options={Object.values(AnnotationButtonStyle).map(v => ({
                          value: v,
                          label: v,
                        }))}
                        onSelect={(val) => {
                          setGConfig(gc => updateGlobalConfig(gc, 'customBtn1Style', val as AnnotationButtonStyle));
                          amplitudeGlobalStyleEdited('custom_cta_type', val as string, 'annotation_style');
                        }}
                      />
                    </div>
                  </div>

                  <Input
                    label="URL to open"
                    className="typ-ip"
                    defaultValue={gConfig.customBtn1URL}
                    onBlur={(e) => {
                      setGConfig(gc => updateGlobalConfig(gc, 'customBtn1URL', e.target.value));
                      amplitudeGlobalStyleEdited('custom_cta_url', e.target.value, 'annotation_style');
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Tags.SectionOptionsCon>
      </Tags.SecCon>
      <UpgradeModal
        showUpgradePlanModal={upgradeModalDetail.open}
        setShowUpgradePlanModal={(open: boolean) => {
          setUpgradeModalDetail((prevS) => ({
            isInBeta: prevS.isInBeta,
            open
          }));
        }}
        subs={props.subs}
        isInBeta={upgradeModalDetail.isInBeta}
      />
    </div>
  );
}
