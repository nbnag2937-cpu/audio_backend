import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";

// Yeu cau phai co JWT hop le (danh cho ADMIN / SUPER_ADMIN)
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Thieu Bearer token trong header Authorization");
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.account = { accountId: payload.accountId, role: payload.role };
    next();
  } catch {
    throw ApiError.unauthorized("Token khong hop le hoac da het han");
  }
}

// Gioi han theo role, dung sau requireAuth. Vi du: requireRole(Role.SUPER_ADMIN)
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.account) {
      throw ApiError.unauthorized();
    }
    if (!allowedRoles.includes(req.account.role)) {
      throw ApiError.forbidden("Role hien tai khong duoc phep truy cap route nay");
    }
    next();
  };
}
