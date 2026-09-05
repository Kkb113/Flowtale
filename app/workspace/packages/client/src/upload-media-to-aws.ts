import api from '@fable/common/dist/api';
import { uploadAsset } from '@fable/common/dist/upload';
import {
  RespMediaProcessingInfo,
  ReqMediaProcessing,
  ApiResp,
  RespUploadUrl,
  ResponseStatus,
  PvtAssetType,
  EntityType
} from '@fable/common/dist/api-contract';
import { captureException } from '@sentry/react';
import { waitForMedia } from './media-processing';

export const getS3UploadUrl = async (type: string, signal?: AbortSignal): Promise<{
  baseUrl: string;
  cdnUrl: string
} | null> => {
  const res = await api<null, ApiResp<RespUploadUrl>>(`/getuploadlink?te=${encodeURIComponent(btoa(type))}`, {
    auth: true,
    signal,
  });

  if (res.status === ResponseStatus.Failure) {
    captureException('Error in getting S3 upload url');
  }
  return res.status === ResponseStatus.Failure ? null : {
    baseUrl: res.data.url,
    cdnUrl: res.data.cdnPath
  };
};

export async function uploadMediaToAws(
  mediaBuffer: Uint8Array,
  type: 'video/webm' | 'video/mp4' | 'audio/webm'
) {
  const awsSignedUrl = await getS3UploadUrl(type);
  if (!awsSignedUrl) return awsSignedUrl;

  await uploadAsset(awsSignedUrl.baseUrl, mediaBuffer, type);
  return awsSignedUrl;
}

export const uploadImageAsBinary = async (selectedImage: Blob, presignedUrls: {
  baseUrl: string,
  cdnUrl: string
}, signal?: AbortSignal): Promise<string> => {
  await uploadAsset(presignedUrls.baseUrl, selectedImage, selectedImage.type, { signal });
  return presignedUrls.cdnUrl;
};

export const uploadMarkedImageToAws = async (
  contentType: string,
  anonDemoId: string,
  imageName: string,
  file: File
): Promise<string> => {
  // eslint-disable-next-line max-len
  const data = await api<null, ApiResp<RespUploadUrl>>(`/getpvtuploadlink?te=${encodeURIComponent(btoa(contentType))}&pre=${encodeURIComponent(anonDemoId)}&fe=${encodeURIComponent(btoa(imageName))}&t=${PvtAssetType.MarkedImgs}`, {
    auth: true
  });
  if (data.status === ResponseStatus.Failure || !data.data?.objectKey) {
    throw new Error('Could not prepare the AI image upload. Your capture is retained; retry the request.');
  }
  await uploadAsset(data.data.url, file, contentType);
  return data.data.objectKey;
};

export async function uploadImgFileObjectToAws(image: File, signal?: AbortSignal) {
  if (!image) {
    return null;
  }
  const awsSignedUrl = await getS3UploadUrl(image.type, signal);
  if (!awsSignedUrl) return awsSignedUrl;

  await uploadImageAsBinary(image, awsSignedUrl, signal);
  return awsSignedUrl;
}

export async function transcodeVideo(uri: string, cdnUrl: string, tourRid: string, signal?: AbortSignal):
  Promise<[err: string, ...streams: RespMediaProcessingInfo[]]> {
  const data = await api<ReqMediaProcessing, ApiResp<RespMediaProcessingInfo[]>>('/vdt', {
    auth: true,
    signal,
    body: {
      cdnPath: cdnUrl,
      path: uri,
      assn: {
        entityRid: tourRid,
        entityType: EntityType.Tour
      }
    }
  });
  if (data.status === ResponseStatus.Failure) {
    return ["Couldn't transcode video"];
  }
  return ['', ...await waitForMedia(data.data, signal)];
}

export async function transcodeAudio(uri: string, cdnUrl: string, tourRid: string, signal?: AbortSignal):
  Promise<[err: string, ...streams: RespMediaProcessingInfo[]]> {
  const data = await api<ReqMediaProcessing, ApiResp<RespMediaProcessingInfo[]>>('/audt', {
    auth: true,
    signal,
    body: {
      path: uri,
      cdnPath: cdnUrl,
      assn: {
        entityRid: tourRid,
        entityType: EntityType.Tour
      }
    }
  });
  if (data.status === ResponseStatus.Failure) {
    return ["Couldn't transcode audio"];
  }
  return ['', ...await waitForMedia(data.data, signal)];
}
