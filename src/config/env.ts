import dotenv from "dotenv";

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[env] Thieu bien moi truong bat buoc: ${key}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",

  databaseUrl: required("DATABASE_URL"),

  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  r2: {
    accountId: required("R2_ACCOUNT_ID"),
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    bucketName: required("R2_BUCKET_NAME"),
    endpoint: required("R2_ENDPOINT"),
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? "",
  },

  adLinkUrl: process.env.AD_LINK_URL ?? "",

  seedSuperAdmin: {
    email: process.env.SEED_SUPER_ADMIN_EMAIL ?? "",
    password: process.env.SEED_SUPER_ADMIN_PASSWORD ?? "",
    name: process.env.SEED_SUPER_ADMIN_NAME ?? "Super Admin",
  },
};
