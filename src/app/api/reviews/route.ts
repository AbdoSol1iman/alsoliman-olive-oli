import { NextResponse } from "next/server";
import { submitReview, verifyOrderPhone } from "@/lib/reviews";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const phone = String(formData.get("phone") || "");
    const authorName = String(formData.get("authorName") || "");
    const rating = Number(formData.get("rating") || 5);
    const body = String(formData.get("body") || "");
    const photo = formData.get("photo");
    const imageFile = photo instanceof File && photo.size > 0 ? photo : null;

    const result = await submitReview({
      phone,
      authorName,
      rating,
      body,
      imageFile,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, code: result.code, message: result.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/reviews] submit error", err);
    return NextResponse.json(
      { ok: false, code: "server_error", message: "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً." },
      { status: 500 },
    );
  }
}

/** Check phone endpoint for live feedback */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone") || "";
  if (!phone) {
    return NextResponse.json({ verified: false });
  }
  const check = await verifyOrderPhone(phone);
  return NextResponse.json(check);
}
