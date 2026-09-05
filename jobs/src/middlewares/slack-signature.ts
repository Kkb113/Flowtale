import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export function verifySlackRequest(req: Request, res: Response, next: NextFunction) {
  const timestamp = req.header('x-slack-request-timestamp') || '';
  const signature = req.header('x-slack-signature') || '';
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret || !req.rawBody || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    res.status(401).json({ message: 'Invalid Slack request' });
    return;
  }
  const expected = `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:`).update(req.rawBody).digest('hex')}`;
  if (!/^v0=[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    res.status(401).json({ message: 'Invalid Slack signature' });
    return;
  }
  next();
}
