import { createHmac } from 'node:crypto';
import { Request, Response } from 'express';
import { verifySlackRequest } from './slack-signature';

const secret = 'fixture-signing-secret';
const rawBody = Buffer.from('payload=%7B%22fixture%22%3Atrue%7D');
const original = process.env.SLACK_SIGNING_SECRET;
beforeEach(() => { process.env.SLACK_SIGNING_SECRET = secret; });
afterAll(() => {
  if (original === undefined) delete process.env.SLACK_SIGNING_SECRET;
  else process.env.SLACK_SIGNING_SECRET = original;
});

function verify(signature?: string, offset = 0, body = rawBody) {
  const timestamp = String(Math.floor(Date.now() / 1000) + offset);
  const signed = `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:`).update(rawBody).digest('hex')}`;
  const headers = { 'x-slack-request-timestamp': timestamp, 'x-slack-signature': signature ?? signed };
  const req = { rawBody: body, header: (name: keyof typeof headers) => headers[name] } as unknown as Request;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  verifySlackRequest(req, res as unknown as Response, next);
  return { res, next };
}

it('accepts the signature of the exact raw body', () => expect(verify().next).toHaveBeenCalledTimes(1));
it('rejects body changes after signing', () => expect(verify(undefined, 0, Buffer.from('changed')).res.status).toHaveBeenCalledWith(401));
it.each([-301, 301])('rejects stale or future replay timestamp %s', offset => {
  expect(verify(undefined, offset).res.status).toHaveBeenCalledWith(401);
});
it.each(['', 'v0=wrong', `v0=${'é'.repeat(64)}`, `v0=${'0'.repeat(64)}`])('rejects malformed or incorrect signature', signature => {
  const result = verify(signature);
  expect(result.res.status).toHaveBeenCalledWith(401);
  expect(result.next).not.toHaveBeenCalled();
});
