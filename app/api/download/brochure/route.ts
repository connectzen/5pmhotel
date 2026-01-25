export const runtime = "nodejs"
export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET() {
  try {
    // Get the brochure URL from Firestore
    const brochureDoc = await getDoc(doc(db, "hotelSettings", "brochure"))
    
    if (!brochureDoc.exists()) {
      return NextResponse.json({ error: "Brochure not found" }, { status: 404 })
    }
    
    const data = brochureDoc.data()
    if (!data.url) {
      return NextResponse.json({ error: "Brochure URL not found" }, { status: 404 })
    }
    
    // Fetch the file from the URL
    const response = await fetch(data.url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch brochure" }, { status: response.status })
    }
    
    // Get the file as a blob
    const blob = await response.blob()
    
    // Determine content type from response or default to PDF
    const contentType = response.headers.get("content-type") || "application/pdf"
    
    // Return the file with proper headers for download
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": 'attachment; filename="5PM-Hotel-Brochure.pdf"',
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Error downloading brochure:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

