import { google } from "googleapis"
import { NextResponse } from "next/server"

// OAuth2 client untuk akun backend oreokungt@gmail.com
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
)

// Set credentials untuk akun backend
oauth2Client.setCredentials({
  access_token: process.env.BACKEND_GOOGLE_ACCESS_TOKEN,
  refresh_token: process.env.BACKEND_GOOGLE_REFRESH_TOKEN,
})

const drive = google.drive({ version: "v3", auth: oauth2Client })

export async function POST(request: Request) {
  try {
    const { dataUrl } = await request.json()

    if (!dataUrl) {
      return NextResponse.json({ error: "No image data provided" }, { status: 400 })
    }

    // Konversi data URL ke Buffer
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const randomId = Math.random().toString(36).substring(2, 8)
    const filename = `photostrip-${timestamp}-${randomId}.jpg`

    // Upload ke Google Drive
    const uploadResponse = await drive.files.create({
      requestBody: {
        name: filename,
        mimeType: "image/jpeg",
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || ""], // Optional: specify folder
      },
      media: {
        mimeType: "image/jpeg",
        body: buffer,
      },
      fields: "id, webViewLink, webContentLink",
    })

    const fileId = uploadResponse.data.id
    if (!fileId) {
      throw new Error("Failed to get file ID from Google Drive")
    }

    // Set file permissions to public (anyone with link can view)
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    })

    // Get the updated file info with public links
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: "id, webViewLink, webContentLink",
    })

    // Create direct download link
    const directDownloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`

    console.log("Upload successful:", fileInfo.data)

    return NextResponse.json({
      fileId: fileId,
      webViewLink: fileInfo.data.webViewLink,
      webContentLink: fileInfo.data.webContentLink,
      directDownloadLink: directDownloadLink,
    })
  } catch (error) {
    console.error("Error uploading to backend Google Drive:", error)

    // Handle token refresh if needed
    if (error instanceof Error && error.message.includes("invalid_grant")) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken()
        oauth2Client.setCredentials(credentials)

        // Retry the upload
        return POST(request)
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError)
        return NextResponse.json({ error: "Authentication failed. Please contact administrator." }, { status: 401 })
      }
    }

    return NextResponse.json(
      {
        error: "Failed to upload to Google Drive: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}
