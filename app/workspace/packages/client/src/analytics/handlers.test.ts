import api from '@fable/common/dist/api';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import { logEventToCblt, logEventToCbltToSetAppProperties } from './handlers';

jest.mock('@fable/common/dist/api', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@fable/common/dist/sentry', () => ({ sentryCaptureException: jest.fn() }));
jest.mock('../global', () => ({ getGlobalData: () => ({ shouldLogEvent: true }) }));

it.each(['public', 'authenticated'])('handles asynchronous %s integration failures', async mode => {
  jest.clearAllMocks();
  const error = new Error('Optional integration unavailable');
  (api as jest.Mock).mockRejectedValue(error);
  const event = { event: 'fixture', payload: { ti: 1 } };
  if (mode === 'public') logEventToCblt(event, 'fixture');
  else logEventToCbltToSetAppProperties(event);
  await Promise.resolve();
  expect(sentryCaptureException).toHaveBeenCalledWith(error);
  expect(api).toHaveBeenCalledTimes(1);
});
