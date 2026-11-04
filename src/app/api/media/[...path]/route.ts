import fs from "node:fs/promises";
import { connection } from "next/server";
import { resolveUploadPath } from "@/lib/media";

/**
 * Serves files from the persistent `data/uploads/` directory.
 *
 * Public by design — uploaded storefront imagery must load for visitors.
 * Filenames are UUIDs and never rewritten (replacements get a new UUID), so
 * the response can be cached immutably.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  await connection(); // request-time read of the uploads volume
  const { path: segments } = await ctx.params;
  const file = resolveUploadPath(segments ?? []);
  if (!file) return new Response("Not found", { status: 404 });

  try {
    const data = await fs.readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": "image/webp",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
