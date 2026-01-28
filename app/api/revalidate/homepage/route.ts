export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET
  const provided = req.headers.get("x-revalidate-secret")

  if (secret && provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  // Revalidate homepage and the cached settings.
  revalidateTag("site-settings")
  revalidateTag("site-settings:homepage")
  revalidatePath("/")

  return NextResponse.json({ ok: true })
}

