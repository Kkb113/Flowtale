import api from '@fable/common/dist/api';
import { JobProcessingStatus } from '@fable/common/dist/api-contract';
import { waitForMedia } from './media-processing';

jest.mock('@fable/common/dist/api', () => ({ __esModule: true, default: jest.fn() }));
const job = (id: number, status: JobProcessingStatus) => ({ jobId: id, processingState: status } as any);
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(() => jest.useRealTimers());

it('waits for all durable outputs and does not poll completed formats again', async () => {
  (api as jest.Mock).mockResolvedValue({ data: job(2, JobProcessingStatus.Processed) });
  const waiting = waitForMedia([job(1, JobProcessingStatus.Processed), job(2, JobProcessingStatus.Touched)]);
  jest.advanceTimersByTime(2000);
  expect(await waiting).toEqual([job(1, JobProcessingStatus.Processed), job(2, JobProcessingStatus.Processed)]);
  expect(api).toHaveBeenCalledTimes(1);
  expect(api).toHaveBeenCalledWith('/mediajobs/2', expect.objectContaining({ auth: true }));
  expect(jest.getTimerCount()).toBe(0);
});

it('surfaces failed encoding without attaching a partial set of formats', async () => {
  await expect(waitForMedia([job(1, JobProcessingStatus.Processed), job(2, JobProcessingStatus.Failed)]))
    .rejects.toThrow('failed');
  expect(jest.getTimerCount()).toBe(0);
});

it('cancels polling on navigation and clears its timers', async () => {
  const controller = new AbortController();
  const waiting = waitForMedia([job(1, JobProcessingStatus.Touched)], controller.signal);
  const assertion = expect(waiting).rejects.toThrow('canceled');
  controller.abort();
  await assertion;
  expect(api).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});
