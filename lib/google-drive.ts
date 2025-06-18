interface DriveUploadResult {
  fileId: string
  webViewLink: string
  directDownloadLink: string
  filename: string
  size?: string
  mimeType?: string
  method?: string
  timestamp: string
}

export async function uploadToGoogleDrive(dataUrl: string): Promise<DriveUploadResult> {
  try {
    console.log("📤 Starting JPG upload to Google Drive...")

    // Validate input
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      throw new Error("Invalid image data format")
    }

    // Try primary upload method first
    console.log("🔄 Trying primary upload method...")
    try {
      const response = await fetch("/api/upload-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      })

      const responseText = await response.text()
      const data = JSON.parse(responseText)

      if (response.ok && data.success) {
        console.log("✅ Primary upload successful")
        return data
      }

      console.warn("⚠️ Primary upload failed, trying alternative...")
    } catch (primaryError) {
      console.warn("⚠️ Primary upload error:", primaryError)
    }

    // Try alternative upload method
    console.log("🔄 Trying alternative upload method...")
    const response = await fetch("/api/upload-photo-simple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    })

    const responseText = await response.text()
    console.log("📡 Alternative upload response:", responseText.substring(0, 200))

    const data = JSON.parse(responseText)

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    if (!data.success || !data.fileId) {
      throw new Error("Upload failed: Invalid response from server")
    }

    console.log("✅ Alternative upload successful:", {
      filename: data.filename,
      method: data.method,
      fileId: data.fileId,
    })

    return data
  } catch (error) {
    console.error("❌ All upload methods failed:", error)

    if (error instanceof Error) {
      throw error
    }

    throw new Error("Unknown upload error occurred")
  }
}
