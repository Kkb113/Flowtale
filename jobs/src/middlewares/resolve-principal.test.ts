import { Request, Response } from 'express';
import { authenticateUser } from './resolve-principal';
import { req as api, ApiServiceError } from '../api';

jest.mock('../api', () => ({ ...jest.requireActual('../api'), req: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

async function authenticate(authorization = 'Bearer 42:fixture-token') {
  const request = { headers: { authorization } } as Request;
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  await authenticateUser(request, response as unknown as Response, next);
  return { request, response, next };
}

it('requires membership from the API instead of trusting the workspace prefix', async () => {
  (api as jest.Mock).mockResolvedValue({ id: 7, active: true, orgs: [{ id: 43 }] });
  const { response, next } = await authenticate();
  expect(response.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});
it('uses the user ID as identity and forwards the token only as authorization', async () => {
  (api as jest.Mock).mockResolvedValue({ id: 7, active: true, orgs: [{ id: 42 }] });
  const { request, next } = await authenticate();
  expect(request.house.iam).toEqual({ id: '7', orgId: 42 });
  expect(api).toHaveBeenCalledWith('/f/iam', 'GET', undefined, 'Bearer 42:fixture-token');
  expect(next).toHaveBeenCalledTimes(1);
});
it('reports an unavailable API without falsely invalidating the login', async () => {
  (api as jest.Mock).mockRejectedValue(new ApiServiceError(503));
  expect((await authenticate()).response.status).toHaveBeenCalledWith(503);
});
it('preserves an actual unauthorized response', async () => {
  (api as jest.Mock).mockRejectedValue(new ApiServiceError(401));
  expect((await authenticate()).response.status).toHaveBeenCalledWith(401);
});
it.each(['Bearer 0:token', 'Bearer 42:token extra', 'Bearer 9007199254740992:token', 'Basic 42:token'])(
  'rejects malformed scope before making an API request', async authorization => {
    expect((await authenticate(authorization)).response.status).toHaveBeenCalledWith(401);
    expect(api).not.toHaveBeenCalled();
  },
);
