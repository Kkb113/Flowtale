import { NextFunction, Request, Response } from 'express';
import { req as api, ApiServiceError } from '../api';
import { RespUser } from '../api-contract';

/** The API owns identity and workspace membership checks, including local auth. */
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  const match = /^Bearer ([1-9]\d*):([^\s:]+)$/.exec(authorization || '');
  if (!match || !Number.isSafeInteger(Number(match[1]))) {
    res.status(401).json({ message: 'A valid workspace authorization token is required' });
    return;
  }
  try {
    const user = await api<undefined, RespUser>('/f/iam', 'GET', undefined, authorization);
    const orgId = Number(match[1]);
    if (!user.active || !Array.isArray(user.orgs) || !user.orgs.some(org => org.id === orgId)) {
      res.status(403).json({ message: 'Workspace membership is required' });
      return;
    }
    req.relay = { rawToken: authorization!, orgId };
    req.house = { iam: { id: String(user.id), orgId } };
    next();
  } catch (error) {
    const status = error instanceof ApiServiceError && [401, 403].includes(error.status) ? error.status : 503;
    res.status(status).json({ message: 'Authorization could not be verified' });
  }
}
