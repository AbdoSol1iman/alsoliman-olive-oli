"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { updateReviewStatusAction, deleteReviewAction } from "@/app/actions/reviews";
import { formatDate } from "@/lib/format";
import type { ReviewRecord, ReviewStatus } from "@/lib/reviews";
import { AdminCard, EmptyState } from "@/components/admin/ui";

export function AdminReviewsClient({
  initialReviews,
}: {
  initialReviews: ReviewRecord[];
}) {
  const [reviews, setReviews] = useState<ReviewRecord[]>(initialReviews);
  const [filter, setFilter] = useState<"all" | ReviewStatus>("all");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingCount = reviews.filter((r) => r.status === "pending").length;
  const approvedCount = reviews.filter((r) => r.status === "approved").length;
  const rejectedCount = reviews.filter((r) => r.status === "rejected").length;

  const filtered = reviews.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const handleStatusChange = (id: string, newStatus: ReviewStatus) => {
    setProcessingId(id);
    startTransition(async () => {
      const res = await updateReviewStatusAction(id, newStatus);
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
        );
      }
      setProcessingId(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التقييم نهائياً؟")) return;
    setProcessingId(id);
    startTransition(async () => {
      const res = await deleteReviewAction(id);
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
      }
      setProcessingId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] font-serif text-forest">التقييمات</h1>
          <p className="mt-1 text-[0.82rem] text-ink-muted">
            إدارة ومراجعة تقييمات العملاء المؤكدة عبر أرقام الطلبات، واعتماد نشرها على الموقع.
          </p>
        </div>

        {/* Tab filters */}
        <div className="flex flex-wrap items-center gap-1.5 border border-gold/20 bg-ivory p-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xs px-3 py-1.5 text-[0.78rem] font-medium transition-colors ${
              filter === "all"
                ? "bg-forest text-ivory"
                : "text-ink-muted hover:bg-cream hover:text-forest"
            }`}
          >
            الكل ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-[0.78rem] font-medium transition-colors ${
              filter === "pending"
                ? "bg-amber-600 text-ivory"
                : "text-ink-muted hover:bg-cream hover:text-amber-700"
            }`}
          >
            قيد المراجعة ({pendingCount})
            {pendingCount > 0 ? (
              <span className="size-2 rounded-full bg-amber-400" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setFilter("approved")}
            className={`rounded-xs px-3 py-1.5 text-[0.78rem] font-medium transition-colors ${
              filter === "approved"
                ? "bg-emerald-700 text-ivory"
                : "text-ink-muted hover:bg-cream hover:text-emerald-700"
            }`}
          >
            مقبولة ومنشورة ({approvedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("rejected")}
            className={`rounded-xs px-3 py-1.5 text-[0.78rem] font-medium transition-colors ${
              filter === "rejected"
                ? "bg-neutral-600 text-ivory"
                : "text-ink-muted hover:bg-cream hover:text-neutral-700"
            }`}
          >
            مرفوضة ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Reviews list */}
      {filtered.length === 0 ? (
        <EmptyState
          title={
            filter === "pending"
              ? "لا توجد تقييمات معلقة"
              : filter === "approved"
                ? "لا توجد تقييمات منشورة بعد"
                : "لا توجد تقييمات"
          }
          body="تقييمات العملاء الذين أتموا طلباتهم ستظهر هنا للمراجعة والاعتماد."
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map((review) => {
            const isRowProcessing = isPending && processingId === review.id;
            const waNumber = review.phone.replace(/\D/g, "");

            return (
              <AdminCard
                key={review.id}
                className={`transition-opacity ${isRowProcessing ? "opacity-50" : ""}`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  {/* Left: Author & Content */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Rating stars */}
                      <div className="flex items-center gap-0.5 text-amber-500" dir="ltr">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-base ${
                              i < review.rating ? "text-amber-500" : "text-neutral-300"
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>

                      {/* Author */}
                      <span className="font-medium text-forest">{review.author_name}</span>

                      {/* Phone */}
                      <a
                        href={`https://wa.me/2${waNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tnum text-[0.78rem] text-ink-muted underline-offset-2 hover:text-forest hover:underline"
                        dir="ltr"
                      >
                        {review.phone}
                      </a>

                      {/* Order verification badge */}
                      {review.verified_order_reference ? (
                        <Link
                          href={`/admin/orders/${encodeURIComponent(review.verified_order_reference)}`}
                          className="inline-flex items-center gap-1 rounded-xs bg-emerald-50 px-2 py-0.5 text-[0.72rem] font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
                        >
                          <svg
                            className="size-3 text-emerald-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>طلب مؤكد: {review.verified_order_reference}</span>
                        </Link>
                      ) : null}

                      {/* Status badge */}
                      <span
                        className={`rounded-xs px-2 py-0.5 text-[0.7rem] font-medium ${
                          review.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : review.status === "rejected"
                              ? "bg-neutral-100 text-neutral-600"
                              : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {review.status === "approved"
                          ? "منشور على الموقع"
                          : review.status === "rejected"
                            ? "مرفوض"
                            : "قيد المراجعة"}
                      </span>

                      {/* Date */}
                      <span className="text-[0.72rem] text-ink-muted">
                        {formatDate(review.created_at)}
                      </span>
                    </div>

                    {/* Review body */}
                    <p className="text-[0.88rem] leading-7 text-charcoal">
                      {review.body}
                    </p>

                    {/* Attached photo thumbnail */}
                    {review.image_url ? (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(review.image_url)}
                          className="group relative block size-20 overflow-hidden border border-gold/30 bg-cream/40 transition-transform hover:scale-105"
                          title="انقر لتكبير الصورة"
                        >
                          <Image
                            src={review.image_url}
                            alt="صورة مرفقة مع التقييم"
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 grid place-items-center bg-forest/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="text-[0.65rem] text-ivory">تكبير</span>
                          </div>
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                    {review.status !== "approved" ? (
                      <button
                        type="button"
                        disabled={isRowProcessing}
                        onClick={() => handleStatusChange(review.id, "approved")}
                        className="inline-flex items-center gap-1.5 rounded-xs bg-emerald-700 px-3 py-1.5 text-[0.78rem] font-medium text-ivory transition-colors hover:bg-emerald-800 disabled:opacity-50"
                      >
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>قبول ونشر</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isRowProcessing}
                        onClick={() => handleStatusChange(review.id, "pending")}
                        className="rounded-xs border border-amber-600/40 bg-amber-50 px-3 py-1.5 text-[0.78rem] font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
                      >
                        إلغاء النشر
                      </button>
                    )}

                    {review.status !== "rejected" ? (
                      <button
                        type="button"
                        disabled={isRowProcessing}
                        onClick={() => handleStatusChange(review.id, "rejected")}
                        className="rounded-xs border border-neutral-300 px-3 py-1.5 text-[0.78rem] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50"
                      >
                        رفض
                      </button>
                    ) : null}

                    <button
                      type="button"
                      disabled={isRowProcessing}
                      onClick={() => handleDelete(review.id)}
                      className="rounded-xs border border-red-200 px-2.5 py-1.5 text-[0.78rem] text-red-700 transition-colors hover:bg-red-50 hover:text-red-900 disabled:opacity-50"
                      title="حذف نهائي"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      {/* Lightbox photo modal */}
      {selectedPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xs bg-ivory p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-auto max-h-[80vh] w-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto}
                alt="معاينة صورة التقييم"
                className="max-h-[80vh] max-w-[85vw] object-contain"
              />
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="rounded-xs bg-forest px-4 py-1.5 text-[0.8rem] text-ivory hover:bg-forest/90"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
