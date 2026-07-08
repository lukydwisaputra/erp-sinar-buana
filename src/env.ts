import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY is required"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();
