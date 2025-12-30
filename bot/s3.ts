import { S3Client } from "bun";

class MissingS3CredentialError implements Error {
  name = "MissingS3CredentialError";
  message: string;

  constructor(missing: string) {
    this.message = `S3 credential "${missing}" is missing`;
  }
}

const S3_ENDPOINT = process.env.S3_ENDPOINT;
if (!S3_ENDPOINT) throw new MissingS3CredentialError("S3_ENDPOINT");

const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
if (!S3_ACCESS_KEY_ID) throw new MissingS3CredentialError("S3_ACCESS_KEY_ID");

const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
if (!S3_SECRET_ACCESS_KEY)
  throw new MissingS3CredentialError("S3_SECRET_ACCESS_KEY");

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
if (!S3_BUCKET_NAME) throw new MissingS3CredentialError("S3_BUCKET_NAME");

export default new S3Client({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  bucket: S3_BUCKET_NAME,
  endpoint: S3_ENDPOINT,
  region: "auto",
});
