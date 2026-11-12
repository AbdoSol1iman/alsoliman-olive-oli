import sharp from "sharp";
import { connection } from "next/server";
import { getMediaFileByPath } from "@/lib/media";

/**
 * JPEG rendition of an uploaded image for social crawlers.
 *
 * Uploads are stored as WebP, but Facebook, WhatsApp and most other link
 * preview crawlers only render JPEG, PNG or GIF. This route keeps the
 * storefront WebP (small and fast) while giving `og:image` a format every
 * platform accepts. The source path must already exist in the media table.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  await connection(); // request-time database read
  const { path: segments } = await ctx.params;
  const parts = segments ?? [];
  if (parts.length === 0 || parts.some((part) => part === ".." || part.includes("/"))) {
    return new Response("Not found", { status: 404 });
  }

  const stored = await getMediaFileByPath(`/api/media/${parts.join("/")}`);
  if (!stored) return new Response("Not found", { status: 404 });

  try {
    const jpeg = await sharp(Buffer.from(stored))
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toBuffer();

    return new Response(new Uint8Array(jpeg), {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch {
    return new Response("Unsupported image", { status: 415 });
  }
}
