import { google } from "googleapis"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(request: Request) {
  try {
    // Get session untuk mendapatkan access token
    const session = await getServerSession(authOptions)

    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized - Please login first" }, { status: 401 })
    }

    const { dataUrl } = await request.json()

    if (!dataUrl) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 })
    }

    // Buat OAuth2 client dengan token dari session
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )

    // Set credentials dari session
    oauth2Client.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    })

    // Buat Drive client
    const drive = google.drive({ version: "v3", auth: oauth2Client })

    // Konversi data URL ke Buffer
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")

    // Unggah ke Google Drive
    const res = await drive.files.create({
      requestBody: {
        name: `photostrip-online-${new Date().toISOString().slice(0, 10)}-${Date.now()}.jpg`,
        mimeType: "image/jpeg",
        parents: [], // Akan disimpan di root folder
      },
      media: {
        mimeType: "image/jpeg",
        body: buffer,
      },
      fields: "id, webViewLink, webContentLink",
    })

    if (!res.data.id || !res.data.webViewLink) {
      return NextResponse.json({ error: "Failed to get file ID or webViewLink from Google Drive" }, { status: 500 })
    }

    console.log("Upload successful:", res.data)

    return NextResponse.json({
      fileId: res.data.id,
      webViewLink: res.data.webViewLink,
      webContentLink: res.data.webContentLink,
    })
  } catch (error) {
    console.error("Error uploading to Google Drive:", error)

    // Handle specific Google API errors
    if (error instanceof Error && error.message.includes("invalid_grant")) {
      return NextResponse.json({ error: "Token expired. Please login again." }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: "Failed to upload to Google Drive: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}
