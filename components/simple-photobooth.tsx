"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Camera, Download, Share2, ExternalLink } from "lucide-react"
import { uploadToGoogleDrive } from "@/lib/google-drive-service"

export default function SimplePhotoBooth() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [shareLinks, setShareLinks] = useState<{
    webViewLink: string
    directDownloadLink: string
  } | null>(null)

  // Initialize camera
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1080, height: 1920 },
    })
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }

  // Take photo
  const takePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")!
    ctx.drawImage(video, 0, 0)

    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.9)
    setPhotos((prev) => [...prev, photoDataUrl])
  }

  // Create photostrip
  const createPhotostrip = () => {
    if (photos.length !== 3) return null

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!

    canvas.width = 1080
    canvas.height = 1920

    // Background
    ctx.fillStyle = "#FEF3C7"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Title
    ctx.fillStyle = "#92400E"
    ctx.font = "bold 48px Arial"
    ctx.textAlign = "center"
    ctx.fillText("PhotoBooth Online", canvas.width / 2, 80)

    // Draw photos
    photos.forEach((photo, index) => {
      const img = new Image()
      img.src = photo
      img.onload = () => {
        const y = 120 + index * 580
        ctx.drawImage(img, 40, y, 1000, 560)
      }
    })

    return canvas.toDataURL("image/jpeg", 0.9)
  }

  // Upload and share
  const uploadAndShare = async () => {
    const photostrip = createPhotostrip()
    if (!photostrip) return

    setIsUploading(true)
    try {
      const result = await uploadToGoogleDrive(photostrip)
      setShareLinks(result)
    } catch (error) {
      alert("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  // Download from website
  const downloadFromWebsite = () => {
    const photostrip = createPhotostrip()
    if (!photostrip) return

    const link = document.createElement("a")
    link.href = photostrip
    link.download = `photostrip-${Date.now()}.jpg`
    link.click()
  }

  // Copy link to clipboard
  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link)
    alert("Link copied to clipboard!")
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-center mb-4">PhotoBooth Online</h2>

        {/* Camera */}
        <div className="mb-4">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" onLoadedMetadata={startCamera} />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="space-y-3">
          {photos.length < 3 && (
            <Button onClick={takePhoto} className="w-full">
              <Camera className="w-4 h-4 mr-2" />
              Take Photo {photos.length + 1}/3
            </Button>
          )}

          {photos.length === 3 && !shareLinks && (
            <>
              <Button onClick={uploadAndShare} disabled={isUploading} className="w-full">
                {isUploading ? "Uploading..." : "Save & Share"}
              </Button>

              <Button onClick={downloadFromWebsite} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download from Website
              </Button>
            </>
          )}

          {shareLinks && (
            <div className="space-y-2 p-4 bg-green-50 rounded-lg">
              <p className="font-medium text-green-800">✅ Photo saved successfully!</p>

              <Button
                onClick={() => window.open(shareLinks.webViewLink, "_blank")}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View in Google Drive
              </Button>

              <Button
                onClick={() => window.open(shareLinks.directDownloadLink, "_blank")}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download from Google Drive
              </Button>

              <Button onClick={() => copyLink(shareLinks.webViewLink)} variant="outline" size="sm" className="w-full">
                <Share2 className="w-4 h-4 mr-2" />
                Copy Share Link
              </Button>
            </div>
          )}
        </div>

        {/* Photo preview */}
        {photos.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Photos taken: {photos.length}/3</p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo || "/placeholder.svg"}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-20 object-cover rounded"
                />
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
