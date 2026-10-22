import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { get, put } from "@vercel/blob";

const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");
const BLOB_PREFIX = "blob:";

/** Coolify: mount a persistent volume at `storage/uploads`. Blob token is optional (e.g. Vercel Blob). */
function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function uploadPathForOrg(organizationId: string, fileName: string) {
  return path.join(UPLOAD_ROOT, organizationId, fileName);
}

export function relativeStoragePath(organizationId: string, fileName: string) {
  return path.join("storage", "uploads", organizationId, fileName);
}

export async function saveOrganizationUpload(
  organizationId: string,
  fileName: string,
  data: Buffer,
): Promise<string> {
  if (blobConfigured()) {
    const pathname = `uploads/${organizationId}/${fileName}`;
    await put(pathname, data, {
      access: "private",
      contentType: "application/pdf",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return `${BLOB_PREFIX}${pathname}`;
  }

  const dir = path.join(UPLOAD_ROOT, organizationId);
  await mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, fileName);
  await writeFile(fullPath, data);
  return relativeStoragePath(organizationId, fileName);
}

export async function readOrganizationUpload(
  storagePath: string,
): Promise<Buffer> {
  if (storagePath.startsWith(BLOB_PREFIX)) {
    const pathname = storagePath.slice(BLOB_PREFIX.length);
    const result = await get(pathname, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || result.statusCode !== 200) {
      throw new Error("Could not read uploaded PDF from storage.");
    }
    if (!result.stream) {
      throw new Error("Could not read uploaded PDF from storage.");
    }
    const chunks: Uint8Array[] = [];
    const reader = result.stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks);
  }

  const absolutePath = path.isAbsolute(storagePath)
    ? storagePath
    : path.join(process.cwd(), storagePath);

  return readFile(absolutePath);
}
