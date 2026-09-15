import { ApiResp, ResponseStatus, PvtAssetType, RespUploadUrl } from '@fable/common/dist/api-contract';
import api from '@fable/common/dist/api';
import { DBData, runDbRequest } from '@fable/common/dist/db-utils';
import { uploadAsset } from '@fable/common/dist/upload';

export async function deleteCompletedCapture(db: IDBDatabase, storeName: string, capture: DBData): Promise<void> {
  await runDbRequest(db, storeName, 'readwrite', store => {
    const request = store.get(capture.id);
    request.onsuccess = () => {
      const current = request.result as DBData | undefined;
      // A new extension delivery may have replaced the one-slot capture while saving.
      if (current && current.captureSessionId === capture.captureSessionId && current.screensData === capture.screensData) {
        store.delete(capture.id);
      }
    };
    return request;
  });
}

export const saveDbDataToAws = async (dbData: DBData, anonDemoId: string): Promise<void> => {
  const nameOfSerdomFile = 'index.json';
  const contentType = 'application/json';
  const data = await api<null, ApiResp<RespUploadUrl>>(`/getpvtuploadlink?te=${encodeURIComponent(btoa(contentType))}&pre=${encodeURIComponent(anonDemoId)}&fe=${encodeURIComponent(btoa(nameOfSerdomFile))}&t=${PvtAssetType.TourInputData}`, {
    auth: true
  });
  if (data.status === ResponseStatus.Failure || !data.data?.url) {
    throw new Error('Could not prepare the capture archive upload. Retry to keep your capture.');
  }
  const s3PresignedUploadUrl = data.data.url;

  // Credentials from older extension versions are never part of a capture archive.
  await uploadAsset(s3PresignedUploadUrl, JSON.stringify({ ...dbData, cookies: '[]' }), contentType);
};
