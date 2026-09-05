import addLlmOpsHttpListeners from './index';
import { req as api } from '../../api';

const mockCreate = jest.fn();
jest.mock('./anthropic', () => ({ clients: [{ beta: { promptCaching: { messages: {
  create: (...args: unknown[]) => mockCreate(...args),
} } } }] }));
jest.mock('../../api', () => ({ req: jest.fn() }));
jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));
jest.mock('./prompts', () => ({ __esModule: true, default: { RouterNewDemo: {
  shouldAppendThreadMsgs: false, system: 'Fixture', fns: [],
} } }));

beforeEach(() => {
  jest.clearAllMocks();
  (api as jest.Mock).mockResolvedValue({ id: 1, data: {} });
});

async function invoke() {
  let handler: any;
  addLlmOpsHttpListeners({ post: (_path: string, callback: unknown) => { handler = callback; } } as any);
  const log = { error: jest.fn(), fatal: jest.fn() };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  await handler({ body: { type: 'create_demo_router', thread: 'fixture', user_payload: {
    product_details: 'Fixture product', demo_objective: 'Fixture objective',
  } }, headers: { authorization: 'fixture' }, log }, res);
  return { res, log };
}

test('failed provider attempts neither deduct credits nor expose provider diagnostics', async () => {
  mockCreate.mockRejectedValue(new Error('PRIVATE_PROVIDER_SECRET https://signed.invalid/?credential=PRIVATE_PROVIDER_SECRET'));
  const { res, log } = await invoke();
  expect(mockCreate).toHaveBeenCalledTimes(2);
  expect((api as jest.Mock).mock.calls.some(call => call[0] === '/f/deductcredit')).toBe(false);
  expect(res.status).toHaveBeenCalledWith(502);
  expect(JSON.stringify({ response: res.json.mock.calls, logs: [log.error.mock.calls, log.fatal.mock.calls], writes: (api as jest.Mock).mock.calls }))
    .not.toContain('PRIVATE_PROVIDER_SECRET');
});

test('a successful result still records its output and deducts the specified credit once', async () => {
  mockCreate.mockResolvedValue({ role: 'assistant', content: [], usage: {}, stop_reason: 'tool_use' });
  const { res } = await invoke();
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(res.status).toHaveBeenCalledWith(200);
  expect((api as jest.Mock).mock.calls.filter(call => call[0] === '/f/deductcredit')).toHaveLength(1);
});
