import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSettingsAdmin } from "@/lib/settings";
import {
  AnnouncementSettings,
  ContactSettings,
  FlagsSettings,
  PaymentSettings,
  SeoSettings,
  SettingsForm,
  ShippingSettings,
  StoreSettings,
  TaxSettings,
} from "@/components/admin/SettingsForms";

export const instant = false;

export const metadata = { title: "الإعدادات · Admin" };

export default async function AdminSettingsPage() {
  await connection(); // admin renders per-request (session cookie)
  await requireAdmin();
  const settings = await getSettingsAdmin();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.7rem] text-forest">الإعدادات</h1>
        <p className="mt-1 text-[0.82rem] text-ink-muted">
          إعدادات المتجر الكاملة — كل تعديل يظهر في الموقع فورًا بدون إعادة نشر.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <StoreSettings initial={settings.store} />
        <ContactSettings initial={settings.contact} />
      </div>

      <ShippingSettings initial={settings.shipping} />

      <div className="grid gap-5 xl:grid-cols-2">
        <TaxSettings initial={settings.tax} />
        <PaymentSettings initial={settings.payments} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SeoSettings initial={settings.seo} />
        <FlagsSettings initial={settings.flags} />
      </div>

      <AnnouncementSettings initial={settings.announcements} />
    </div>
  );
}
