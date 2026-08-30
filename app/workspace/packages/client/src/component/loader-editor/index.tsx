import React, { RefObject, useEffect, useRef, useState } from 'react';
import { DeleteOutlined, LinkOutlined, ReloadOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { Tabs, Tooltip } from 'antd';
import { ITourLoaderData } from '@fable/common/dist/types';
import { GlobalPropsPath, createGlobalProperty, createLiteralProperty } from '@fable/common/dist/utils';
import * as Tags from './styled';
import Loader from './loader';
import FileInput from '../file-input';
import Input from '../input';
import { uploadImgFileObjectToAws } from '../../upload-media-to-aws';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import FableLogo from '../../assets/fable_logo_light_bg.png';
import CloseIcon from '../../assets/tour/close.svg';
import { FeatureForPlan } from '../../plans';
import { isFeatureAvailable, isGlobalProperty } from '../../utils';
import Upgrade from '../upgrade';
import ApplyStylesMenu from '../screen-editor/apply-styles-menu';
import { amplitudeApplyGlobalStyles } from '../../amplitude';

interface Props {
  data: ITourLoaderData,
  tour: P_RespTour,
  closeEditor: () => void,
  recordLoaderData: (tour: P_RespTour, loader: ITourLoaderData) => void,
  isAutoSaving: boolean;
  startAutosavingLoader: () => void;
  featureForPlan: FeatureForPlan | null;
  subs: P_RespSubscription | null;
}

const DEFAULT_LOGO_URL = 'https://s3.amazonaws.com/app.sharefable.com/favicon.png';
function LoaderEditor(props: Props): JSX.Element {
  const [loaderData, setLoaderData] = useState<ITourLoaderData>(props.data);
  const [isLogoUrlEmpty, setIsLogoUrlEmpty] = useState(false);
  const [isLogoUrlChanged, setIsLogoUrlChanged] = useState(false);
  const [inputHelpText, setInputHelpText] = useState(false);
  const [loaderText, setLoaderText] = useState(props.data.loadingText._val);
  const logoLinkIpRef = useRef<HTMLInputElement>();
  const initialLogoLink = useRef('');

  useEffect(() => {
    initialLogoLink.current = props.data.logo.url._val;
  }, []);

  useEffect(() => {
    if (JSON.stringify(props.data) !== JSON.stringify(loaderData)) {
      props.startAutosavingLoader();
      props.recordLoaderData(props.tour, loaderData);
    }
    if ((loaderData.logo.url._val !== initialLogoLink.current) && (loaderData.logo.url._val !== DEFAULT_LOGO_URL)) {
      setIsLogoUrlChanged(true);
    }
  }, [loaderData]);

  const setGifOrLottieFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'gif' | 'lottie'): Promise<void> => {
    if (e.target.files) {
      const file = e.target.files[0];
      if (file) {
        props.startAutosavingLoader();
        const fileUrl = await uploadImgFileObjectToAws(e.target.files[0]);
        if (!fileUrl) return;
        setLoaderData(prev => ({ ...prev, loader: { url: fileUrl.cdnUrl, type } }));
      }
    }
  };

  useEffect(() => {
    setLoaderText(props.data.loadingText._val);
  }, [props.data.loadingText]);

  const customizeLoaderFeatureAvailable = isFeatureAvailable(props.featureForPlan, 'custom_demo_loader');
  return (
    <Tags.FullScreenCon applyTransform>
      <Tags.EditorWrapper>
        <Tags.Header>
          <Tags.FableLogo alt="" src={FableLogo} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'end',
              padding: '0 0.5rem 0.25rem 0',
              animation: props.isAutoSaving ? 'blink 2s linear infinite' : 'none',
              visibility: props.isAutoSaving ? 'visible' : 'hidden'
            }}
            >
              <SaveOutlined style={{ color: '#8A8A8A', fontSize: '1.45rem' }} />
            </div>
            <Tags.CloseIcon alt="" src={CloseIcon} onClick={props.closeEditor} />
          </div>
        </Tags.Header>
        <Tags.HeaderTitle className="typ-h1">Design your loader </Tags.HeaderTitle>
        <Tags.EditorCon>
          <Tags.PreviewPanel>
            <Tags.PreviewCon>
              <Loader data={loaderData} />
            </Tags.PreviewCon>
          </Tags.PreviewPanel>
          <Tags.EditPanel>
            <>
              <Tags.FieldCon>
                <Tags.FieldName className="typ-h2">
                  <p>Logo</p>
                </Tags.FieldName>
                <div
                  className={customizeLoaderFeatureAvailable.isAvailable ? '' : 'upgrade-plan'}
                >
                  {!customizeLoaderFeatureAvailable.isAvailable && (
                    <Upgrade
                      subs={props.subs}
                      isInBeta={customizeLoaderFeatureAvailable.isInBeta}
                      clickedFrom="loader_edit"
                    />
                  )}
                  <Tabs items={[
                    {
                      key: '1',
                      label: <div className="typ-reg"><UploadOutlined />Upload</div>,
                      children: (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Tags.FileInputCon style={{ width: '100%' }}>
                            <FileInput
                              style={{ width: '100%' }}
                              accept="image/png, image/jpeg, image/webp, image/svg+xml, image/gif"
                              onChange={async (e) => {
                                if (e.target.files) {
                                  const file = e.target.files[0];
                                  if (file) {
                                    props.startAutosavingLoader();
                                    const fileUrl = await uploadImgFileObjectToAws(e.target.files[0]);
                                    if (!fileUrl) return;
                                    setLoaderData(prev => ({ ...prev, logo: { url: createLiteralProperty(fileUrl.cdnUrl) } }));
                                    if (logoLinkIpRef.current) logoLinkIpRef.current.value = fileUrl.cdnUrl;
                                    setIsLogoUrlEmpty(false);
                                  }
                                }
                              }}
                            />
                            {isLogoUrlChanged && (
                            <div>
                              <Tooltip title="Revert logo" placement="left">
                                <ReloadOutlined
                                  style={{ fontSize: '1.2rem' }}
                                  onClick={() => {
                                    setIsLogoUrlChanged(false);
                                    setLoaderData(prev => (
                                      { ...prev,
                                        logo: {
                                          url: createLiteralProperty(DEFAULT_LOGO_URL)
                                        }
                                      }
                                    ));
                                  }}
                                />
                              </Tooltip>
                            </div>
                            )}
                          </Tags.FileInputCon>

                        </div>
                      ),
                    },
                    {
                      key: '2',
                      label: <div className="typ-reg"><LinkOutlined />Link</div>,
                      children: (
                        <div className="ver-center" style={{ marginTop: '0.45rem' }}>
                          <Input
                            containerStyle={{ width: '100%' }}
                            label="Logo link"
                            value={loaderData.logo.url._val}
                            innerRef={logoLinkIpRef as unknown as RefObject<HTMLInputElement>}
                            onChange={async (e) => {
                              setIsLogoUrlEmpty(false);
                              if (!e.target.value || !e.target.value.trim()) {
                                setIsLogoUrlEmpty(true);
                                return;
                              }
                              setLoaderData(prev => (
                                {
                                  ...prev,
                                  logo: { url: createLiteralProperty(e.target.value) }
                                }));
                            }}
                          />
                          <ApplyStylesMenu
                            isGlobal={isGlobalProperty(loaderData.logo.url)}
                            onApplyGlobal={() => {
                              amplitudeApplyGlobalStyles(
                                'loader',
                                'company_logo'
                              );
                              setLoaderData(prev => (
                                {
                                  ...prev,
                                  logo: { url: createGlobalProperty(loaderData.logo.url._val, GlobalPropsPath.logo) }
                                }));
                            }}
                          />
                        </div>
                      ),
                    },
                  ]}
                  />
                  {isLogoUrlEmpty && <Tags.Error className="typ-reg">Logo is required</Tags.Error>}
                </div>
              </Tags.FieldCon>
              <Tags.FieldCon>
                <Tags.FieldName className="typ-h2">
                  <p>Upload Gif or Lottie</p>
                </Tags.FieldName>
                <div
                  className={customizeLoaderFeatureAvailable.isAvailable ? '' : 'upgrade-plan'}
                >
                  {!customizeLoaderFeatureAvailable.isAvailable && (
                    <Upgrade
                      subs={props.subs}
                      isInBeta={customizeLoaderFeatureAvailable.isInBeta}
                      clickedFrom="loader_edit"
                    />
                  )}
                  <Tabs items={[
                    {
                      key: '1',
                      label: <div className="typ-reg">Gif</div>,
                      children: (

                        <Tags.FileInputCon style={{ width: '100%' }}>
                          <FileInput
                            style={{ width: '100%' }}
                            accept="image/gif"
                            label="Upload Gif:"
                            onChange={(e) => setGifOrLottieFile(e, 'gif')}
                          />
                          {loaderData.loader.url && (
                            <div>
                              <Tooltip title={`Delete ${loaderData.loader.type} loader`} placement="left">
                                <DeleteOutlined
                                  style={{ fontSize: '1.2rem' }}
                                  onClick={() => setLoaderData(prev => ({ ...prev, loader: { url: '', type: '' } }))}
                                />
                              </Tooltip>
                            </div>
                          )}
                        </Tags.FileInputCon>

                      ),
                    },
                    {
                      key: '2',
                      label: <div className="typ-reg">Lottie file</div>,
                      children: (

                        <Tags.FileInputCon style={{ width: '100%' }}>
                          <FileInput
                            style={{ width: '100%' }}
                            accept="application/json"
                            label="Upload Lottie:"
                            onChange={(e) => setGifOrLottieFile(e, 'lottie')}
                          />
                          {loaderData.loader.url && (
                            <div>
                              <Tooltip title={`Delete ${loaderData.loader.type} loader`} placement="left">
                                <DeleteOutlined
                                  style={{ fontSize: '1.2rem' }}
                                  onClick={() => setLoaderData(prev => ({ ...prev, loader: { url: '', type: '' } }))}
                                />
                              </Tooltip>
                            </div>
                          )}
                        </Tags.FileInputCon>
                      ),
                    },
                  ]}
                  />
                </div>
              </Tags.FieldCon>
              <Tags.FieldCon>
                <Tags.FieldName className="typ-h2">
                  <p>Loading text</p>
                </Tags.FieldName>
                <div className="ver-center">
                  <div style={{ width: '100%' }}>
                    <Input
                      containerStyle={{ width: '100%' }}
                      label="Loading text"
                      value={loaderText}
                      onFocus={(e) => {
                        setInputHelpText(true);
                      }}
                      onChange={(e) => setLoaderText(e.target.value as string)}
                      onBlur={(e) => {
                        setInputHelpText(false);
                        setLoaderData(prev => ({ ...prev, loadingText: createLiteralProperty(loaderText) }));
                      }}
                    />
                    {inputHelpText && (
                    <div
                      className="typ-sm"
                      style={{
                        margin: '0.5rem',
                        opacity: '0.6'
                      }}
                    >Click outside to preview changed text
                    </div>
                    )}
                  </div>
                  <div>
                    <ApplyStylesMenu
                      isGlobal={isGlobalProperty(loaderData.loadingText)}
                      onApplyGlobal={() => {
                        amplitudeApplyGlobalStyles(
                          'loader',
                          'demo_loading_text',
                        );
                        setLoaderData(prev => ({
                          ...prev,
                          loadingText: createGlobalProperty(
                            loaderText,
                            GlobalPropsPath.demoLoadingText
                          )
                        }));
                      }}
                    />
                  </div>
                </div>
              </Tags.FieldCon>
            </>
          </Tags.EditPanel>
        </Tags.EditorCon>

      </Tags.EditorWrapper>
    </Tags.FullScreenCon>
  );
}

export default LoaderEditor;
