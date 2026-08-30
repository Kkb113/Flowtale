package com.sharefable.api.transport;

@GenerateTSDef
public enum JobType {
  TRANSCODE_VIDEO,
  TRANSCODE_AUDIO,
  RESIZE_IMG,
  CREATE_DEMO_GIF,
  DELETE_ASSET,
  REFRESH_CRAWLER,
}
