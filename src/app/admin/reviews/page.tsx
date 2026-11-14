import { requireAdmin } from "@/lib/auth";
import { listReviewsForAdmin } from "@/lib/reviews";
import { connection } from "next/server";
import { AdminReviewsClient } from "./AdminReviewsClient";

export const instant = false;
export const metadata = { title: "التقييمات · Admin" };

export default async function AdminReviewsPage() {
  await connection();
  await requireAdmin();
  const reviews = await listReviewsForAdmin();
  return <AdminReviewsClient initialReviews={reviews} />;
}
