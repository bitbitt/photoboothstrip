import { google } from "googleapis"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    console.log("🚀 Starting simple upload method...")

    // Get and validate request data
    const { dataUrl } = await request.json()
    if (!dataUrl?.startsWith("data:image/")) {
      console.error("❌ Invalid image data format")
      return NextResponse.json({ error: "Invalid image data format" }, { status: 400 })
    }

    // Validate environment variables
    const requiredVars = [
      "GOOGLE_PROJECT_ID",
      "GOOGLE_PRIVATE_KEY_ID",
      "GOOGLE_PRIVATE_KEY",
      "GOOGLE_CLIENT_EMAIL",
      "GOOGLE_CLIENT_ID",
    ]

    for (const envVar of requiredVars) {
      if (!process.env[envVar]) {
        console.error(`❌ Missing: ${envVar}`)
        return NextResponse.json({ error: `Missing environment variable: ${envVar}` }, { status: 500 })
      }
    }

    // Clean private key
    let privateKey = process.env.GOOGLE_PRIVATE_KEY!
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n")
    }
    privateKey = privateKey.replace(/^"/, "").replace(/"$/, "")

    // Create JWT client
    const jwtClient = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL!,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    })

    await jwtClient.authorize()
    const drive = google.drive({ version: "v3", auth: jwtClient })

    // Convert dataUrl to base64
    const base64Data = dataUrl.replace(/^data:image\/[^;]+;base64,/, "")
    console.log(`📊 Base64 data length: ${base64Data.length}`)

    // Generate filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const filename = `photostrip-${timestamp}-${randomId}.jpg`

    console.log("☁️ Using simple upload method...")

    // Method 1: Try simple upload with base64
    try {
      const uploadResponse = await drive.files.create({
        requestBody: {
          name: filename,
          description: "PhotoBooth Online - JPG Photostrip",
          parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined,
        },
        media: {
          mimeType: "image/jpeg",
          body: base64Data,
        },
        fields: "id,name,webViewLink,size,mimeType",
      })

      const fileId = uploadResponse.data.id!

      // Set public permissions
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      })

      const webViewLink = uploadResponse.data.webViewLink!
      const directDownloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`

      console.log("✅ Simple upload successful")

      return NextResponse.json({
        success: true,
        fileId,
        webViewLink,
        directDownloadLink,
        filename: uploadResponse.data.name,
        size: uploadResponse.data.size,
        mimeType: uploadResponse.data.mimeType,
        method: "simple",
        timestamp: new Date().toISOString(),
      })
    } catch (simpleError: any) {
      console.error("❌ Simple upload failed:", simpleError.message)

      // Method 2: Try with fetch-based upload
      console.log("🔄 Trying fetch-based upload...")

      const buffer = Buffer.from(base64Data, "base64")

      // Create metadata
      const metadata = {
        name: filename,
        description: "PhotoBooth Online - JPG Photostrip",
        parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined,
      }

      // Get access token
      const accessToken = await jwtClient.getAccessToken()

      // Upload using fetch
      const boundary = "-------314159265358979323846"
      const delimiter = `\r\n--${boundary}\r\n`
      const close_delim = `\r\n--${boundary}--`

      const multipartRequestBody =
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: image/jpeg\r\n\r\n" +
        buffer.toString("binary") +
        close_delim

      const fetchResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": `multipart/related; boundary="${boundary}"`,
        },
        body: multipartRequestBody,
      })

      if (!fetchResponse.ok) {
        throw new Error(`Fetch upload failed: ${fetchResponse.status} ${fetchResponse.statusText}`)
      }

      const uploadData = await fetchResponse.json()
      const fileId = uploadData.id

      // Set public permissions
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      })

      const webViewLink = `https://drive.google.com/file/d/${fileId}/view`
      const directDownloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`

      console.log("✅ Fetch upload successful")

      return NextResponse.json({
        success: true,
        fileId,
        webViewLink,
        directDownloadLink,
        filename: uploadData.name,
        size: uploadData.size,
        mimeType: uploadData.mimeType,
        method: "fetch",
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error: any) {
    console.error("❌ All upload methods failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Upload failed",
        details: error.response?.data || null,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
