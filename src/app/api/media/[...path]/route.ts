import fs from "node:fs/promises";
import { connection } from "next/server";
import { getMediaFileByPath, resolveUploadPath } from "@/lib/media";

/**
 * Serves uploaded media.
 *
 * New uploads live in the database (`media_blobs`), because the production
 * host exposes a read-only filesystem. Files from older deployments are still
 * served from `data/uploads/` as a fallback.
 *
 * Public by design — uploaded storefront imagery must load for visitors.
 * Filenames are UUIDs and never rewritten (replacements get a new UUID), so
 * the response can be cached immutably.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  await connection(); // request-time read of the database / uploads volume
  const { path: segments } = await ctx.params;
  const parts = segments ?? [];
  const file = resolveUploadPath(parts);
  if (!file) return new Response("Not found", { status: 404 });

  const servedPath = `/api/media/${parts.join("/")}`;
  const stored = await getMediaFileByPath(servedPath);
  if (stored) {
    return new Response(new Uint8Array(stored), {
      headers: {
        "content-type": "image/webp",
        "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  }

  try {
    const data = await fs.readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": "image/webp",
        "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
