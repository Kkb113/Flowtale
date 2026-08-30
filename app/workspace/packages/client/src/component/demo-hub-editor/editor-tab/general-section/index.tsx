import { compileValue, createGlobalProperty, createLiteralProperty, GlobalPropsPath } from '@fable/common/dist/utils';
import { Spin, Tooltip } from 'antd';
import React from 'react';
import { QuestionCircleOutlined, QuestionOutlined } from '@ant-design/icons';
import useUploadFileToAws from '../../../../hooks/useUploadFileToAws';
import { IDemoHubConfig } from '../../../../types';
import FileInput from '../../../file-input';
import ActionPanel from '../../../screen-editor/action-panel';
import { InputText } from '../../../screen-editor/styled';
import { useEditorCtx } from '../../ctx';
import { OurLink } from '../../../../common-styled';
import { amplitudeDemoHubGeneralSectionEdited, amplitudeApplyGlobalStyles } from '../../../../amplitude';
import ApplyStylesMenu from '../../../screen-editor/apply-styles-menu';
import { isGlobalProperty } from '../../../../utils';

type GeneralProps = Pick<IDemoHubConfig, 'baseFontSize' | 'companyName' | 'fontFamily' | 'logo'>;

function GeneralSection(): JSX.Element {
  const { config, onConfigChange, globalConfig } = useEditorCtx();
  const { uploadFile, loading } = useUploadFileToAws();

  const updateGeneralProps = <K extends keyof GeneralProps>(
    key: K,
    value: GeneralProps[K]
  ): void => {
    onConfigChange(c => ({
      ...c,
      [key]: value
    }));
  };

  const handleCompanyLogoChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selectedImage = e.target.files![0];
    if (!selectedImage) return;

    const imageUrl = await uploadFile(selectedImage);

    updateGeneralProps('logo', createLiteralProperty(imageUrl));
    amplitudeDemoHubGeneralSectionEdited('company_logo', imageUrl);
  };

  const handleCompanyLogoChangeToGlobal = (): void => {
    updateGeneralProps('logo', createGlobalProperty(
      compileValue(globalConfig, GlobalPropsPath.logo),
      GlobalPropsPath.logo
    ));
  };

  return (
    <>
      <ActionPanel
        title="General"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            margin: '8px 0'
          }}
        >
          <p
            className="typ-sm"
            style={{
              padding: 0,
              margin: 0,
            }}
          >
            Configure settings that apply to all the pages of the demo hub
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div className="typ-sm">Company logo</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '260px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <FileInput
                  style={{ height: '34px' }}
                  onChange={handleCompanyLogoChange}
                  accept="image/png, image/gif, image/jpeg, image/webp, image/svg+xml"
                />
                <ApplyStylesMenu
                  isGlobal={isGlobalProperty(config.logo)}
                  onApplyGlobal={() => {
                    handleCompanyLogoChangeToGlobal();
                    amplitudeApplyGlobalStyles('demo_hub', 'company_logo', null, true);
                  }}
                />
              </div>

              {loading ? (
                <div
                  style={{
                    height: '44px'
                  }}
                >
                  <Spin />
                </div>
              ) : <img
                src={config.logo._val}
                alt=""
                height={44}
              />}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                flex: 1,
              }}
            >
              <div
                className="typ-sm"
                style={{
                  margin: '3px 0'
                }}
              >
                Base font size
              </div>
              <InputText
                type="number"
                value={config.baseFontSize}
                onChange={e => updateGeneralProps('baseFontSize', +e.target.value)}
                onBlur={e => amplitudeDemoHubGeneralSectionEdited('base_font_size', e.target.value)}
                style={{ height: '44px', width: '100%' }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                flex: 2,
              }}
            >
              <div>
                <span className="typ-sm">Font family</span>&nbsp;&nbsp;
                <Tooltip
                  title={
                    <>
                      <p className="typ-sm" style={{ margin: '0.5rem 0', opacity: 1, fontWeight: 500 }}>
                        You can add any font face that is available in&nbsp;
                        <OurLink
                          href="https://fonts.google.com/"
                          target="_blank"
                          style={{
                            display: 'inline-block',
                            color: 'white',
                            margin: '0'
                          }}
                        >google font
                        </OurLink>.
                      </p>
                      <p className="typ-sm" style={{ margin: '0.5rem 0', opacity: 1, fontWeight: 500 }}>
                        Simply copy the <em>Font face</em> here, we will take care of the rest.
                      </p>
                      <p className="typ-sm" style={{ margin: '0.5rem 0', opacity: 1, fontWeight: 500 }}>
                        Remember to copy Font faces with <em>&lt;space&gt;</em> not with <em>+</em>
                      </p>
                      <p className="typ-sm" style={{ margin: '0.5rem 0', opacity: 1, fontWeight: 500 }}>
                        Example of valid Font faces
                      </p>
                      <ul className="typ-sm" style={{ margin: '0.5rem 0', opacity: 1, fontWeight: 500 }}>
                        <li>Roboto</li>
                        <li>Noto Sans</li>
                      </ul>
                      <p className="typ-sm" style={{ margin: '0.5rem 0', opacity: 1, fontWeight: 500 }}>
                        Example of invalid Font faces
                      </p>
                      <ul className="typ-sm" style={{ margin: '0.5rem 0', opacity: 1, fontWeight: 500 }}>
                        <li>Roboto:ital,wght@0,100..900</li>
                        <li>Noto+Sans</li>
                      </ul>
                    </>
                }
                >
                  <QuestionCircleOutlined style={{ fontSize: '10px' }} />
                </Tooltip>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <InputText
                  value={config.fontFamily._val}
                  onChange={e => updateGeneralProps('fontFamily', createLiteralProperty(e.target.value))}
                  onBlur={e => amplitudeDemoHubGeneralSectionEdited('font_family', e.target.value)}
                  style={{ height: '44px', width: '100%' }}
                />
                <ApplyStylesMenu
                  isGlobal={isGlobalProperty(config.fontFamily)}
                  onApplyGlobal={() => {
                    updateGeneralProps(
                      'fontFamily',
                      createGlobalProperty(
                        compileValue(globalConfig, GlobalPropsPath.fontFamily),
                        GlobalPropsPath.fontFamily
                      )
                    );

                    amplitudeApplyGlobalStyles('demo_hub', 'font_family', null, true);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </ActionPanel>
    </>
  );
}

export default GeneralSection;
