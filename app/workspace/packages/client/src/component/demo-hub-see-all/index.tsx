import React, { useEffect, useRef, useState } from 'react';
import { createGlobalStyle } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { createLiteralProperty } from '@fable/common/dist/utils';
import { ThunderboltFilled } from '@ant-design/icons';
import { IDemoHubConfig } from '../../types';
import * as Tags from './styled';
import Header from './header';
import { isLeadFormPresent, validateInput } from '../annotation/utils';
import Button from '../button';
import * as GTags from '../../common-styled';
import { getAllDemoRidForSection, getorCreateDemoHubScriptEl, getOrCreateDemoHubStyleEl, objectToSearchParams } from '../../utils';
import EmbeddedDemoIframe from './embed-demo';
import Cta from '../demo-hub-editor/cta';

const LEAD_FORM_DATA = 'fable/demo-hub-lead-form';

interface Props {
  config: IDemoHubConfig;
  demoParams: Record<string, any>;
  demoHubRid: string;
}

const GlobalStyle = createGlobalStyle<{fontSize: number}>`
  html {
    font-size: ${props => (props.fontSize)}px;
  }
`;

const FABLE_FONT_ID = 'fable-font';

const scrollToSection = (): void => {
  if (window.location.hash) {
    const element = document.getElementById(window.location.hash.substring(1));
    if (element) {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth' });
      }, 10);
    }
  }
};

export const addFontToHeader = (doc: Document, fontFamily: string):void => {
  const linkHref = `https://fonts.googleapis.com/css?family=${fontFamily.replace(/\s+/g, '+')}`;
  const fableFontEl = doc.getElementById(FABLE_FONT_ID);
  if (!fableFontEl) {
    const link = doc.createElement('link');
    link.href = linkHref;
    link.rel = 'stylesheet';
    link.id = 'fable-font';
    link.type = 'text/css';
    doc.head.append(link);
  } else if ((fableFontEl as HTMLLinkElement).href !== linkHref) {
    (fableFontEl as HTMLLinkElement).href = linkHref;
  }
};

interface Params {
  key: string,
  value: string
}

const getLeadFormParams = (leadFormFilled: boolean): Record<string, string> => {
  const allLfParams: Record<string, string> = {};
  const newUrl = new URL(window.location.href);
  if (leadFormFilled) {
    allLfParams.skiplf = '1';
  }

  newUrl.searchParams.forEach((value, key) => {
    if (key !== 'show' && key !== 'lf') {
      allLfParams.key = value;
    }
  });

  return allLfParams;
};

function getLeadformDataFromLocalStore(): Record<string, string | undefined>[] {
  const data = localStorage.getItem(LEAD_FORM_DATA);
  return data ? JSON.parse(atob(data)) : [];
}

function DemoHubSeeAll(props: Props): JSX.Element {
  const navigate = useNavigate();
  const conRef = useRef<HTMLDivElement | null>(null);
  const rootSheet = useRef<HTMLStyleElement | null>(null);

  const location = window.location;
  const currentSlug = location.hash.slice(1);
  const searchParams = new URLSearchParams(location.search);
  const demoRid = searchParams.get('show');
  const leadFormFilled = searchParams.get('lf');

  const [allDemoParams, setAllDemoParams] = useState('');
  const [seeAllDemoRids, setSeeAllDemoRids] = useState(getAllDemoRidForSection(props.config.see_all_page.sections));
  const [currentDemoIndex, setCurrentDemoIndex] = useState(seeAllDemoRids.findIndex(demo => (
    demo.rid === demoRid && decodeURI(currentSlug) === demo.sectionSlug
  )));
  const [showCardButtonText, setShowCardButtonText] = useState('');

  const updateUrl = (addParams: Params[] | null, removeParam?: string | null, slug?: string): void => {
    const sparam = new URLSearchParams(location.search);

    if (addParams) {
      addParams.forEach((addParam) => {
        sparam.set(addParam.key, addParam.value);
      });
    }

    if (removeParam) {
      sparam.delete(removeParam);
    }

    const newSearch = sparam.toString();
    const newHash = slug ? `#${slug}` : location.hash;

    navigate({
      pathname: location.pathname,
      search: newSearch ? `?${newSearch}` : '',
      hash: newHash,
    });
  };

  useEffect(() => {
    setSeeAllDemoRids(getAllDemoRidForSection(props.config.see_all_page.sections));
  }, [props.config.see_all_page.sections]);

  useEffect(() => {
    setCurrentDemoIndex(
      seeAllDemoRids.findIndex(demo => (
        demo.rid === demoRid && decodeURI(currentSlug) === demo.sectionSlug
      ))
    );
  }, [demoRid, currentSlug, seeAllDemoRids]);

  useEffect(() => {
    if (!rootSheet.current) {
      rootSheet.current = document.createElement('style');
      document.head.appendChild(rootSheet.current);
    }
    rootSheet.current.innerHTML = `
      :root {
        --f-header-border-color: ${props.config.see_all_page.header.style.bgColor};
        --f-header-font-color: ${props.config.see_all_page.header.style.fontColor};
        --f-header-bg-color: ${props.config.see_all_page.header.style.bgColor};
        --f-body-bg-color: ${props.config.see_all_page.body.style.bgColor};
        --f-body-font-color: ${props.config.see_all_page.body.style.fontColor};
        --f-democard-bg-color: ${props.config.see_all_page.demoCardStyles.card.bgColor};
        --f-democard-border-color: ${props.config.see_all_page.demoCardStyles.card.borderColor};
        --f-democard-border-radius: ${props.config.see_all_page.demoCardStyles.card.borderRadius}px;
        --f-democard-font-color: ${props.config.see_all_page.demoCardStyles.card.fontColor};
        --f-demomodal-bg-color: ${props.config.see_all_page.demoModalStyles.body.bgColor};
        --f-demomodal-font-color: ${props.config.see_all_page.demoModalStyles.body.fontColor};
        --f-demomodal-border-color: ${props.config.see_all_page.demoModalStyles.body.borderColor};
        --f-demomodal-border-radius: ${props.config.see_all_page.demoModalStyles.body.borderRadius}px;
        --f-page-content-gutter: 5;
        --f-body-content-gutter: 3;
      }

      html, body, div, span, button, p, button, input {
        font-family: ${props.config.fontFamily._val ?? 'inherit'} !important;
      }

      button {
        font-weight: bold;
      }

      a.cta {
        font-weight: 600;
      }
  `;
  }, [props.config]);

  useEffect(() => {
    scrollToSection();
    addFontToHeader(document, props.config.fontFamily._val);
  }, [props.config.fontFamily._val]);

  useEffect(() => {
    getorCreateDemoHubScriptEl(props.config.customScripts);
  }, [props.config.customScripts]);

  useEffect(() => {
    getOrCreateDemoHubStyleEl(props.config.customStyles);
  }, [props.config.customStyles]);

  useEffect(() => {
    const paramsFromLeadForm = getLeadFormParams(Boolean(leadFormFilled));
    let demoParams = objectToSearchParams({ ...props.demoParams, ...paramsFromLeadForm });
    if (demoParams) {
      demoParams = `?${demoParams}`;
      setAllDemoParams(demoParams);
    }
  }, [props.demoParams, leadFormFilled]);

  useEffect(() => {
    if (!props.config.see_all_page.leadForm.showLeadForm || !props.config.see_all_page.leadForm.skipLeadForm) {
      // this is required because in editor if show leadform is updated we need to remove the leadform filled
      updateUrl(null, 'lf');
      return;
    }
    const data = getLeadformDataFromLocalStore();
    const leadFormData = data.find(demoHub => demoHub.rid === props.demoHubRid);
    if (leadFormData
      && props.config.see_all_page.leadForm.skipLeadForm) {
      // set leadform filled and all other leadform params
      const leadFormSrchParams = [];
      for (const key in leadFormData) {
        if (leadFormData[key]) {
          const param: Params = {
            key,
            value: leadFormData[key]!
          };
          leadFormSrchParams.push(param);
        }
      }
      updateUrl(leadFormSrchParams, 'rid');
    }
  }, [props.demoHubRid,
    props.config.see_all_page.leadForm.skipLeadForm,
    props.config.see_all_page.leadForm.showLeadForm
  ]);

  const processLeadForm = (): boolean => {
    if (conRef.current && isLeadFormPresent(conRef.current)) {
      const leadFormFields = conRef.current?.getElementsByClassName('LeadForm__optionContainer');

      let isValidForm = true;
      const leadForm: Record<string, string | undefined> = {};
      if (leadFormFields) {
        for (const field of Array.from(leadFormFields)) {
          const { isValid, fieldName, fieldValue } = validateInput(field as HTMLDivElement);
          if (!isValid) isValidForm = false;
          leadForm[fieldName] = fieldValue;
        }
      }

      if (!isValidForm) return false;
      const leadFormSrchParams = [{ key: 'lf', value: '1' }];
      for (const key in leadForm) {
        if (leadForm[key]) {
          const param: Params = {
            key,
            value: leadForm[key]!
          };
          leadFormSrchParams.push(param);
        }
      }
      const localStoreData = getLeadformDataFromLocalStore();
      const leadFormFilledData = [{ rid: props.demoHubRid, ...leadForm, lf: '1' }];
      const allData = [...localStoreData, ...leadFormFilledData];
      localStorage.setItem(LEAD_FORM_DATA, btoa(JSON.stringify(allData)));

      updateUrl(leadFormSrchParams);
    }

    return true;
  };

  const getDemoName = (rid: string): string => {
    try {
      return props.config.see_all_page.sections.filter(section => section.demos.some(demo => demo.rid === rid))[0].demos.filter(demo => demo.rid === rid)[0].name;
    } catch (e: any) {
      raiseDeferredError(e as Error);
      return '';
    }
  };

  return (
    <Tags.RootCon className="dh-page">
      <GlobalStyle fontSize={props.config.baseFontSize} />
      { props.config.see_all_page.leadForm.showLeadForm && leadFormFilled !== '1' && (
      <Tags.DemoModal
        title={currentSlug.replace(/-/g, ' ')}
        open={Boolean(props.config.see_all_page.leadForm.showLeadForm)}
        style={{
          maxWidth: '480px'
        }}
        footer={[
          <Button
            key="submit"
            onClick={() => {
              processLeadForm();
            }}
            borderRadius={props.config.see_all_page.leadForm.continueCTA.style.borderRadius}
            bgColor={props.config.see_all_page.leadForm.continueCTA.style.bgColor}
            color={props.config.see_all_page.leadForm.continueCTA.style.fontColor}
            style={{ flex: 1 }}
          >
            {props.config.see_all_page.leadForm.continueCTA.text}
          </Button>
        ]}
        closable={false}
        width="80vw"
        centered
        maskStyle={{
          background: props.config.see_all_page.demoModalStyles.overlay.bgColor,
          backdropFilter: 'blur(3px)'
        }}
      >
        <GTags.LeadFormEntryCon
          fontSizeNormal="1rem"
          fontSizeLarge="1.6rem"
          fontSizeHuge="2.1rem"
          fontColor={props.config.see_all_page.demoCardStyles.card.fontColor}
          bgColor={props.config.see_all_page.demoCardStyles.card.bgColor}
          scaleDownLeadForm
          borderRadius={props.config.see_all_page.demoModalStyles.body.borderRadius}
          ref={conRef}
        >
          <div dangerouslySetInnerHTML={{ __html: props.config.leadform.bodyContent }} />
        </GTags.LeadFormEntryCon>
      </Tags.DemoModal>
      )}
      <>
        <Header config={props.config} />
        {/* <div className="banner">
          <h1 className="typ-h1 title">{props.config.see_all_page.header.title}</h1>
          <h2 className="subtitle">{props.config.see_all_page.header.title}</h2>
        </div> */}
        <div className="body">
          {/* <Tags.BodyText
            bgColor={props.config.see_all_page.body.style.bgColor}
            fontColor={props.config.see_all_page.body.style.fontColor}
            className="body-text"
          > */}
          <p className="typ-reg desc">{props.config.see_all_page.body.text}</p>
          {/* </Tags.BodyText> */}
          <div className="section-con">
            {props.config.see_all_page.sections.map(section => (
              <Tags.Section
                key={section.id}
                id={section.slug}
                className="section"
              >
                <div
                  className="typ-h2 title"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${location.origin}/demo-hub-see-all#${section.slug}`
                    );
                  }}
                >
                  {section.title}
                </div>
                <p className="typ-reg section-desc">{section.desc}</p>
                <div className="demo-card-con">
                  {section.demos.map((demo) => (
                    <div
                      className="demo-card"
                      key={demo.rid}
                      onClick={() => {
                        updateUrl([
                          { key: 'show', value: demo.rid }
                        ], null, section.slug);
                      }}
                      onMouseEnter={() => {
                        setShowCardButtonText(section.id + demo.rid);
                      }}
                      onMouseLeave={() => {
                        setShowCardButtonText('');
                      }}
                    >
                      <div className="thumb-con">
                        <img
                          src={demo.thumbnail}
                          alt={demo.rid}
                          className="thumb"
                        />
                        <div className="thumb-overlay">
                          <Cta
                            cta={{
                              text: createLiteralProperty(showCardButtonText === section.id + demo.rid
                                ? props.config.see_all_page.demoCardStyles.cta.text : ''),
                              id: 'card-cta',
                              deletable: false,
                              link: createLiteralProperty(''),
                              type: createLiteralProperty('primary'),
                              style: {
                                borderRadius: props.config.see_all_page.demoCardStyles.cta.style.borderRadius,
                                fontColor: props.config.see_all_page.demoCardStyles.cta.style.fontColor,
                                bgColorProp:
                                 createLiteralProperty(props.config.see_all_page.demoCardStyles.cta.style.bgColor),
                              },
                              __definedBy: 'user',
                              __linkType: 'open_demo_modal',
                              icon: <ThunderboltFilled
                                style={{
                                  color: props.config.see_all_page.demoCardStyles.cta.style.fontColor,
                                  fontSize: '1rem'
                                }}
                              />,
                              iconPlacement: 'left',
                            }}
                            width="40"
                            className={showCardButtonText === section.id + demo.rid
                              ? 'card-cta card-cta-active' : 'card-cta'}
                          />
                        </div>
                      </div>
                      <span className="typ-h3 demo-name">{demo.name}</span>
                      <span className="typ-reg demo-description">{demo.desc}</span>
                    </div>
                  ))}
                </div>
              </Tags.Section>
            ))}
          </div>
        </div>
        {
        demoRid && (
          <EmbeddedDemoIframe
            demoRid={demoRid}
            onClose={() => {
              updateUrl(null, 'show', currentSlug);
            }}
            demoName={getDemoName(demoRid)}
            maskBg={props.config.see_all_page.demoModalStyles.overlay.bgColor}
            embedSrc={
              `${location.origin}/embed/demo/${demoRid}${allDemoParams}`
            }
            goToNext={() => {
              updateUrl([
                { key: 'show', value: seeAllDemoRids[currentDemoIndex + 1].rid }
              ], null, seeAllDemoRids[currentDemoIndex + 1].sectionSlug);
            }}
            showNextBtn={currentDemoIndex + 1 !== seeAllDemoRids.length}
          />
        )
      }
      </>

    </Tags.RootCon>
  );
}

export default DemoHubSeeAll;
