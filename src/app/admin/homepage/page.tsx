import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getContentAdmin } from "@/lib/content";
import { getStoreProducts } from "@/lib/catalog";
import { ContentSections, type EditorSection } from "@/components/admin/ContentEditor";

export const instant = false;

export const metadata = { title: "محرر الصفحة الرئيسية · Admin" };

export default async function AdminHomepagePage() {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const [content, products] = await Promise.all([
    getContentAdmin(),
    getStoreProducts(),
  ]);

  const sections: EditorSection[] = [
    {
      key: "hero",
      title: "الواجهة (Hero)",
      description: "العنوان الرئيسي وزرّا الإجراء ونقاط الثقة أعلى الصفحة.",
      initial: content.hero,
    },
    {
      key: "media",
      title: "صور الرئيسية",
      description: "صور الواجهة والقصة والمزايا — اختر من مكتبة الوسائط أو ارفع صورة جديدة.",
      initial: content.media,
      bilingual: false,
    },
    {
      key: "offers",
      title: "العروض",
      description: "بطاقات العروض التي تظهر أسفل قسم المنتجات — فعّل خيار «قائمة منسدلة للأحجام» لإتاحة اختيار الحجم وتفعيل زر أضف للسلة مباشرة.",
      initial: content.offers,
      itemTemplate: {
        title: "",
        subtitle: "",
        image: "",
        href: "",
        cta: "أضف للسلة",
        hasDropdown: false,
        productId: "",
        enabled: true,
      },
    },
    {
      key: "featured",
      title: "قسم المنتجات المميزة",
      initial: content.featured,
    },
    {
      key: "story",
      title: "قصتنا",
      initial: content.story,
      mediaImage: {
        field: "storyImage",
        label: "صورة قسم القصة",
        value: content.media.storyImage,
        hint: "تظهر بجانب نص القصة — عند حذفها يعود الشكل الافتراضي للقسم.",
      },
    },
    {
      key: "why",
      title: "لماذا آل سليمان",
      initial: content.why,
    },
    {
      key: "culinary",
      title: "في المطبخ",
      initial: content.culinary,
    },
    {
      key: "reviews",
      title: "آراء العملاء",
      initial: content.reviews,
    },
    {
      key: "newsletter",
      title: "النشرة البريدية",
      initial: content.newsletter,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.7rem] text-forest">محرر الصفحة الرئيسية</h1>
        <p className="mt-1 text-[0.82rem] text-ink-muted">
          عدّل نصوص وأقسام الصفحة الرئيسية بالعربية والإنجليزية — كل تعديل يظهر في الموقع فورًا بدون إعادة نشر.
        </p>
      </div>
      <ContentSections sections={sections} products={products} />
    </div>
  );
}
