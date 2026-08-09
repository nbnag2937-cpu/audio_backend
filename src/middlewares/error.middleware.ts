import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

// Middleware xu ly loi tap trung - dat sau cung trong app.ts
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
    return;
  }

  // Loi khong luong truoc - log ra console de de debug, khong lo chi tiet ra ngoai
  console.error("[UNHANDLED_ERROR]", err);
  res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "Da co loi xay ra, vui long thu lai sau",
  });
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    message: `Khong tim thay route: ${req.method} ${req.originalUrl}`,
  });
}
