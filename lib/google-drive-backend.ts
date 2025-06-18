// Backend Google Drive service - menggunakan akun tetap oreokungt@gmail.com
interface DriveUploadResult {
  fileId: string
  webViewLink: string
  webContentLink: string
  directDownloadLink: string
}

export async function uploadToBackendDrive(dataUrl: string): Promise<DriveUploadResult> {
  try {
    console.log("Uploading to backend Google Drive...")

    const response = await fetch("/api/upload-to-backend-drive", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dataUrl }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to upload to Google Drive")
    }

    const data = await response.json()

    return {
      fileId: data.fileId,
      webViewLink: data.webViewLink,
      webContentLink: data.webContentLink,
      directDownloadLink: data.directDownloadLink,
    }
  } catch (error) {
    console.error("Error uploading to backend Google Drive:", error)
    throw new Error("Failed to upload to Google Drive: " + (error instanceof Error ? error.message : String(error)))
  }
}
