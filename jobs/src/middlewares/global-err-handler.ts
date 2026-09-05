import {NextFunction, Request, Response} from 'express';

export default (err: any, req: Request, res: Response, next: NextFunction) => {
  if (!err) return next();
  if (res.headersSent) return next(err);
  req.log.error({ errorType: err.name || 'Error' }, 'Request failed');

  const errStatus = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode <= 599
    ? err.statusCode : 500;
  const errMsg = errStatus < 500 ? 'Request was rejected' : 'Something went wrong';
  return res.status(errStatus).json({
    success: false,
    status: errStatus,
    message: errMsg,
  });
};
