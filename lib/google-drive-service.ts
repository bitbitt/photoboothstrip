// Simple Google Drive service using service account
interface DriveUploadResult {
  fileId: string
  webViewLink: string
  directDownloadLink: string
}

export async function uploadToGoogleDrive(dataUrl: string): Promise<DriveUploadResult> {
  const response = await fetch("/api/upload-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  })

  if (!response.ok) {
    throw new Error("Upload failed")
  }

  return response.json()
}
