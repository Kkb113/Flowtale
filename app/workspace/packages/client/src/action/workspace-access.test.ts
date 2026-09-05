import api from '@fable/common/dist/api';
import { ResponseStatus } from '@fable/common/dist/api-contract';
import { activateOrDeactivateUser } from './creator';

jest.mock('@fable/common/dist/api', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('nanoid', () => ({ nanoid: () => 'fixture-id' }));
beforeEach(() => jest.clearAllMocks());

it('does not apply a delayed membership response to another workspace', async () => {
  let resolve!: (value: unknown) => void;
  (api as jest.Mock).mockImplementation(() => new Promise(done => { resolve = done; }));
  const dispatch = jest.fn();
  let orgId = 1;
  const pending = activateOrDeactivateUser(7, false)(dispatch, () => ({ default: { org: { id: orgId } } } as any));
  orgId = 2;
  resolve({ status: ResponseStatus.Success, data: { id: 7, active: false } });
  await pending;
  expect(dispatch).not.toHaveBeenCalled();
});

it('retains the existing member state when the API reports failure', async () => {
  (api as jest.Mock).mockResolvedValue({ status: ResponseStatus.Failure });
  const dispatch = jest.fn();
  await expect(activateOrDeactivateUser(7, false)(dispatch, () => ({ default: { org: { id: 1 } } } as any)))
    .rejects.toThrow('update failed');
  expect(dispatch).not.toHaveBeenCalled();
});
