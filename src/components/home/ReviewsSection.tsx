"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Check, Sparkle } from "@/components/ui/Icons";
import { formatDate } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/products";
import type { PublicReview } from "@/lib/reviews";

export function ReviewsSection({
  locale,
  dict,
  reviews = [],
}: {
  locale: Locale;
  dict: Dictionary;
  reviews?: PublicReview[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <section className="paper border-t border-gold/15 py-20 md:py-24" aria-labelledby="reviews-title">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">{dict.reviews.eyebrow}</p>
          <h2 id="reviews-title" className="mt-3 text-[clamp(1.7rem,3.6vw,2.6rem)] text-forest">
            {dict.reviews.title}
          </h2>
          <p className="mt-2 text-[0.88rem] text-ink-muted">
            {locale === "ar"
              ? "تقييمات موثقة من عملاء استلموا وجرّبوا زيت زيتون آل سليمان."
              : "Verified reviews from customers who tried our olive oil."}
          </p>
        </div>

        {reviews.length === 0 ? (
          /* Empty state */
          <div className="mx-auto mt-12 max-w-xl border border-gold/25 bg-ivory px-8 py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-gold/40 text-gold">
              <Sparkle size={20} />
            </div>
            <p className="mt-5 text-[0.88rem] leading-8 text-ink-muted">{dict.reviews.empty}</p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex h-11 items-center justify-center rounded-xs bg-forest px-6 text-[0.82rem] font-medium text-ivory transition-colors hover:bg-forest/90"
              >
                {dict.reviews.writeReview || (locale === "ar" ? "أضف تقييمك" : "Write a review")}
              </button>
              <ButtonLink href={`/${locale}/shop`} variant="outline" size="sm">
                {dict.reviews.cta}
              </ButtonLink>
            </div>
          </div>
        ) : (
          /* Reviews Grid */
          <div className="mt-14 space-y-10">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <article
                  key={r.id}
                  className="flex h-full flex-col justify-between border border-gold/20 bg-ivory p-6 transition-all duration-300 hover:border-forest/40 hover:shadow-xs"
                >
                  <div className="space-y-4">
                    {/* Stars & Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-0.5 text-amber-500" dir="ltr">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-base ${
                              i < r.rating ? "text-amber-500" : "text-neutral-300"
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>

                      {r.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-xs bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-medium text-emerald-800">
                          <Check size={11} className="text-emerald-600" />
                          <span>{dict.reviews.verifiedBuyer || (locale === "ar" ? "مشتري موثق" : "Verified Buyer")}</span>
                        </span>
                      ) : null}
                    </div>

                    {/* Review text */}
                    <p className="text-[0.88rem] leading-7 text-charcoal/90">
                      &ldquo;{r.body}&rdquo;
                    </p>

                    {/* Attached Photo */}
                    {r.imageUrl ? (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedImage(r.imageUrl)}
                          className="group relative block size-20 overflow-hidden border border-gold/30 bg-cream/40 transition-transform hover:scale-105"
                          title={locale === "ar" ? "انقر لتكبير الصورة" : "Click to enlarge"}
                        >
                          <Image
                            src={r.imageUrl}
                            alt="صورة تجربة المنتج"
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 grid place-items-center bg-forest/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="text-[0.65rem] text-ivory">
                              {locale === "ar" ? "تكبير" : "Zoom"}
                            </span>
                          </div>
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Author & Date */}
                  <div className="mt-6 flex items-center justify-between border-t border-gold/15 pt-4 text-[0.78rem]">
                    <span className="font-medium text-forest">{r.authorName}</span>
                    <span className="text-ink-muted">{formatDate(r.createdAt, locale)}</span>
                  </div>
                </article>
              ))}
            </div>

            {/* Write a review button */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex h-11 items-center justify-center rounded-xs border border-forest/30 bg-ivory px-7 text-[0.84rem] font-medium text-forest transition-colors hover:border-forest hover:bg-cream"
              >
                {dict.reviews.writeReview || (locale === "ar" ? "شاركنا رأيك في الزيت" : "Write a review")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Write Review Modal */}
      {modalOpen ? (
        <WriteReviewModal
          locale={locale}
          dict={dict}
          onClose={() => setModalOpen(false)}
        />
      ) : null}

      {/* Image Lightbox */}
      {selectedImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xs bg-ivory p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="صورة التقييم مكبرة"
              className="max-h-[80vh] max-w-[85vw] object-contain"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="rounded-xs bg-forest px-4 py-1.5 text-[0.8rem] text-ivory hover:bg-forest/90"
              >
                {locale === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WriteReviewModal({
  locale,
  dict,
  onClose,
}: {
  locale: Locale;
  dict: Dictionary;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [phoneFound, setPhoneFound] = useState<boolean | null>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Live phone check
  const checkPhone = async (val: string) => {
    const clean = val.replace(/[\s-]/g, "");
    if (clean.length >= 11) {
      setVerifyingPhone(true);
      try {
        const res = await fetch(`/api/reviews?phone=${encodeURIComponent(clean)}`);
        const data = await res.json();
        setPhoneChecked(true);
        if (data.verified) {
          setPhoneFound(true);
          setVerifiedName(data.customerName || null);
          if (!authorName && data.customerName) {
            setAuthorName(data.customerName);
          }
        } else {
          setPhoneFound(false);
          setVerifiedName(null);
        }
      } catch {
        // silent
      } finally {
        setVerifyingPhone(false);
      }
    } else {
      setPhoneChecked(false);
      setPhoneFound(null);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      alert(locale === "ar" ? "حجم الصورة كبير جداً، الحد الأقصى 6 ميجابايت." : "Image is too large (max 6MB).");
      return;
    }
    setPhoto(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const removePhoto = () => {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!phone.trim()) {
      setErrorMsg(locale === "ar" ? "يرجى إدخال رقم الهاتف." : "Please enter your phone number.");
      return;
    }

    if (!body.trim()) {
      setErrorMsg(locale === "ar" ? "يرجى كتابة تفاصيل تقييمك." : "Please write your review.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("phone", phone);
      formData.append("authorName", authorName || verifiedName || "");
      formData.append("rating", String(rating));
      formData.append("body", body);
      if (photo) {
        formData.append("photo", photo);
      }

      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          setErrorMsg(
            data.message ||
              dict.reviews.errorNoOrder ||
              (locale === "ar"
                ? "عذراً، لم نجد طلباً مسجلاً بهذا الرقم."
                : "No verified order was found with this phone number."),
          );
          return;
        }

        setSubmitted(true);
      } catch {
        setErrorMsg(
          dict.reviews.errorGeneric ||
            (locale === "ar" ? "حدث خطأ في الاتصال، حاول ثانية." : "Network error, please try again."),
        );
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto border border-gold/30 bg-ivory p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={dict.common.close}
          className="absolute top-4 end-4 grid size-8 place-items-center rounded-full text-ink-muted hover:bg-cream hover:text-forest"
        >
          ✕
        </button>

        {submitted ? (
          /* Success Screen */
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <Check size={28} />
            </div>
            <h3 className="text-[1.25rem] font-serif text-forest">
              {dict.reviews.successTitle || (locale === "ar" ? "شكراً لمشاركتك!" : "Thank you!")}
            </h3>
            <p className="text-[0.88rem] leading-7 text-ink-muted max-w-md mx-auto">
              {dict.reviews.successMessage ||
                (locale === "ar"
                  ? "تم استلام تقييمك بنجاح، وسيظهر على الموقع بعد مراجعته من الإدارة."
                  : "Your review was received and will be published once approved.")}
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xs bg-forest px-7 py-2.5 text-[0.84rem] font-medium text-ivory hover:bg-forest/90"
              >
                {locale === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        ) : (
          /* Review Form */
          <div>
            <div className="mb-6">
              <p className="eyebrow">{dict.reviews.eyebrow}</p>
              <h3 className="mt-1 text-[1.3rem] font-serif text-forest">
                {dict.reviews.modalTitle || (locale === "ar" ? "شاركنا رأيك في تجربتك" : "Share your experience")}
              </h3>
              <p className="mt-1 text-[0.8rem] text-ink-muted">
                {dict.reviews.modalSubtitle ||
                  (locale === "ar"
                    ? "التقييمات موثقة وتعتمد على عملاء حقيقيين أتموا طلباتهم."
                    : "Verified reviews from real customers who placed an order.")}
              </p>
            </div>

            {errorMsg ? (
              <div className="mb-5 rounded-xs border border-red-200 bg-red-50 p-3.5 text-[0.82rem] leading-6 text-red-900">
                {errorMsg}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Phone number verification */}
              <div>
                <label htmlFor="rev-phone" className="mb-1 block text-[0.78rem] font-medium text-forest">
                  {dict.reviews.phoneLabel || (locale === "ar" ? "رقم الهاتف المستخدم في الطلب" : "Order phone number")}{" "}
                  <span className="text-gold">*</span>
                </label>
                <div className="relative">
                  <input
                    id="rev-phone"
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      checkPhone(e.target.value);
                    }}
                    placeholder={dict.reviews.phonePlaceholder || "01xxxxxxxxx"}
                    className="h-11 w-full border border-forest/20 bg-ivory px-3 text-[0.86rem] text-charcoal outline-none focus:border-gold"
                    required
                  />
                  {verifyingPhone ? (
                    <span className="absolute end-3 top-3 text-[0.7rem] text-ink-muted">
                      {locale === "ar" ? "جارٍ التحقق…" : "Checking…"}
                    </span>
                  ) : phoneChecked && phoneFound ? (
                    <span className="absolute end-3 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.68rem] text-emerald-800">
                      <Check size={11} /> {locale === "ar" ? "طلب مؤكد" : "Verified order"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[0.7rem] text-ink-muted">
                  {dict.reviews.phoneHint ||
                    (locale === "ar"
                      ? "يُستخدم للتحقق من وجود طلب سابق لتأكيد المصداقية"
                      : "Used to verify your previous order")}
                </p>
                {phoneChecked && phoneFound === false ? (
                  <p className="mt-1 text-[0.72rem] text-red-800">
                    {locale === "ar"
                      ? "لم نجد طلباً مسجلاً بهذا الرقم — تأكد من كتابة الرقم الذي استخدمته عند الشراء."
                      : "No order found with this phone number."}
                  </p>
                ) : null}
              </div>

              {/* Name */}
              <div>
                <label htmlFor="rev-name" className="mb-1 block text-[0.78rem] font-medium text-forest">
                  {dict.reviews.nameLabel || (locale === "ar" ? "الاسم" : "Your name")}
                </label>
                <input
                  id="rev-name"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder={dict.reviews.namePlaceholder || (locale === "ar" ? "اسمك الكريم" : "Your name")}
                  className="h-11 w-full border border-forest/20 bg-ivory px-3 text-[0.86rem] text-charcoal outline-none focus:border-gold"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="mb-1 block text-[0.78rem] font-medium text-forest">
                  {dict.reviews.ratingLabel || (locale === "ar" ? "تقييمك" : "Rating")}{" "}
                  <span className="text-gold">*</span>
                </label>
                <div className="flex items-center gap-1" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-2xl transition-transform hover:scale-115 focus:outline-hidden"
                      aria-label={`${star} stars`}
                    >
                      <span
                        className={
                          (hoverRating || rating) >= star
                            ? "text-amber-500"
                            : "text-neutral-300"
                        }
                      >
                        ★
                      </span>
                    </button>
                  ))}
                  <span className="ms-2 text-[0.82rem] font-medium text-forest">
                    {rating} / 5
                  </span>
                </div>
              </div>

              {/* Review text */}
              <div>
                <label htmlFor="rev-body" className="mb-1 block text-[0.78rem] font-medium text-forest">
                  {dict.reviews.bodyLabel || (locale === "ar" ? "تفاصيل تقييمك" : "Your review")}{" "}
                  <span className="text-gold">*</span>
                </label>
                <textarea
                  id="rev-body"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={
                    dict.reviews.bodyPlaceholder ||
                    (locale === "ar"
                      ? "اكتب رأيك وتجربتك في جودة الزيت والتوصيل..."
                      : "Share your thoughts about our oil and service...")
                  }
                  className="w-full resize-y border border-forest/20 bg-ivory p-3 text-[0.86rem] leading-6 text-charcoal outline-none focus:border-gold"
                  required
                />
              </div>

              {/* One Photo Upload */}
              <div>
                <label className="mb-1 block text-[0.78rem] font-medium text-forest">
                  {dict.reviews.photoLabel || (locale === "ar" ? "أضف صورة واحدة (اختياري)" : "Add 1 photo (optional)")}
                </label>
                {photoPreview ? (
                  <div className="flex items-center gap-3 rounded-xs border border-gold/30 bg-cream/40 p-2.5">
                    <div className="relative size-16 shrink-0 overflow-hidden border border-gold/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="معاينة الصورة" className="size-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[0.78rem] text-charcoal">{photo?.name}</p>
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="mt-1 text-[0.72rem] text-red-700 underline hover:text-red-900"
                      >
                        {locale === "ar" ? "حذف الصورة" : "Remove photo"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xs border border-dashed border-forest/30 bg-cream/20 px-4 py-4 text-center transition-colors hover:border-gold hover:bg-cream/40">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoSelect}
                      className="sr-only"
                    />
                    <svg className="size-6 text-forest/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="mt-1.5 text-[0.78rem] font-medium text-forest">
                      {dict.reviews.photoLabel || (locale === "ar" ? "اختر صورة للمنتج" : "Select a photo")}
                    </span>
                    <span className="text-[0.68rem] text-ink-muted">
                      {dict.reviews.photoHint || "JPG, PNG, WebP (Max 6MB)"}
                    </span>
                  </label>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex h-11 w-full items-center justify-center rounded-xs bg-forest text-[0.86rem] font-medium text-ivory transition-colors hover:bg-forest/90 disabled:opacity-60"
                >
                  {isPending
                    ? dict.reviews.submitting || (locale === "ar" ? "جارٍ الإرسال…" : "Submitting…")
                    : dict.reviews.submit || (locale === "ar" ? "إرسال التقييم" : "Submit Review")}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
