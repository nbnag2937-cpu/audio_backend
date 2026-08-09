import { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Boc controller async de tu dong bat loi va chuyen cho error middleware,
// khong can try/catch lap lai o moi controller
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
