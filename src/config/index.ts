import dotenv from "dotenv";
import type { StringValue } from "ms";
import path from "path";

dotenv.config({
  path: path.join(process.cwd(), ".env"),
});

if (!process.env.DATABASE_URL) {
  throw new Error("Database URL is missing");
}
if (!process.env.BCRYPT_SALT_ROUND) {
  throw new Error("Bcrypt salt is undefined");
}
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT secrets are not defined in the environment variables");
}
if (!process.env.JWT_ACCESS_EXPIRY || !process.env.JWT_REFRESH_EXPIRY) {
  throw new Error(
    "JWT expiration times are not defined in the environment variables",
  );
}

const config = {
  database_url: process.env.DATABASE_URL,
  port: process.env.PORT,
  node_env: process.env.NODE_ENV,
  bcrypt_salt_round: process.env.BCRYPT_SALT_ROUND,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_access_token_expiry: process.env.JWT_ACCESS_EXPIRY as StringValue,
  jwt_refresh_token_expiry: process.env.JWT_REFRESH_EXPIRY as StringValue,
};

export default config;
