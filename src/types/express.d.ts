import { Role } from "@prisma/client";

// Mo rong Request cua Express de gan thong tin tai khoan sau khi xac thuc JWT
declare global {
  namespace Express {
    interface Request {
      account?: {
        accountId: string;
        role: Role;
      };
    }
  }
}

export {};
