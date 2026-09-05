import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import { init as sentryInit } from "@fable/common/dist/sentry";
import { Msg, MsgPayload } from "../msg";
import "./index.less";
import { IExtStoredState, RecordingStatus } from "../types";
import Loader from "./components/loader";
import { version } from "../../package.json";
import DisabledStopDelActionBtns from "./components/disabled-action-btns";
import { AGGRESSIVE_BUFFER_PRESERVATION, PURIFY_DOM_SERIALIZATION, SettingState } from "../common";

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

// INFO Open popup.html for development run this on service worker console `chrome.tabs.create({url: chrome.runtime.getURL("index.html")})`

sentryInit("extension", version);

type Props = {};

const RecordBtnText = "Record a new demo";
const StopBtnText = "Stop Recording";
const DeleteBtnText = "Delete Recording";
const DeletingBtnText = "Deleting...";

interface State {
  // This state is true when all the data is retrieved for the extension to work.
  // In this case logged in user, org etc
  inited: boolean;
  shouldShowResizeOption: boolean;
  resizeToWidth: number;
  resizeToHeight: number;
  recordingStatus: RecordingStatus,
  showSettings: boolean;
  purifyDom: SettingState;
  aggressiveBuffer: SettingState;
  recovery: NonNullable<IExtStoredState["recovery"]>;
  pending: NonNullable<IExtStoredState["pending"]>;
  error: string;
}

class Root extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      inited: false,
      resizeToWidth: 1200,
      resizeToHeight: 800,
      recordingStatus: RecordingStatus.Idle,
      shouldShowResizeOption: false,
      showSettings: false,
      purifyDom: SettingState.OFF,
      aggressiveBuffer: SettingState.ON,
      recovery: { total: 0, complete: 0, message: "" },
      pending: [],
      error: ""
    };

    chrome.runtime.onMessage.addListener(this.onMessageReceiveFromWorkerScript);
    chrome.runtime.sendMessage({ type: Msg.INIT });
  }

  componentDidMount() {
    chrome.storage.local.get([PURIFY_DOM_SERIALIZATION, AGGRESSIVE_BUFFER_PRESERVATION], (result) => {
      const purifyDom = result[PURIFY_DOM_SERIALIZATION];
      const aggressiveBuffer = result[AGGRESSIVE_BUFFER_PRESERVATION];
      if (purifyDom === SettingState.OFF || purifyDom === SettingState.ON) {
        this.setState({ purifyDom });
      }
      if (aggressiveBuffer === SettingState.OFF || aggressiveBuffer === SettingState.ON) {
        this.setState({ aggressiveBuffer });
      }
    });
  }

  onMessageReceiveFromWorkerScript = (msg: MsgPayload<any>, sender: chrome.runtime.MessageSender) => {
    switch (msg.type) {
      case Msg.INITED: {
        const tMsg = msg as MsgPayload<{
        state: IExtStoredState,
        dim: { suggestedHeight: number; suggestedWidth: number; suggestResize: boolean }
        }>;

        this.setState({
          inited: true,
          recordingStatus: tMsg.data.state.recordingStatus,
          recovery: tMsg.data.state.recovery!,
          pending: tMsg.data.state.pending || [],
          shouldShowResizeOption: tMsg.data.dim.suggestResize,
          resizeToHeight: Math.round(tMsg.data.dim.suggestedHeight),
          resizeToWidth: Math.round(tMsg.data.dim.suggestedWidth),
        });
        break;
      }

      case Msg.RECORDING_STATE:
        this.setState({ recordingStatus: msg.data.recordingStatus,
          recovery: msg.data.recovery,
          pending: msg.data.pending || [] });
        break;

      case Msg.WIN_ON_RESIZE: {
        const tMsg = msg as MsgPayload<{ dim: { h: number; w: number; suggestResize: boolean } }>;
        this.setState({
          shouldShowResizeOption: tMsg.data.dim.suggestResize
        });
        break;
      }

      case Msg.RECORDING_CREATE_OR_DELETE_COMPLETED:
        this.setState({ recordingStatus: RecordingStatus.Idle });
        break;

      default:
        break;
    }
  };

  componentWillUnmount() {
    chrome.runtime.onMessage.removeListener(this.onMessageReceiveFromWorkerScript);
  }

  command = async (type: Msg, data?: object) => {
    this.setState({ error: "" });
    try {
      const result = await chrome.runtime.sendMessage({ type, data });
      if (result?.error) throw new Error(result.error);
      return true;
    } catch (error) {
      this.setState({ error: (error as Error).message || "Could not contact the extension. Reopen it to recover your recording." });
      return false;
    }
  };

  startRecording = async () => {
    if (await this.command(Msg.START_RECORDING)) window.close();
  };

  stopRecording = () => this.command(Msg.STOP_RECORDING);

  deleteRecording = () => {
    if (window.confirm("Discard the current recording? Previously completed recordings will be kept.")) {
      this.command(Msg.DELETE_RECORDING);
    }
  };

  recoverComplete = () => {
    const missing = this.state.recovery.total - this.state.recovery.complete;
    if (window.confirm(`Keep ${this.state.recovery.complete} complete screen(s) and discard ${missing} incomplete screen(s)?`)) {
      this.command(Msg.RECOVER_COMPLETE);
    }
  };

  updateSettings = () => {
    this.setState(prev => ({ showSettings: !prev.showSettings }));
  };

  // eslint-disable-next-line class-methods-use-this
  openLinkInNewTab = (path: string) => () => {
    chrome.tabs.create({ active: true, url: `${APP_CLIENT_ENDPOINT}/${path}` });
  };

  updateSettingState = (key: string, value: SettingState) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (key === AGGRESSIVE_BUFFER_PRESERVATION) {
        this.setState({ aggressiveBuffer: value });
      } else if (key === PURIFY_DOM_SERIALIZATION) {
        this.setState({ purifyDom: value });
      }
    });
  };

  render() {
    return (
      <div className="p-con">
        <div style={{ position: "absolute", top: "5px", right: "5px", color: "white", fontSize: "0.75rem", opacity: 0.3 }}>
          <span>
            v{version}
          </span>
          &nbsp;&nbsp;
          {
            this.state.showSettings
              ? (
                <span style={{ cursor: "pointer", paddingTop: "4px", fontSize: "0.95rem" }} title="Hide settings" onClick={this.updateSettings}>
                  ←
                </span>
              )
              : (
                <span style={{ cursor: "pointer", paddingTop: "4px", fontSize: "0.95rem" }} title="Show settings" onClick={this.updateSettings}>
                  ⚙
                </span>
              )
          }
        </div>

        {!this.state.inited && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <img alt="logo" src="./logo_16.png" className="sm-logo" />
              <div style={{ marginLeft: "0.5rem" }}>Please wait while we set things up for you</div>
            </div>
            <Loader />
          </div>
        )}
        {this.state.inited && (
          <div className="action-con">
            {this.state.error && <p role="alert">{this.state.error}</p>}
            {this.state.recovery.message && <p role="status">{this.state.recovery.message}</p>}
            {this.state.pending.map(capture => (
              <button
                type="button"
                key={capture.id}
                className="btn-secondary"
                onClick={() => this.command(Msg.OPEN_CAPTURE, { id: capture.id })}
              >
                Resume {capture.screenCount} screen recording ({new Date(capture.createdAt).toLocaleString()})
              </button>
            ))}
            <div className="header-con">
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={this.openLinkInNewTab("demos")}
              >
                <img
                  alt="illustration"
                  style={{ margin: "0.5rem 0" }}
                  width={100}
                  src="./fableLogo.svg"
                />
              </button>
            </div>
            {
              this.state.showSettings
                ? (
                  <div
                    className="description"
                    style={{ margin: "0rem 0 0 2rem", width: "100%" }}
                  >
                    <div>
                      <p>Purify DOM serialization:&nbsp;&nbsp;
                        <a onClick={() => this.updateSettingState(PURIFY_DOM_SERIALIZATION, SettingState.ON)}>On</a> |
                        <a onClick={() => this.updateSettingState(PURIFY_DOM_SERIALIZATION, SettingState.OFF)}>Off</a> &nbsp;&nbsp;
                        [Currently {this.state.purifyDom}]
                      </p>
                    </div>
                    <div>
                      <p>Aggresive buffer preservation:&nbsp;&nbsp;
                        <a onClick={() => this.updateSettingState(AGGRESSIVE_BUFFER_PRESERVATION, SettingState.ON)}>
                          On
                        </a> |
                        <a onClick={() => this.updateSettingState(AGGRESSIVE_BUFFER_PRESERVATION, SettingState.OFF)}>
                          Off
                        </a> &nbsp;&nbsp;
                        [Currently {this.state.aggressiveBuffer}]
                      </p>
                    </div>
                    <div>
                      <a onClick={() => {
                        chrome.runtime.sendMessage({ type: Msg.INIT_REGISTERED_CONTENT_SCRIPTS });
                      }}
                      >Reload extension to apply settings
                      </a>
                    </div>
                    <div>
                      Please reload your tab for the changes to take effect
                    </div>
                  </div>
                )
                : (
                  <>
                    <div style={{ margin: "1.5rem 0rem 0rem 0rem" }}>
                      <div className="as-p title">Create stunning interactive demos in 5 minutes</div>
                      <div className="as-p description">
                        <ul style={{
                          listStyleType: "none"
                        }}
                        >
                          <li>✔️ For marketing teams to create interactive tours</li>
                          <li>✔️ For sales teams to create personalized demos</li>
                          <li>✔️ For support to create interactive guides</li>
                        </ul>
                      </div>
                    </div>
                    {this.state.shouldShowResizeOption && (
                    <div className="resize-con">
                      <div className="resize-msg">
                        ⚡️ Set ideal window size for demo recording
                      </div>
                      <div className="resize-win-ctrl">
                        <input
                          type="number"
                          value={this.state.resizeToWidth}
                          id="win-w"
                          onChange={(e) => {
                            this.setState({ resizeToWidth: +e.target.value });
                          }}
                        />
                        x
                        <input
                          type="number"
                          value={this.state.resizeToHeight}
                          id="win-h"
                          onChange={(e) => {
                            this.setState({ resizeToHeight: +e.target.value });
                          }}
                        />
                        &nbsp;
                        <button
                          type="button"
                          className="resize"
                          onClick={() => {
                            let w = parseInt((document.getElementById("win-w") as HTMLInputElement).value, 10);
                            let h = parseInt((document.getElementById("win-h") as HTMLInputElement).value, 10);
                            w = (Number.isNaN(w) || w < 128) ? 1200 : w;
                            h = (Number.isNaN(h) || h < 128) ? 800 : h;

                            chrome.runtime.sendMessage({
                              type: Msg.WIN_RESIZE,
                              data: {
                                h,
                                w,
                              }
                            });
                          }}
                        >Resize
                        </button>
                      </div>
                    </div>
                    )}

                    {
                      this.state.recordingStatus === RecordingStatus.Idle && (
                        <button type="button" className="btn-primary" onClick={this.startRecording}>
                          {RecordBtnText}
                        </button>
                      )
                    }
                    {
                      this.state.recordingStatus === RecordingStatus.Recording && (
                        <>
                          <button type="button" className="btn-primary" onClick={this.stopRecording}>
                            {StopBtnText}
                          </button>
                          <button type="button" className="btn-secondary" onClick={this.deleteRecording}>
                            {DeleteBtnText}
                          </button>
                        </>
                      )
                    }
                    {
                      this.state.recordingStatus === RecordingStatus.Stopping && (
                        <div aria-live="polite">
                          <p>{this.state.recovery.complete} of {this.state.recovery.total} screens are complete.</p>
                          <p>You can leave this window and reopen it. Unfinished data stays in this browser.</p>
                          <button type="button" className="btn-primary" onClick={() => this.command(Msg.RESET_STATE)}>Check completion</button>
                          {this.state.recovery.complete > 0 && this.state.recovery.complete < this.state.recovery.total && (
                            <button type="button" className="btn-secondary" onClick={this.recoverComplete}>Keep complete screens</button>
                          )}
                          <button type="button" className="btn-secondary" onClick={this.deleteRecording}>Discard recording</button>
                        </div>
                      )
                    }
                    {
                      this.state.recordingStatus === RecordingStatus.Deleting && (
                        <DisabledStopDelActionBtns
                          stopBtnText={StopBtnText}
                          deleteBtnText={DeletingBtnText}
                        />
                      )
                    }
                  </>
                )
            }
          </div>
        )}
      </div>
    );
  }
}

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);
root.render(<Root />);
