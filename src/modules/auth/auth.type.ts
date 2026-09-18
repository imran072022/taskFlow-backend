import type z from "zod";
import type { registerSchema } from "./auth.validation";

export type JwtUserPayload = {
  id: string;
  name: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

export type TRegisterPayload = z.infer<typeof registerSchema>;
export type TRegisterPayloadLocals = { validatedData: TRegisterPayload };
