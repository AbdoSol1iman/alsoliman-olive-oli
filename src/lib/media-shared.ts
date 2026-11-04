/**
 * Media types + constants shared by server code (upload/storage) and client
 * components (media library, pickers). No server-only imports here.
 */

export const MEDIA_CATEGORIES = ["product", "banner", "brand", "general"] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export type MediaItem = {
  id: string;
  path: string;
  thumbPath: string | null;
  originalName: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  altAr: string;
  altEn: string;
  category: string;
  createdAt: string;
};
