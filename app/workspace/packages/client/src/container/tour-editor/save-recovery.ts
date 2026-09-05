import api from '@fable/common/dist/api';
import { ApiResp, ReqRecordEdit, RespCommonConfig, RespDemoEntity, RespScreen } from '@fable/common/dist/api-contract';
import { EditFile, IGlobalConfig, TourData, TourDataWoScheme } from '@fable/common/dist/types';
import { getCurrentUtcUnixTime } from '@fable/common/dist/utils';
import { mergeEdits, mergeGlobalEdits, mergeTourData, processRawScreenData, processRawTourData } from '../../entity-processor';
import { AllEdits, AllGlobalElEdits, ElEditType } from '../../types';
import { JournalSnapshot } from './chunk-sync-manager';

export interface SaveDifference { field: string; saved: unknown; proposed: unknown }
export interface SaveReview {
  name: string;
  differences: SaveDifference[];
  saved: object;
  proposed: object;
  save: () => Promise<void>;
}

export function compareSavedChanges(saved: unknown, proposed: unknown, field = ''): SaveDifference[] {
  if (JSON.stringify(saved) === JSON.stringify(proposed)) return [];
  const isRecord = (value: unknown): value is Record<string, unknown> => (
    !!value && typeof value === 'object' && !Array.isArray(value)
  );
  if (isRecord(saved) && isRecord(proposed)) {
    return Array.from(new Set([...Object.keys(saved), ...Object.keys(proposed)]))
      .filter(key => key !== 'lastUpdatedAtUtc')
      .flatMap(key => compareSavedChanges(saved[key], proposed[key], field ? `${field} / ${key}` : key));
  }
  return [{ field, saved, proposed }];
}

export async function loadSaveReview(
  snapshot: JournalSnapshot,
  config: RespCommonConfig,
  global: IGlobalConfig
): Promise<SaveReview> {
  if (!snapshot.value || snapshot.kind === 'invalid') throw new Error('These changes cannot be read. Download a recovery copy before discarding them.');
  const key = snapshot.targetKey;
  const rid = key.slice(key.lastIndexOf('/') + 1);
  const isScreen = key.startsWith('fable/syncnd/editchunk/');
  const isGlobal = key.startsWith('fable/syncnd/globaleditchunk/');
  const isLoader = key.startsWith('fable/syncnd/loader/');
  if (!isScreen && !isGlobal && !isLoader && !key.startsWith('fable/syncnd/index/')) throw new Error('Unsupported saved changes');
  const path = `/${isScreen ? 'screen' : 'tour'}?rid=${encodeURIComponent(rid)}`;
  const response = await api<null, ApiResp<RespScreen | RespDemoEntity>>(path, { auth: true });
  const revision = new Date(response.data.updatedAt).getTime();
  if (!Number.isFinite(revision)) throw new Error('The saved version could not be verified. Please try again.');
  let saved: object;
  let proposed: object;
  if (isScreen) {
    const screen = processRawScreenData(response.data as RespScreen, config);
    const file = await api<null, EditFile<AllEdits<ElEditType>>>(screen.editFileUri.href);
    saved = file;
    proposed = { ...file, edits: mergeEdits(Array.isArray(file.edits) ? {} : file.edits, snapshot.value as AllEdits<ElEditType>) };
  } else {
    const tour = processRawTourData(response.data as RespDemoEntity, config, global);
    if (isLoader) {
      const file = await api<null, Record<string, unknown>>(tour.loaderFileUri.href);
      saved = file;
      proposed = { ...file, ...snapshot.value };
    } else if (isGlobal) {
      const file = await api<null, EditFile<AllGlobalElEdits<ElEditType>>>(tour.editFileUri.href);
      saved = file;
      proposed = { ...file, edits: mergeGlobalEdits(file.edits, snapshot.value as AllGlobalElEdits<ElEditType>) };
    } else {
      const file = await api<null, TourData>(tour.dataFileUri.href);
      saved = file;
      proposed = { ...file, ...mergeTourData(file, snapshot.value as Partial<TourDataWoScheme>, true) };
    }
  }
  // Mutable legacy files and SQL metadata are independent reads. Reject a known revision
  // change during comparison; the write checks the same revision again on the server.
  const verified = await api<null, ApiResp<RespScreen | RespDemoEntity>>(path, { auth: true });
  if (new Date(verified.data.updatedAt).getTime() !== revision) {
    throw new Error('The saved version changed while loading. Load the comparison again.');
  }
  const body: ReqRecordEdit = { rid,
    expectedRevision: revision,
    editData: JSON.stringify({ ...proposed, lastUpdatedAtUtc: getCurrentUtcUnixTime() }) };
  return {
    name: response.data.displayName,
    differences: compareSavedChanges(saved, proposed),
    saved,
    proposed,
    save: async () => {
      await api<ReqRecordEdit, ApiResp<RespScreen | RespDemoEntity>>(
        isScreen ? '/recordeledit' : isGlobal ? '/recordtrgbedit' : isLoader ? '/recordtrloaderedit' : '/recordtredit',
        { auth: true, body }
      );
    },
  };
}
