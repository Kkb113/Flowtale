import { processJob } from './main_msg_loop';
import { getApiConnection } from './db';
import transcodeVideo from './processors/media/video_transcoder';
import { JobProcessingStatus } from './api-contract';

jest.mock('./db', () => ({ getApiConnection: jest.fn() }));
jest.mock('./processors/media/video_transcoder', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('./processors/media/audio_transcoder', () => ({ __esModule: true, default: jest.fn() }));

const saved = { type: 'TRANSCODE_VIDEO', key: 'job-key', sourceFilePath: 'owned-source', processedFilePath: 'owned-output' };
const message = { Body: 'TRANSCODE_VIDEO', MessageAttributes: {
  key: { StringValue: 'job-key', DataType: 'String' },
  sourceFilePath: { StringValue: 'forged-source', DataType: 'String' },
} };

function fixture(status = JobProcessingStatus.Touched) {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
    if (sql.startsWith('SELECT processing_status')) return [[{ processing_status: status, info: saved }]];
    return [[]];
  });
  const connection = { query, release: jest.fn() };
  (getApiConnection as jest.Mock).mockResolvedValue(connection);
  (transcodeVideo as jest.Mock).mockResolvedValue({ ...saved, duration: '1s' });
  return connection;
}

beforeEach(() => jest.clearAllMocks());

it('uses committed metadata rather than queue-supplied source paths and scopes writes by job type', async () => {
  const connection = fixture();
  const signal = new AbortController().signal;
  await processJob(message, signal);
  expect(transcodeVideo).toHaveBeenCalledWith(saved, signal);
  expect(connection.query).toHaveBeenCalledWith(expect.stringContaining('SELECT processing_status'),
    ['TRANSCODE_VIDEO', 'job-key']);
  expect(connection.query).toHaveBeenCalledWith(expect.stringContaining('info = ? WHERE job_type = ? AND job_key = ?'),
    [JobProcessingStatus.Processed, JSON.stringify({ ...saved, duration: '1s' }), 'TRANSCODE_VIDEO', 'job-key']);
  expect(connection.release).toHaveBeenCalledTimes(1);
});

it('acknowledges duplicate completed work without encoding or changing its record', async () => {
  const connection = fixture(JobProcessingStatus.Processed);
  await processJob(message, new AbortController().signal);
  expect(transcodeVideo).not.toHaveBeenCalled();
  expect(connection.query.mock.calls.filter(([sql]) => sql.startsWith('UPDATE'))).toHaveLength(0);
  expect(connection.release).toHaveBeenCalledTimes(1);
});

it('keeps a failed encode retryable and releases its exclusive lock', async () => {
  const connection = fixture();
  (transcodeVideo as jest.Mock).mockRejectedValue(new Error('Upload failed'));
  await expect(processJob(message, new AbortController().signal)).rejects.toThrow('Upload failed');
  expect(connection.query).toHaveBeenCalledWith(expect.stringContaining('failure_reason = ?'),
    [JobProcessingStatus.Failed, expect.any(String), 'TRANSCODE_VIDEO', 'job-key']);
  expect(connection.query).toHaveBeenCalledWith('SELECT RELEASE_LOCK(?)', [expect.stringMatching(/^media:/)]);
  expect(connection.release).toHaveBeenCalledTimes(1);
});
