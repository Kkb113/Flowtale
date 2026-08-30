import React from 'react';
import { connect } from 'react-redux';
import { AnnotationButtonSize,
  JourneyData, CreateJourneyPositioning, ITourDataOpts, JourneyFlow,
  IGlobalConfig } from '@fable/common/dist/types';
import { Button as AntdButton, Select, Tooltip, Divider } from 'antd';
import { DeleteFilled, DeleteOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import { GlobalPropsPath, createGlobalProperty, createLiteralProperty, getSampleJourneyData } from '@fable/common/dist/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import CloseIcon from '../../assets/tour/close.svg';
import Input from '../../component/input';
import { IAnnotationConfigWithScreen, JourneyOrOptsDataChange, AnnotationPerScreen } from '../../types';
import { Tx } from '../tour-editor/chunk-sync-manager';
import CreateJourneyEmptyIcon from '../../assets/create-journey-empty.svg';
import Focus from '../../assets/icons/focus.svg';
import { getValidUrl, isFeatureAvailable, isGlobalProperty } from '../../utils';
import Button from '../../component/button';
import { FeatureForPlan } from '../../plans';
import Upgrade from '../../component/upgrade';
import { P_RespSubscription } from '../../entity-processor';
import { getAnnotationByRefId } from '../../component/annotation/ops';
import ApplyStylesMenu from '../../component/screen-editor/apply-styles-menu';
import { amplitudeApplyGlobalStyles } from '../../amplitude';

interface IDispatchProps {
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
});

interface IAppStateProps {
  subs: P_RespSubscription | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  subs: state.default.subs,
});

interface IOwnProps {
    closeEditor: () => void;
    firstAnnotations: IAnnotationConfigWithScreen[];
    getAnnInView: (refId: string) => void;
    onTourJourneyChange: JourneyOrOptsDataChange;
    tourOpts: ITourDataOpts;
    journey: JourneyData;
    featurePlan: FeatureForPlan | null;
    allAnnotationsForTour: AnnotationPerScreen[];
    globalOpts: IGlobalConfig;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenId: string;
    annotationId?: string;
  }>;

interface IOwnStateProps {
  journeyData: JourneyData;
  isUrlValid: boolean;
  currentIpValues: {
    ctaText: string,
    ctaLink: string,
  }
}

const { Option } = Select;

class CreateJourney extends React.PureComponent<IProps, IOwnStateProps> {
  private selectTimer : NodeJS.Timeout | null = null;

  constructor(props: IProps) {
    super(props);
    this.state = {
      journeyData: this.props.journey,
      isUrlValid: true,
      currentIpValues: {
        ctaLink: this.props.journey.cta?.navigateTo._val || '',
        ctaText: this.props.journey.cta?.text._val || ''
      }
    };
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (prevState.journeyData !== this.state.journeyData) {
      this.props.onTourJourneyChange(null, this.state.journeyData);
    }

    if (prevProps.journey !== this.props.journey) {
      this.setState(({
        ...prevState,
        currentIpValues: {
          ctaLink: this.props.journey.cta?.navigateTo._val || '',
          ctaText: this.props.journey.cta?.text._val || ''
        }
      }));
    }
  }

  updateFlowAtIndex = (idx: number, key: keyof JourneyFlow, newValue: JourneyFlow[keyof JourneyFlow]) : void => {
    this.setState((prevState) => {
      const updatedJourneyData = { ...prevState.journeyData };
      const updatedFlows = [...updatedJourneyData.flows];

      if (key !== 'mandatory') {
        updatedFlows[idx][key] = newValue as string;
      } else {
        updatedFlows[idx].mandatory = newValue as boolean;
      }
      updatedJourneyData.flows = updatedFlows;
      return { ...prevState, journeyData: updatedJourneyData };
    });
  };

  deleteFlow = (idx: number) : void => {
    this.setState((prevState) => {
      const updatedJourneyData = { ...prevState.journeyData };
      const updatedFlows = [...updatedJourneyData.flows];

      updatedFlows.splice(idx, 1);
      updatedJourneyData.flows = updatedFlows;
      return { ...prevState, journeyData: updatedJourneyData };
    });
  };

  addNewFlow = (): void => {
    const flow = {
      header1: '',
      header2: '',
      main: '',
      mandatory: false
    };
    this.setState((prevState) => ({
      ...prevState,
      journeyData: { ...prevState.journeyData, flows: [...prevState.journeyData.flows, flow] } }));
  };

  repositionFlows = (sourceIndex: number, targetIndex: number) : void => {
    this.setState((prevState) => {
      const updatedJourneyData = { ...prevState.journeyData };
      const updatedFlows = [...updatedJourneyData.flows];

      const [movedFlow] = updatedFlows.splice(sourceIndex, 1);
      updatedFlows.splice(targetIndex, 0, movedFlow);
      updatedJourneyData.flows = updatedFlows;

      return { ...prevState, journeyData: updatedJourneyData };
    });
  };

  handleOnDragEnd(result: DropResult) : void {
    if (!result.destination) return;
    this.repositionFlows(result.source.index, result.destination.index);
  }

  getBackgroundColorForSelect = (flowMain: string): string => {
    if (!flowMain) return '';

    const flowMainRefId = flowMain.split('/')[1];

    if (getAnnotationByRefId(flowMainRefId, this.props.allAnnotationsForTour)) return '';

    return '#EE7C5A';
  };

  modulesFeatureAvailable = isFeatureAvailable(this.props.featurePlan, 'modules');

  render():JSX.Element {
    return (
      <Tags.CreateJourneyCon>
        <Tags.Header>
          <Tags.CloseIcon alt="close" src={CloseIcon} onClick={this.props.closeEditor} />
        </Tags.Header>
        <div style={{ overflow: 'auto' }}>
          {
          !(this.state.journeyData.flows.length !== 0 || this.state.journeyData.title.length !== 0) ? (
            <Tags.NoJourneyCon>
              <img src={CreateJourneyEmptyIcon} alt="no module created" />
              <div className="typ-reg">
                <p
                  style={{
                    margin: 0,
                    textAlign: 'center',
                    marginBottom: '2rem'
                  }}
                  className="typ-h1"
                >
                  You don't have any modules yet.
                </p>
                <p style={{ margin: '10px 0', textAlign: 'center' }}>
                  Modules help you to split your demo in multiple logical small demos instead of one large demo.
                </p>
                <p style={{ margin: '10px 0', textAlign: 'center' }}>
                  Your buyer can choose which demo they want to see right from the UI.
                </p>
              </div>
              {!this.modulesFeatureAvailable.isAvailable ? (
                <div style={{ position: 'relative', height: '100px' }}>
                  <Upgrade
                    subs={this.props.subs}
                    isInBeta={this.modulesFeatureAvailable.isInBeta}
                    clickedFrom="create_journey"
                  />
                </div>)
                : (
                  <Button
                    intent="primary"
                    onClick={this.addNewFlow}
                    icon={<PlusOutlined />}
                    iconPlacement="left"
                  >
                    Create a module
                  </Button>
                )}
            </Tags.NoJourneyCon>
          ) : (
            <Tags.EditorCon className={this.modulesFeatureAvailable.isAvailable ? '' : 'upgrade-plan'}>
              {!this.modulesFeatureAvailable.isAvailable && (
                <Upgrade
                  subs={this.props.subs}
                  isInBeta={this.modulesFeatureAvailable.isInBeta}
                  clickedFrom="create_journey"
                />
              )}
              <Tags.JourneyInnerCon>
                <Input
                  label="Heading"
                  defaultValue={this.state.journeyData.title}
                  onBlur={async (e) => {
                    this.setState(prevState => ({
                      ...prevState,
                      journeyData: {
                        ...prevState.journeyData,
                        title: e.target.value }
                    }));
                  }}
                />
              </Tags.JourneyInnerCon>
              <Tags.JourneyInnerCon>
                <DragDropContext onDragEnd={(r) => this.handleOnDragEnd(r)}>
                  <Droppable droppableId="droppable">
                    {(provided, snapshot) => (
                      <Tags.FlowCon
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {this.state.journeyData.flows.map((flow, idx) => (
                          <Draggable key={flow.header1 + idx} draggableId={flow.header1 + idx} index={idx}>
                            {(providedInner, snapshotInner) => (
                              <Tags.FieldOuterCon
                                key={flow.header1 + idx}
                                {...providedInner.draggableProps}
                                ref={providedInner.innerRef}
                              >
                                <Tags.FieldCon
                                  key={flow.header1 + idx}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Tooltip
                                      placement="left"
                                      title={<span>Drag to reorder.</span>}
                                      overlayStyle={{ fontSize: '0.75rem' }}
                                    >
                                      <AntdButton
                                        type="text"
                                        size="small"
                                        icon={<HolderOutlined
                                          style={{ opacity: '0.65', fontSize: '18px', rotate: '90deg' }}
                                        />}
                                        {...providedInner.dragHandleProps}
                                      />
                                    </Tooltip>
                                    <div style={{ display: 'flex' }}>
                                      <Tooltip
                                        placement="right"
                                        title={<span>focus this flow.</span>}
                                        overlayStyle={{ fontSize: '0.75rem' }}
                                      >
                                        <AntdButton
                                          type="text"
                                          size="small"
                                          onClick={() => {
                                            if (!flow.main) return;
                                            if (this.selectTimer) {
                                              clearTimeout(this.selectTimer);
                                            }
                                            this.selectTimer = setTimeout(() => {
                                              this.selectTimer = null;
                                              this.props.getAnnInView(flow.main.split('/')[1]);
                                            }, 300);
                                          }}
                                        >
                                          <img
                                            src={Focus}
                                            alt="focus"
                                            style={{ height: '18px' }}
                                          />
                                        </AntdButton>
                                      </Tooltip>
                                      <Tooltip
                                        placement="right"
                                        title={<span>delete this flow.</span>}
                                        overlayStyle={{ fontSize: '0.75rem' }}
                                      >
                                        <AntdButton
                                          type="text"
                                          size="small"
                                          icon={<DeleteOutlined style={{ opacity: '0.65', fontSize: '18px' }} />}
                                          onClick={() => { this.deleteFlow(idx); }}
                                        />
                                      </Tooltip>
                                    </div>
                                  </div>
                                  <Tags.FieldInputCon>
                                    <Input
                                      containerStyle={{ width: '100%' }}
                                      label="Module name"
                                      defaultValue={flow.header1}
                                      onBlur={(e) => { this.updateFlowAtIndex(idx, 'header1', e.target.value); }}
                                    />

                                    <Input
                                      containerStyle={{ width: ' 100%' }}
                                      label="Module description"
                                      defaultValue={flow.header2}
                                      onBlur={(e) => { this.updateFlowAtIndex(idx, 'header2', e.target.value); }}
                                    />

                                    <GTags.FableSelect
                                      bordered={false}
                                      size="large"
                                      defaultValue={flow.main || undefined}
                                      style={{
                                        width: '100%',
                                        borderRadius: '8px',
                                        backgroundColor: this.getBackgroundColorForSelect(flow.main)
                                      }}
                                      onSelect={(value) => { this.updateFlowAtIndex(idx, 'main', value as string); }}
                                      placeholder="Choose a module"
                                      optionLabelProp="children"
                                    >
                                      {this.props.firstAnnotations.map((ann => ((
                                        <Option
                                          key={`${ann.screen.id}/${ann.refId}`}
                                          value={`${ann.screen.id}/${ann.refId}`}
                                          onMouseEnter={() => {
                                            if (this.selectTimer) {
                                              clearTimeout(this.selectTimer);
                                            }
                                            this.selectTimer = setTimeout(() => {
                                              this.selectTimer = null;
                                              this.props.getAnnInView(ann.refId);
                                            }, 300);
                                          }}
                                        >
                                          <b>{ann.stepNumber}</b>: {ann.displayText}
                                        </Option>
                                      ))))}
                                    </GTags.FableSelect>

                                    <div>
                                      <GTags.OurCheckbox
                                        checked={flow.mandatory}
                                        onChange={(e) => {
                                          this.updateFlowAtIndex(idx, 'mandatory', e.target.checked);
                                        }}
                                      >Mandatory module
                                      </GTags.OurCheckbox>
                                      <div className="typ-sm hlpr">
                                        If a module is made <em>Mandatory</em>, user needs to finish this module before
                                        they switch to a different module.
                                        This is helpful when you have a <em>Lead Form</em> or an <em>introduction</em>.
                                      </div>
                                    </div>
                                  </Tags.FieldInputCon>
                                </Tags.FieldCon>
                              </Tags.FieldOuterCon>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </Tags.FlowCon>
                    )}
                  </Droppable>
                </DragDropContext>
                <Tags.CTAInputCon style={{ margin: '0.5rem' }}>
                  <GTags.DashedBtn
                    className="fullWidth typ-reg"
                    icon={<PlusOutlined />}
                    onClick={this.addNewFlow}
                    type="text"
                  >
                    Add another module
                  </GTags.DashedBtn>
                </Tags.CTAInputCon>
              </Tags.JourneyInnerCon>
              <Divider style={{ margin: '16px 0 32px 0' }} />
              <Tags.JourneyConfigCon>
                {
                  this.state.journeyData.cta === undefined ? (
                    <Tags.CTAInputCon>
                      <GTags.DashedBtn
                        onClick={() => {
                          const newCta = {
                            size: AnnotationButtonSize.Medium,
                            text: 'Book Demo',
                            navigateTo: ''
                          };
                          this.setState((prevState) => ({
                            ...prevState,
                            journeyData: {
                              ...prevState.journeyData,
                              cta: {
                                ...newCta,
                                size: createGlobalProperty(this.props.globalOpts.ctaSize, GlobalPropsPath.ctaSize),
                                navigateTo: createGlobalProperty(
                                  this.props.globalOpts.customBtn1URL,
                                  GlobalPropsPath.customBtn1URL
                                ),
                                text: createGlobalProperty(
                                  this.props.globalOpts.customBtn1Text,
                                  GlobalPropsPath.customBtn1Text
                                ) } } }));
                        }}
                        className="fullWidth typ-reg"
                        type="text"
                      >
                        Create CTA
                      </GTags.DashedBtn>
                    </Tags.CTAInputCon>
                  ) : (
                    <Tags.JourneyInnerCon>
                      <Tags.CTAInputCon>
                        <div className="typ-reg" style={{ marginTop: 0 }}>Button settings</div>
                        <GTags.CTABtn
                          style={{ width: '50%' }}
                          size={this.state.journeyData.cta.size._val}
                          color={this.state.journeyData.primaryColor._val}
                          borderRadius={this.props.tourOpts.borderRadius._val}
                        >
                          {this.state.journeyData.cta.text._val}
                        </GTags.CTABtn>
                      </Tags.CTAInputCon>
                      <Tags.CTAInputCon>
                        <div className="typ-reg">Text</div>
                        <div className="ver-center" style={{ justifyContent: 'right' }}>
                          <GTags.SimpleInput
                            size="small"
                            value={this.state.currentIpValues.ctaText}
                            style={{
                              width: '50%',
                              height: '40px'
                            }}
                            placeholder="Button text"
                            onChange={(e) => {
                              this.setState((prevState) => ({
                                ...prevState,
                                currentIpValues: {
                                  ...prevState.currentIpValues,
                                  ctaText: e.target.value,
                                }
                              }));
                            }}
                            onBlur={e => {
                              const newCta = {
                                ...this.state.journeyData.cta!,
                                text: e.target.value
                              };
                              this.setState(prevState => (
                                { ...prevState,
                                  journeyData: {
                                    ...prevState.journeyData,
                                    cta: {
                                      ...newCta,
                                      text: createLiteralProperty(newCta.text)
                                    }
                                  }
                                }));
                            }}
                            className="typ-ip"
                          />
                          <ApplyStylesMenu
                            isGlobal={isGlobalProperty(this.state.journeyData.cta.text)}
                            onApplyGlobal={() => {
                              amplitudeApplyGlobalStyles(
                                'module',
                                'custom_cta_text',
                              );
                              this.setState(prevState => (
                                { ...prevState,
                                  journeyData: {
                                    ...prevState.journeyData,
                                    cta: prevState.journeyData.cta ? {
                                      ...prevState.journeyData.cta,
                                      text: createGlobalProperty(
                                        prevState.journeyData.cta.text._val,
                                        GlobalPropsPath.customBtn1Text
                                      )
                                    } : prevState.journeyData.cta,
                                  }
                                }
                              ));
                            }}
                          />
                        </div>
                      </Tags.CTAInputCon>
                      <Tags.CTAInputCon>
                        <div className="typ-reg">Size</div>
                        <div className="ver-center">
                          <GTags.FableSelect
                            bordered={false}
                            style={{ width: '50%' }}
                            size="large"
                            value={this.state.journeyData.cta.size._val}
                            options={Object.values(AnnotationButtonSize).map(v => ({
                              value: v,
                              label: v,
                            }))}
                            onSelect={(val) => {
                              const newCta = {
                                ...this.state.journeyData.cta!,
                                size: val as AnnotationButtonSize
                              };
                              this.setState(prevState => (
                                { ...prevState,
                                  journeyData: {
                                    ...prevState.journeyData,
                                    cta: {
                                      ...newCta,
                                      size: createLiteralProperty(newCta.size)
                                    }
                                  }
                                }));
                            }}
                            className="typ-ip"
                          />
                          <ApplyStylesMenu
                            isGlobal={isGlobalProperty(this.state.journeyData.cta.size)}
                            onApplyGlobal={() => {
                              amplitudeApplyGlobalStyles(
                                'module',
                                'custom_cta_type'
                              );
                              this.setState(prevState => (
                                { ...prevState,
                                  journeyData: {
                                    ...prevState.journeyData,
                                    cta: prevState.journeyData.cta ? {
                                      ...prevState.journeyData.cta,
                                      size: createGlobalProperty(
                                        prevState.journeyData.cta.size._val,
                                        GlobalPropsPath.ctaSize
                                      )
                                    } : prevState.journeyData.cta,
                                  }
                                }
                              ));
                            }}
                          />
                        </div>
                      </Tags.CTAInputCon>
                      <div>
                        <Tags.CTAInputCon>
                          <div className="typ-reg">Navigate to</div>
                          <div className="ver-center">
                            <GTags.SimpleInput
                              value={this.state.currentIpValues.ctaLink}
                              onChange={(e) => {
                                this.setState((prevState) => ({
                                  ...prevState,
                                  currentIpValues: {
                                    ...prevState.currentIpValues,
                                    ctaLink: e.target.value,
                                  }
                                }));
                              }}
                              size="small"
                              style={{
                                width: '50%',
                                height: '40px'
                              }}
                              placeholder="Open Url when clicked"
                              onBlur={e => {
                                const uri = e.target.value;
                                const validUrl = getValidUrl(uri);
                                this.setState(prevState => ({
                                  ...prevState,
                                  isUrlValid: Boolean(validUrl)
                                }));
                                if (!validUrl) return;
                                const newCta = {
                                  ...this.state.journeyData.cta!,
                                  navigateTo: validUrl
                                };
                                this.setState(prevState => (
                                  { ...prevState,
                                    journeyData: {
                                      ...prevState.journeyData,
                                      cta: {
                                        size: newCta.size,
                                        navigateTo: createLiteralProperty(newCta.navigateTo),
                                        text: newCta.text
                                      }
                                    }
                                  }));
                              }}
                              className="typ-ip"
                            />
                            <ApplyStylesMenu
                              isGlobal={isGlobalProperty(this.state.journeyData.cta.navigateTo)}
                              onApplyGlobal={() => {
                                amplitudeApplyGlobalStyles(
                                  'module',
                                  'custom_cta_url',
                                );
                                this.setState(prevState => (
                                  { ...prevState,
                                    journeyData: {
                                      ...prevState.journeyData,
                                      cta: prevState.journeyData.cta ? {
                                        ...prevState.journeyData.cta,
                                        navigateTo: createGlobalProperty(
                                          prevState.journeyData.cta.navigateTo._val,
                                          GlobalPropsPath.customBtn1URL
                                        )
                                      } : prevState.journeyData.cta,
                                    }
                                  }
                                ));
                              }}
                            />
                          </div>
                        </Tags.CTAInputCon>
                        {!this.state.isUrlValid && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'red', textAlign: 'end' }}>
                          The url you have entered appears to be malformed. A correctly formed url would look like
                          &nbsp; <em>https://acme.com</em>
                        </p>
                        )}
                      </div>
                      <GTags.DashedBtn
                        className="fullWidth typ-reg"
                        style={{ color: '#AB2424' }}
                        type="text"
                        onClick={() => {
                          this.setState((prevState) => ({
                            ...prevState,
                            journeyData: {
                              ...prevState.journeyData,
                              cta: undefined
                            } }));
                        }}
                        icon={<DeleteFilled style={{ color: '#d64e4d' }} />}
                      >
                        Delete CTA
                      </GTags.DashedBtn>
                    </Tags.JourneyInnerCon>
                  )
                }
                {/*
                <Divider style={{ margin: '24px 0' }} />
                <Tags.JourneyInnerCon>
                  <div className="typ-reg">Module Box Positioning</div>
                  <Tags.CTAInputCon className="typ-ip">
                    <label htmlFor={CreateJourneyPositioning.Left_Bottom}>
                      <input
                        id={CreateJourneyPositioning.Left_Bottom}
                        type="radio"
                        value={CreateJourneyPositioning.Left_Bottom}
                        checked={this.state.journeyData.positioning === CreateJourneyPositioning.Left_Bottom}
                        onChange={(e) => {
                          this.setState(prevState => ({
                            ...prevState,
                            journeyData: {
                              ...prevState.journeyData,
                              positioning: e.target.value as CreateJourneyPositioning }
                          }));
                        }}
                      />
                      <span>Bottom Left</span>
                    </label>
                    <label htmlFor={CreateJourneyPositioning.Right_Bottom} className="typ-ip">
                      <input
                        id={CreateJourneyPositioning.Right_Bottom}
                        type="radio"
                        value={CreateJourneyPositioning.Right_Bottom}
                        checked={this.state.journeyData.positioning === CreateJourneyPositioning.Right_Bottom}
                        onChange={(e) => {
                          this.setState(prevState => ({ ...prevState,
                            journeyData: {
                              ...prevState.journeyData, positioning: e.target.value as CreateJourneyPositioning } }));
                        }}
                      />
                      <span>Bottom Right</span>
                    </label>
                  </Tags.CTAInputCon>
                </Tags.JourneyInnerCon>
                */}
                <Divider style={{ margin: '24px 0' }} />
                <Tags.JourneyInnerCon style={{ marginBottom: '20px' }}>
                  <Tags.CTAInputCon>
                    <div className="typ-reg">Primary color</div>
                    <div className="ver-center">
                      <GTags.ColorPicker
                        className="typ-ip"
                        showText={(color) => color.toHexString()}
                        value={this.state.journeyData.primaryColor._val}
                        onChangeComplete={e => {
                          this.setState(prevState => (
                            { ...prevState,
                              journeyData: {
                                ...prevState.journeyData,
                                primaryColor: createLiteralProperty(e.toHexString())
                              }
                            }));
                        }}
                      />
                      <ApplyStylesMenu
                        isGlobal={isGlobalProperty(this.state.journeyData.primaryColor)}
                        onApplyGlobal={
                        () => {
                          amplitudeApplyGlobalStyles(
                            'module',
                            'cta_primary_color'
                          );
                          this.setState(prevState => (
                            {
                              ...prevState,
                              journeyData: {
                                ...prevState.journeyData,
                                primaryColor: createGlobalProperty(
                                  prevState.journeyData.primaryColor._val,
                                  GlobalPropsPath.primaryColor
                                )
                              }
                            }));
                        }
}
                      />
                    </div>
                  </Tags.CTAInputCon>

                  <Tags.CTAInputCon>
                    <div>Minimize module on start</div>
                    <GTags.OurCheckbox
                      showafterlabel="true"
                      checked={this.props.journey.hideModuleOnLoad}
                      onChange={(e) => {
                        this.setState((prevState) => ({
                          ...prevState,
                          journeyData:
                        { ...prevState.journeyData,
                          hideModuleOnLoad: e.target.checked
                        } }));
                      }}
                    />
                  </Tags.CTAInputCon>
                  <Tags.CTAInputCon>
                    <div>Hide module on mobile</div>
                    <GTags.OurCheckbox
                      showafterlabel="true"
                      checked={this.props.journey.hideModuleOnMobile}
                      onChange={(e) => {
                        this.setState((prevState) => ({
                          ...prevState,
                          journeyData:
                        { ...prevState.journeyData,
                          hideModuleOnMobile: e.target.checked
                        } }));
                      }}
                    />
                  </Tags.CTAInputCon>
                </Tags.JourneyInnerCon>
              </Tags.JourneyConfigCon>
              <div style={{ width: '99%', marginBottom: '20px' }}>
                <GTags.DashedBtn
                  className="fullWidth typ-reg"
                  style={{ color: '#AB2424' }}
                  type="text"
                  onClick={() => {
                    this.setState(prevState => ({
                      ...prevState,
                      journeyData: getSampleJourneyData(this.props.globalOpts) }));
                  }}
                  icon={<DeleteFilled style={{ color: '#d64e4d' }} />}
                > Delete Module
                </GTags.DashedBtn>
              </div>
            </Tags.EditorCon>

          )
        }
        </div>
      </Tags.CreateJourneyCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(CreateJourney));
