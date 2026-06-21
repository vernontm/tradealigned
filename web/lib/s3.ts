import "server-only";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.S3_BUCKET || "tgfx-tradelab";

let _client: S3Client | null = null;
function client() {
  if (!_client) {
    _client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

// Cached key index: filename (lowercase) -> full S3 key
let _keyIndex: Record<string, string> | null = null;
let _keyIndexAt = 0;
const KEY_INDEX_TTL_MS = 30 * 60 * 1000;

async function buildKeyIndex(prefix = "tgfx-course/"): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  let continuationToken: string | undefined = undefined;
  do {
    const resp: import("@aws-sdk/client-s3").ListObjectsV2CommandOutput = await client().send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of resp.Contents ?? []) {
      if (!obj.Key) continue;
      const name = obj.Key.split("/").pop()!.toLowerCase();
      // Prefer the deepest match (skip if we already have a shorter key for this name)
      out[name] = obj.Key;
    }
    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);
  return out;
}

export async function getKeyIndex(): Promise<Record<string, string>> {
  if (_keyIndex && Date.now() - _keyIndexAt < KEY_INDEX_TTL_MS) {
    return _keyIndex;
  }
  _keyIndex = await buildKeyIndex();
  _keyIndexAt = Date.now();
  return _keyIndex;
}

export async function presignKey(key: string, expiresInSec = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(client(), cmd, { expiresIn: expiresInSec });
}

export function isS3Configured(): boolean {
  return !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
}
