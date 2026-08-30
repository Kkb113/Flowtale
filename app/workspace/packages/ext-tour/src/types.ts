import { ThemeStats, SerDoc, InteractionCtx } from "@fable/common/dist/types";

export interface IUser {
  id: number;
  belongsToOrg: {
    rid: string;
  };
}

export const enum RecordingStatus {
  Idle = 1,
  Recording,
  Stopping,
  Deleting,
}

export interface IExtStoredState {
  identity: IUser | null;
  recordingStatus: RecordingStatus;
}

export interface ReqScreenshotData {
  id: number;
}

export interface ReqScreenResize {
  w: number;
  h: number;
}

export interface StopRecordingData {
  id: number;
}

export interface ScriptInitRequiredData {
  required: "frameId"
  scriptId: string;
}

export interface SerializeFrameData {
  srcFrameId: number;
  id: number;
}

export interface ScriptInitReportedData {
  scriptId: string;
  frameId: number;
}

export interface ScreenSerStartData {
  // A monotonically increasing number with approximately nearby values incase generated too quickly inside 1ms
  id: number;
  // When an element in frame is clicked, the content script send messages to the whole background page with serialized
  // version of the frame. In this stage the eventType is source.
  // In order to get the rest serialized version of the rest of the frames, background sends further message to all the
  // frames to get their serialized dom. While answering to that message the eventType is cascade.
  eventType: "source" | "cascade";
}

export interface ScreenSerDataFromCS extends ScreenSerStartData {
  id: number;
  eventType: "source" | "cascade";
  // elPath: string;
  // Determines if this is the last screen to be captured. This is triggered by user wanting to stop the extension
  // recording
  isLast: boolean;
  serDoc: SerDoc;
  location: string;
  screenStyle: ThemeStats;
  interactionCtx: InteractionCtx | null;
}

export interface FrameDataToBeProcessed {
  oid: number;
  frameId: number;
  tabId: number;
  type: "serdom" | "thumbnail" | "sigstop";
  data: SerDoc | string;
}
