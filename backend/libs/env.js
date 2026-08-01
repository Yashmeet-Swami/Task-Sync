import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  ACCESS_TOKEN_SECRET: z.string().min(1, "ACCESS_TOKEN_SECRET is required"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),

  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),

  EMAIL_USER: z.string().trim().min(1, "EMAIL_USER is required"),
  EMAIL_PASS: z.string().trim().min(1, "EMAIL_PASS is required"),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z
    .preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean())
    .default(true),

  ARCJET_KEY: z.string().min(1, "ARCJET_KEY is required"),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z
    .preprocess((v) => (typeof v === "string" ? v === "true" : v), z.boolean())
    .default(false),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin"),
  MINIO_BUCKET: z.string().default("tasksync-uploads"),
  MINIO_PUBLIC_URL: z.string().default("http://localhost:9000"),
});

let env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error("Invalid environment configuration:");
  for (const issue of error.issues ?? []) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export default env;
