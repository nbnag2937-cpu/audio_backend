import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError";

// Validate req.body theo schema Zod. Neu sai, tra loi 400 voi thong tin chi tiet.
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(" | ");
      throw ApiError.badRequest(message, "VALIDATION_ERROR");
    }
    req.body = result.data;
    next();
  };
}
