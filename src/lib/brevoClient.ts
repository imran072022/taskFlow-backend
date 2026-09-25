import { BrevoClient } from "@getbrevo/brevo";
import config from "../config";

export const brevoClient = new BrevoClient({
  apiKey: config.brevo_api_key,
});
