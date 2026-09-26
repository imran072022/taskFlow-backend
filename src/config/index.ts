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
if (!process.env.REDIS_USERNAME || !process.env.REDIS_PASSWORD) {
  throw new Error("Redis credentials are missing");
}
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error("Google client ID is missing");
}
if (!process.env.BREVO_API_KEY) {
  throw new Error("Brevo api key is missing");
}
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Stripe secret key is missing");
}

const config = {
  database_url: process.env.DATABASE_URL,
  port: process.env.PORT,
  node_env: process.env.NODE_ENV,
  frontend_url: process.env.FRONTEND_URL,
  bcrypt_salt_round: Number(process.env.BCRYPT_SALT_ROUND),
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_access_token_expiry: process.env.JWT_ACCESS_EXPIRY as StringValue,
  jwt_refresh_token_expiry: process.env.JWT_REFRESH_EXPIRY as StringValue,

  redis_username: process.env.REDIS_USERNAME,
  redis_password: process.env.REDIS_PASSWORD,
  redis_host: process.env.REDIS_HOST,
  redis_port: Number(process.env.REDIS_PORT),

  smtp_user: process.env.SMTP_USER,
  smtp_password: process.env.SMTP_PASSWORD,
  brevo_api_key: process.env.BREVO_API_KEY,
  brevo_sender_email: process.env.BREVO_SENDER_EMAIL,

  google_client_id: process.env.GOOGLE_CLIENT_ID,

  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  stripe_basic_monthly_price_id: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,
  stripe_basic_yearly_price_id: process.env.STRIPE_BASIC_YEARLY_PRICE_ID,
  stripe_pro_monthly_price_id: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  stripe_pro_yearly_price_id: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  stripe_lifetime_price_id: process.env.STRIPE_LIFETIME_PRICE_ID,
};

export default config;
