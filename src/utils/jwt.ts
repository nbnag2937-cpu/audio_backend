import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "@prisma/client";

export interface JwtPayload {
  accountId: string;
  role: Role;
}

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
