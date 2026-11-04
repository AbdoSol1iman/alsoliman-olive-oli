import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { ordersToCsv } from "@/lib/orders";

/** GET /admin/orders/export?status=&q=&from=&to= — CSV download (admin only). */
export async function GET(request: NextRequest) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const csv = ordersToCsv({
    status: params.get("status") ?? "",
    q: params.get("q") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
