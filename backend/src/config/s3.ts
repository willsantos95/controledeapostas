import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

export const S3_BUCKET = process.env.S3_BUCKET || "apostas-bucket";

export const isS3Configured = Boolean(process.env.S3_ENDPOINT);

export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
  },
});

export async function ensureBucketExists() {
  if (!isS3Configured) {
    console.log("S3_ENDPOINT não configurado — upload de screenshots desabilitado.");
    return;
  }

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch {
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    } catch (err) {
      console.error("Falha ao criar bucket S3:", err);
    }
  }
}
