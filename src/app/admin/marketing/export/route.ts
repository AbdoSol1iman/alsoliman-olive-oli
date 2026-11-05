import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { parseRange } from "@/lib/date-range";
import { EXPORT_TYPES, marketingCsv, type MarketingExportType } from "@/lib/marketing";

const isExportType = (value: string): value is MarketingExportType =>
  EXPORT_TYPES.some((type) => type.value === value);

/** GET /admin/marketing/export?type=&preset=&from=&to= — CSV download (admin only). */
export async function GET(request: NextRequest) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const type = params.get("type") ?? "";
  if (!isExportType(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  const range = parseRange({
    preset: params.get("preset") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  });

  const { filename, csv } = await marketingCsv(type, range);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
