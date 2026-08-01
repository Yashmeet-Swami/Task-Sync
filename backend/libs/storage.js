import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import env from "./env.js";
import logger from "./logger.js";

const s3 = new S3Client({
  endpoint: `${env.MINIO_USE_SSL ? "https" : "http"}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`,
  region: "us-east-1",
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // required for MinIO (path-style, not virtual-hosted-style)
});

const bucket = env.MINIO_BUCKET;

const publicReadPolicy = (bucketName) => ({
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: { AWS: ["*"] },
      Action: ["s3:GetObject"],
      Resource: [`arn:aws:s3:::${bucketName}/*`],
    },
  ],
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// MinIO has no Docker healthcheck (see docker-compose.yml), so on first boot the
// container may not be ready to accept connections yet - retry with backoff instead
// of giving up after a single attempt.
export const ensureBucketExists = async (retries = 5, delayMs = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      return;
    } catch (error) {
      const notFound = error.name === "NotFound" || error.$metadata?.httpStatusCode === 404;

      if (notFound) {
        await s3.send(new CreateBucketCommand({ Bucket: bucket }));
        await s3.send(
          new PutBucketPolicyCommand({
            Bucket: bucket,
            Policy: JSON.stringify(publicReadPolicy(bucket)),
          })
        );
        logger.info(`[storage] created bucket "${bucket}" with public-read policy`);
        return;
      }

      if (attempt === retries) throw error;
      logger.warn({ attempt, retries }, "[storage] bucket check failed, retrying...");
      await sleep(delayMs);
    }
  }
};

export const uploadFile = async (key, buffer, contentType) => {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${env.MINIO_PUBLIC_URL}/${bucket}/${key}`;
};

export const deleteFile = async (key) => {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
};

// Extracts the object key back out of a URL produced by uploadFile(), so callers can
// delete the old file when a user replaces their profile photo.
export const keyFromUrl = (url) => {
  const prefix = `${env.MINIO_PUBLIC_URL}/${bucket}/`;
  return url?.startsWith(prefix) ? url.slice(prefix.length) : null;
};
