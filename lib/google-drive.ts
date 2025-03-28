// Implementasi Google Drive API yang sebenarnya
import { google } from "googleapis"

interface DriveUploadResult {
  fileId: string
  webViewLink: string
}

// Buat OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
)

// Tetapkan kredensial (token akses dan refresh token)
oauth2Client.setCredentials({
  access_token: process.env.GOOGLE_ACCESS_TOKEN,
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

// Buat Drive client
const drive = google.drive({ version: "v3", auth: oauth2Client })

export async function uploadToGoogleDrive(dataUrl: string): Promise<DriveUploadResult> {
  try {
    console.log("Uploading to Google Drive...")

    // Konversi data URL ke Blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    // Konversi Blob ke Buffer
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Unggah ke Google Drive
    const res = await drive.files.create({
      requestBody: {
        name: `photostrip-jawa-${new Date().toISOString().slice(0, 10)}.jpg`,
        mimeType: "image/jpeg",
      },
      media: {
        mimeType: "image/jpeg",
        body: buffer,
      },
      fields: "id, webViewLink",
    })

    if (!res.data.id || !res.data.webViewLink) {
      throw new Error("Failed to get file ID or webViewLink from Google Drive")
    }

    console.log("Upload successful:", res.data)

    return {
      fileId: res.data.id,
      webViewLink: res.data.webViewLink,
    }
  } catch (error) {
    console.error("Error uploading to Google Drive:", error)
    throw new Error("Failed to upload to Google Drive: " + (error instanceof Error ? error.message : String(error)))
  }
}

