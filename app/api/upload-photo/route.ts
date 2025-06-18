import { google } from "googleapis"
import { NextResponse } from "next/server"
import { Readable } from "stream"

export async function POST(request: Request) {
  try {
    console.log("🚀 Starting photo upload with stream support...")

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

    console.log("🔍 Validating environment variables...")
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

    console.log("🔑 Private key validation:", {
      hasBeginMarker: privateKey.includes("-----BEGIN PRIVATE KEY-----"),
      hasEndMarker: privateKey.includes("-----END PRIVATE KEY-----"),
      length: privateKey.length,
    })

    // Create JWT client
    console.log("🔐 Creating JWT client...")
    const jwtClient = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL!,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    })

    // Authorize the client
    console.log("🔓 Authorizing JWT client...")
    await jwtClient.authorize()
    console.log("✅ JWT client authorized successfully")

    // Create Drive client
    const drive = google.drive({ version: "v3", auth: jwtClient })

    // Convert dataUrl to buffer
    console.log("🖼️ Processing image data...")
    const base64Data = dataUrl.replace(/^data:image\/[^;]+;base64,/, "")
    const imageBuffer = Buffer.from(base64Data, "base64")

    console.log(`📊 Image buffer size: ${imageBuffer.length} bytes`)

    if (imageBuffer.length === 0) {
      throw new Error("Invalid image data - empty buffer")
    }

    // FIXED: Convert buffer to readable stream
    console.log("🔄 Converting buffer to readable stream...")
    const imageStream = new Readable({
      read() {
        this.push(imageBuffer)
        this.push(null) // End of stream
      },
    })

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const filename = `photostrip-${timestamp}-${randomId}.jpg`

    console.log(`📝 Generated filename: ${filename}`)

    // Prepare file metadata
    const fileMetadata: any = {
      name: filename,
      description: "PhotoBooth Online - JPG Photostrip",
    }

    // Add parent folder if specified
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID]
      console.log(`📁 Target folder: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`)
    }

    console.log("☁️ Uploading stream to Google Drive...")

    // Upload using stream (FIXED)
    const uploadResponse = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: "image/jpeg",
        body: imageStream, // Use stream instead of buffer
      },
      fields: "id,name,webViewLink,size,mimeType,createdTime",
    })

    const fileId = uploadResponse.data.id
    if (!fileId) {
      throw new Error("Failed to get file ID from Google Drive response")
    }

    console.log(`✅ Stream upload successful: ${filename} (ID: ${fileId})`)

    // Set public permissions
    console.log("🔓 Setting public permissions...")
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    })

    console.log("✅ Public permissions set")

    // Generate links
    const webViewLink = uploadResponse.data.webViewLink!
    const directDownloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`

    console.log("🔗 Generated links:")
    console.log(`   View: ${webViewLink}`)
    console.log(`   Download: ${directDownloadLink}`)

    return NextResponse.json({
      success: true,
      fileId,
      webViewLink,
      directDownloadLink,
      filename: uploadResponse.data.name,
      size: uploadResponse.data.size,
      mimeType: uploadResponse.data.mimeType,
      createdTime: uploadResponse.data.createdTime,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Upload failed:", error)
    console.error("Error details:", {
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 5).join("\n"), // Limit stack trace
      response: error.response?.data,
    })

    let errorMessage = "Upload failed"

    if (error.message?.includes("invalid_grant")) {
      errorMessage = "Authentication failed - invalid service account credentials"
    } else if (error.message?.includes("insufficient permissions")) {
      errorMessage = "Insufficient Google Drive API permissions"
    } else if (error.message?.includes("quotaExceeded")) {
      errorMessage = "Google Drive quota exceeded"
    } else if (error.message?.includes("File not found")) {
      errorMessage = "Google Drive folder not found - check GOOGLE_DRIVE_FOLDER_ID"
    } else if (error.message?.includes("The user does not have sufficient permissions")) {
      errorMessage = "Service account lacks Google Drive permissions"
    } else if (error.message?.includes("pipe is not a function")) {
      errorMessage = "Stream processing error - using alternative upload method"
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error.response?.data || error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
