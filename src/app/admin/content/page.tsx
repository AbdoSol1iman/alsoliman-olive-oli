import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getContentAdmin } from "@/lib/content";
import { ContentSections, type EditorSection } from "@/components/admin/ContentEditor";

export const instant = false;

export const metadata = { title: "محتوى الموقع · Admin" };

export default async function AdminContentPage() {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const content = getContentAdmin();

  const sections: EditorSection[] = [
    {
      key: "faq",
      title: "الأسئلة الشائعة",
      description: "أسئلة وأجوبة تظهر في صفحات الشحن والأسئلة الشائعة.",
      initial: content.faq,
    },
    {
      key: "footer",
      title: "الفوتر",
      description: "نصوص أسفل كل صفحات الموقع — الفواصل وعناوين الأعمدة.",
      initial: content.footer,
    },
    {
      key: "about",
      title: "صفحة «عن العلامة»",
      initial: content.about,
    },
    {
      key: "olive",
      title: "صفحة «عن زيت الزيتون»",
      initial: content.olive,
    },
    {
      key: "shippingPage",
      title: "صفحة الشحن والإرجاع",
      initial: content.shippingPage,
    },
    {
      key: "privacyPage",
      title: "سياسة الخصوصية",
      initial: content.privacyPage,
    },
    {
      key: "termsPage",
      title: "الشروط والأحكام",
      initial: content.termsPage,
    },
    {
      key: "contact",
      title: "صفحة تواصل معنا",
      initial: content.contact,
    },
    {
      key: "whatsapp",
      title: "نصوص واتساب",
      description: "رسالة واتساب الافتراضية عند الضغط على أزرار الواتساب.",
      initial: content.whatsapp,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.7rem] text-forest">محتوى الموقع</h1>
        <p className="mt-1 text-[0.82rem] text-ink-muted">
          نصوص الصفحات الثابتة (الفوتر، الشحن، الخصوصية، الشروط، الأسئلة الشائعة) — بالعربية والإنجليزية.
        </p>
      </div>
      <ContentSections sections={sections} />
    </div>
  );
}
