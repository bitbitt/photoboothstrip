"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Camera, Download, Share2, ExternalLink, RefreshCw, ImageIcon, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { uploadToGoogleDrive } from "@/lib/google-drive"
import { convertToJpg, getImageInfo } from "@/lib/image-utils"
import CountdownTimer from "./countdown-timer"

interface ShareLinks {
  webViewLink: string
  directDownloadLink: string
  filename: string
  size?: string
  mimeType?: string
}

export default function PhotoBooth() {
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [photos, setPhotos] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [shareLinks, setShareLinks] = useState<ShareLinks | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")
  const [isMirrored, setIsMirrored] = useState(false)
  const [countdownTime, setCountdownTime] = useState("3")
  const [isCapturing, setIsCapturing] = useState(false)
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownActive, setCountdownActive] = useState(false)

  const MAX_PHOTOS = 3
  const countdownOptions = [
    { value: "0", label: "No Timer" },
    { value: "3", label: "3 seconds" },
    { value: "5", label: "5 seconds" },
    { value: "10", label: "10 seconds" },
  ]

  // Initialize camera with improved readiness detection
  useEffect(() => {
    const initCamera = async () => {
      try {
        setCameraError(null)
        setCameraReady(false)
        console.log("📷 Initializing landscape camera...")

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            facingMode: "user",
            aspectRatio: { ideal: 16 / 9 },
          },
          audio: false,
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream

          // Enhanced camera ready detection
          const handleLoadedMetadata = () => {
            console.log("✅ Camera metadata loaded:", {
              width: videoRef.current?.videoWidth,
              height: videoRef.current?.videoHeight,
              readyState: videoRef.current?.readyState,
            })
          }

          const handleCanPlay = () => {
            console.log("✅ Camera can play - ready for capture")
            setCameraReady(true)
          }

          const handlePlaying = () => {
            console.log("✅ Camera is playing - fully ready")
            setCameraReady(true)
          }

          videoRef.current.addEventListener("loadedmetadata", handleLoadedMetadata)
          videoRef.current.addEventListener("canplay", handleCanPlay)
          videoRef.current.addEventListener("playing", handlePlaying)

          // Fallback: Set ready after a short delay
          setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              console.log("✅ Camera ready via fallback check")
              setCameraReady(true)
            }
          }, 1000)
        }
      } catch (error) {
        console.error("❌ Camera initialization failed:", error)
        setCameraError("Camera access denied. Please allow camera permissions and refresh the page.")
        toast({
          title: "📷 Camera Error",
          description: "Please allow camera access and refresh the page.",
          variant: "destructive",
        })
      }
    }

    initCamera()

    // Cleanup
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [toast])

  // Single photo capture function with improved reliability
  const takeSinglePhoto = useCallback(async (): Promise<boolean> => {
    const video = videoRef.current
    const canvas = canvasRef.current

    console.log("📸 Attempting photo capture:", {
      video: !!video,
      canvas: !!canvas,
      cameraReady,
      readyState: video?.readyState,
      videoWidth: video?.videoWidth,
      videoHeight: video?.videoHeight,
    })

    // Enhanced readiness check
    if (!video || !canvas) {
      console.error("❌ Missing video or canvas element")
      return false
    }

    if (!cameraReady && video.readyState < 2) {
      console.error("❌ Camera not ready:", { cameraReady, readyState: video.readyState })
      toast({
        title: "⏳ Camera Not Ready",
        description: "Please wait a moment for camera to initialize.",
        variant: "destructive",
      })
      return false
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("❌ Invalid video dimensions")
      return false
    }

    try {
      console.log("📸 Capturing photo...")

      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      const ctx = canvas.getContext("2d")!

      // Clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Apply mirror effect if enabled
      if (isMirrored) {
        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
        ctx.restore()
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      }

      // Convert to JPG format with high quality
      const jpgDataUrl = await convertToJpg(canvas, 0.9)

      // Get image info
      const imageInfo = getImageInfo(jpgDataUrl)
      console.log("🖼️ Photo captured successfully:", imageInfo)

      // Add photo to collection
      setPhotos((prev) => [...prev, jpgDataUrl])

      toast({
        title: "📸 Photo Captured!",
        description: `Photo ${photos.length + 1}/${MAX_PHOTOS} saved as JPG (${Math.round(imageInfo.size / 1024)}KB)`,
      })

      return true
    } catch (error) {
      console.error("❌ Photo capture failed:", error)
      toast({
        title: "❌ Capture Failed",
        description: "Could not capture photo. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }, [cameraReady, isMirrored, photos.length, toast])

  // Single photo trigger
  const triggerPhotoCapture = useCallback(async () => {
    if (isCapturing || photos.length >= MAX_PHOTOS) {
      console.log("⚠️ Capture blocked:", { isCapturing, photoCount: photos.length })
      return
    }

    console.log("🎯 Photo capture triggered")
    setIsCapturing(true)

    try {
      if (countdownTime === "0") {
        // No timer, take photo immediately
        await takeSinglePhoto()
      } else {
        // Show countdown, then take photo
        setCountdownActive(true)
        setShowCountdown(true)
      }
    } finally {
      if (countdownTime === "0") {
        setIsCapturing(false)
      }
    }
  }, [isCapturing, photos.length, countdownTime, takeSinglePhoto])

  // Handle countdown completion
  const onCountdownComplete = useCallback(async () => {
    console.log("⏰ Countdown completed, taking photo")
    setShowCountdown(false)
    setCountdownActive(false)

    try {
      await takeSinglePhoto()
    } finally {
      setIsCapturing(false)
    }
  }, [takeSinglePhoto])

  // Enhanced photostrip creation with high-quality vertical output
  const createHighQualityPhotostrip = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        console.log("🎨 Creating high-quality vertical photostrip...")

        // Create high-resolution canvas for better quality
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")!

        // Set high-quality canvas properties
        canvas.width = 1080 // Standard mobile width
        canvas.height = 1920 // 9:16 aspect ratio for vertical orientation

        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"

        console.log("📐 Canvas dimensions:", { width: canvas.width, height: canvas.height })

        // Background with smooth gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, "#FEF3C7") // Light cream
        gradient.addColorStop(0.5, "#FDE68A") // Mid cream
        gradient.addColorStop(1, "#F59E0B") // Slightly darker amber
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Add outer border frame
        ctx.strokeStyle = "#92400E" // Dark brown
        ctx.lineWidth = 12
        ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12)

        // Header section with better typography
        ctx.fillStyle = "#92400E" // Dark brown text
        ctx.font = "bold 52px Arial, sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        // Add text shadow for better readability
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)"
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2

        ctx.fillText("PhotoBooth Online", canvas.width / 2, 100)

        // Reset shadow for other elements
        ctx.shadowColor = "transparent"
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        // Date with better formatting
        ctx.font = "28px Arial, sans-serif"
        const now = new Date()
        const dateStr = now.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        ctx.fillText(dateStr, canvas.width / 2, 160)

        // Load and draw photos with enhanced quality
        const imagePromises = photos.map((photo, index) => {
          return new Promise<void>((resolveImg) => {
            const img = new Image()
            img.crossOrigin = "anonymous" // Prevent CORS issues

            img.onload = () => {
              console.log(`🖼️ Processing photo ${index + 1}:`, {
                originalWidth: img.width,
                originalHeight: img.height,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
              })

              // Calculate photo positioning for vertical layout
              const photoWidth = 900 // Larger photos for better quality
              const photoHeight = 500 // Maintain good aspect ratio
              const photoX = (canvas.width - photoWidth) / 2 // Center horizontally
              const photoY = 220 + index * 550 // Stack vertically with proper spacing

              // Draw photo border with rounded corners effect
              ctx.strokeStyle = "#B45309" // Brown border
              ctx.lineWidth = 8
              ctx.strokeRect(photoX - 4, photoY - 4, photoWidth + 8, photoHeight + 8)

              // Create inner shadow effect
              ctx.strokeStyle = "#92400E"
              ctx.lineWidth = 2
              ctx.strokeRect(photoX - 2, photoY - 2, photoWidth + 4, photoHeight + 4)

              // Calculate aspect ratio for proper image fitting
              const imgRatio = img.naturalWidth / img.naturalHeight
              const containerRatio = photoWidth / photoHeight

              let drawWidth, drawHeight, offsetX, offsetY

              if (imgRatio > containerRatio) {
                // Image is wider - fit to height
                drawHeight = photoHeight
                drawWidth = photoHeight * imgRatio
                offsetX = (photoWidth - drawWidth) / 2
                offsetY = 0
              } else {
                // Image is taller - fit to width
                drawWidth = photoWidth
                drawHeight = photoWidth / imgRatio
                offsetX = 0
                offsetY = (photoHeight - drawHeight) / 2
              }

              // Enable high-quality image rendering
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = "high"

              // Draw the photo with high quality
              ctx.drawImage(img, photoX + offsetX, photoY + offsetY, drawWidth, drawHeight)

              // Add photo number badge
              const badgeSize = 50
              const badgeX = photoX + 20
              const badgeY = photoY + 20

              // Badge background
              ctx.fillStyle = "#92400E"
              ctx.beginPath()
              ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, 2 * Math.PI)
              ctx.fill()

              // Badge number
              ctx.fillStyle = "#FFFFFF"
              ctx.font = "bold 28px Arial, sans-serif"
              ctx.textAlign = "center"
              ctx.textBaseline = "middle"
              ctx.fillText(`${index + 1}`, badgeX + badgeSize / 2, badgeY + badgeSize / 2)

              console.log(`✅ Photo ${index + 1} rendered successfully`)
              resolveImg()
            }

            img.onerror = (error) => {
              console.error(`❌ Failed to load photo ${index + 1}:`, error)
              resolveImg() // Continue even if one photo fails
            }

            // Set image source
            img.src = photo
          })
        })

        // Wait for all photos to be processed
        Promise.all(imagePromises)
          .then(async () => {
            console.log("🎨 All photos processed, adding footer...")

            // Footer section with better styling
            ctx.fillStyle = "#92400E"
            ctx.font = "italic 36px Arial, sans-serif"
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"

            // Add subtle shadow to footer text
            ctx.shadowColor = "rgba(0, 0, 0, 0.2)"
            ctx.shadowBlur = 2
            ctx.shadowOffsetX = 1
            ctx.shadowOffsetY = 1

            ctx.fillText("Keep Smile :)", canvas.width / 2, canvas.height - 80)

            // Reset shadow
            ctx.shadowColor = "transparent"
            ctx.shadowBlur = 0
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 0

            // Attribution
            ctx.font = "20px Arial, sans-serif"
            ctx.fillStyle = "#B45309"
            ctx.fillText("Generated by PhotoBooth Online", canvas.width / 2, canvas.height - 40)

            console.log("🎨 Photostrip composition complete, converting to JPG...")

            // Convert to high-quality JPG with optimal settings
            const jpgDataUrl = canvas.toDataURL("image/jpeg", 0.95) // 95% quality for best results

            // Validate the output
            if (!jpgDataUrl || jpgDataUrl === "data:,") {
              throw new Error("Failed to generate photostrip image")
            }

            const imageInfo = getImageInfo(jpgDataUrl)
            console.log("✅ High-quality vertical photostrip created:", {
              dimensions: `${canvas.width}x${canvas.height}`,
              size: `${Math.round(imageInfo.size / 1024)}KB`,
              format: imageInfo.format,
              quality: "95%",
            })

            resolve(jpgDataUrl)
          })
          .catch((error) => {
            console.error("❌ Error processing photos:", error)
            reject(error)
          })
      } catch (error) {
        console.error("❌ Photostrip creation failed:", error)
        reject(error)
      }
    })
  }

  const uploadAndShare = async () => {
    if (photos.length !== MAX_PHOTOS) return

    setIsUploading(true)
    setUploadProgress("🎨 Creating high-quality photostrip...")

    try {
      toast({
        title: "🎨 Creating Photostrip",
        description: "Combining your photos into a beautiful high-quality strip...",
      })

      const photostrip = await createHighQualityPhotostrip()
      const imageInfo = getImageInfo(photostrip)

      setUploadProgress("☁️ Uploading high-quality JPG...")
      toast({
        title: "☁️ Uploading JPG",
        description: `Uploading ${Math.round(imageInfo.size / 1024)}KB high-quality JPG to Google Drive...`,
      })

      const result = await uploadToGoogleDrive(photostrip)
      setShareLinks(result)

      setUploadProgress("")
      toast({
        title: "🎉 Upload Successful!",
        description: `${result.filename} is ready to share!`,
      })
    } catch (error) {
      console.error("❌ Upload process failed:", error)

      let errorMessage = "Upload failed. Please try again."
      if (error instanceof Error) {
        if (error.message.includes("Authentication")) {
          errorMessage = "Server authentication error. Please contact support."
        } else if (error.message.includes("Permission")) {
          errorMessage = "Permission error. Please contact support."
        } else if (error.message.includes("quota")) {
          errorMessage = "Upload limit reached. Please try again later."
        } else {
          errorMessage = error.message
        }
      }

      setUploadProgress("")
      toast({
        title: "❌ Upload Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Enhanced download function with quality validation
  const downloadFromWebsite = async () => {
    try {
      console.log("📱 Starting high-quality download process...")

      toast({
        title: "🎨 Preparing Download",
        description: "Creating your high-quality vertical photostrip...",
      })

      // Create high-quality photostrip
      const photostrip = await createHighQualityPhotostrip()

      // Validate the photostrip before download
      if (!photostrip || !photostrip.startsWith("data:image/jpeg")) {
        throw new Error("Invalid photostrip format generated")
      }

      const imageInfo = getImageInfo(photostrip)
      console.log("📊 Download image info:", imageInfo)

      // Validate image quality
      if (imageInfo.size < 50000) {
        // Less than 50KB might indicate quality issues
        console.warn("⚠️ Generated image seems small, but proceeding with download")
      }

      // Create download with descriptive filename
      const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD format
      const filename = `PhotoBooth-Vertical-Strip-${timestamp}-${Date.now()}.jpg`

      // Create and trigger download
      const link = document.createElement("a")
      link.href = photostrip
      link.download = filename
      link.style.display = "none"

      // Add to DOM, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log("✅ Download triggered successfully:", {
        filename,
        size: `${Math.round(imageInfo.size / 1024)}KB`,
        format: imageInfo.format,
        dimensions: "1080x1920",
      })

      toast({
        title: "⬇️ Download Started",
        description: `Your high-quality vertical JPG photostrip (${Math.round(imageInfo.size / 1024)}KB) is downloading to your device.`,
      })
    } catch (error) {
      console.error("❌ Download failed:", error)
      toast({
        title: "❌ Download Failed",
        description: error instanceof Error ? error.message : "Could not create photostrip for download.",
        variant: "destructive",
      })
    }
  }

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      toast({
        title: "📋 Link Copied!",
        description: "Share link copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "❌ Copy Failed",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      })
    }
  }

  const resetPhotoBooth = () => {
    setPhotos([])
    setShareLinks(null)
    setUploadProgress("")
    setIsCapturing(false)
    setShowCountdown(false)
    setCountdownActive(false)
    toast({
      title: "🔄 Reset Complete",
      description: "Ready to take new photos!",
    })
  }

  const progress = (photos.length / MAX_PHOTOS) * 100

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-amber-200 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-amber-800">
              {shareLinks ? "🎉 Your High-Quality JPG Photostrip is Ready!" : "📸 PhotoBooth Online"}
            </CardTitle>
            {(photos.length > 0 || shareLinks) && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetPhotoBooth}
                className="border-amber-500 text-amber-700 hover:bg-amber-50"
                disabled={isUploading || isCapturing}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                New Photos
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Upload Progress */}
          {isUploading && uploadProgress && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 font-medium">{uploadProgress}</span>
              </div>
            </div>
          )}

          {/* Camera Section */}
          {!shareLinks && (
            <div className="space-y-4">
              {cameraError ? (
                <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-red-600 mb-4">{cameraError}</p>
                  <Button onClick={() => window.location.reload()}>🔄 Retry Camera Access</Button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative overflow-hidden rounded-lg border-4 border-amber-200 aspect-video w-full max-w-5xl mx-auto bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${isMirrored ? "scale-x-[-1]" : ""}`}
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Camera overlay info */}
                    <div className="absolute top-3 left-3 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-medium">
                      📷 Live Camera {isMirrored && "(Mirrored)"} {cameraReady ? "✅" : "⏳"}
                    </div>

                    {/* Frame guide overlay */}
                    <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none">
                      <div className="absolute top-2 left-2 text-white/70 text-xs">Full Scene Preview</div>
                    </div>

                    {/* Transparent countdown overlay - maintains camera visibility */}
                    {showCountdown && countdownActive && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="bg-white/90 rounded-full p-8 shadow-2xl">
                          <CountdownTimer seconds={Number.parseInt(countdownTime)} onComplete={onCountdownComplete} />
                        </div>
                      </div>
                    )}

                    {/* Capture flash effect */}
                    {isCapturing && !showCountdown && (
                      <div className="absolute inset-0 bg-white animate-pulse opacity-50 pointer-events-none"></div>
                    )}
                  </div>

                  {/* Camera info */}
                  <div className="mt-2 text-center text-sm text-amber-700">
                    <span className="inline-flex items-center gap-2">
                      📐 Landscape Mode • Full Scene Visible • 16:9 Aspect Ratio
                      {cameraReady ? " • Ready ✅" : " • Initializing ⏳"}
                    </span>
                  </div>
                </div>
              )}

              {/* Camera Controls */}
              {!cameraError && photos.length < MAX_PHOTOS && (
                <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="mirror" checked={isMirrored} onCheckedChange={setIsMirrored} />
                      <label htmlFor="mirror" className="text-sm font-medium text-amber-800">
                        Mirror Camera
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Timer className="w-4 h-4 text-amber-600" />
                      <Select value={countdownTime} onValueChange={setCountdownTime}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countdownOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={triggerPhotoCapture}
                    size="lg"
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    disabled={isCapturing || !cameraReady}
                  >
                    {isCapturing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {showCountdown ? "Get Ready..." : "Capturing..."}
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mr-2" />
                        Take Photo {photos.length + 1}/{MAX_PHOTOS}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Progress */}
              {photos.length > 0 && photos.length < MAX_PHOTOS && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-amber-700">
                    <span>
                      📸 Photos: {photos.length}/{MAX_PHOTOS}
                    </span>
                    <span>{Math.round(progress)}% Complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Action Buttons */}
              {photos.length === MAX_PHOTOS && (
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={uploadAndShare}
                    disabled={isUploading}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading High-Quality JPG...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 mr-2" />
                        ☁️ Save High-Quality JPG & Share
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={downloadFromWebsite}
                    variant="outline"
                    size="lg"
                    className="border-amber-500 text-amber-700 hover:bg-amber-50"
                    disabled={isUploading}
                  >
                    <Download className="w-5 h-5 mr-2" />📱 Download High-Quality Vertical JPG
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Photo Preview */}
          {photos.length > 0 && !shareLinks && (
            <div className="space-y-3">
              <h3 className="font-medium text-amber-800 flex items-center">
                <ImageIcon className="w-4 h-4 mr-2" />📷 JPG Photos Preview
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, index) => {
                  const imageInfo = getImageInfo(photo)
                  return (
                    <div key={index} className="relative">
                      <img
                        src={photo || "/placeholder.svg"}
                        alt={`Photo ${index + 1}`}
                        className="w-full aspect-video object-cover rounded-lg border-2 border-amber-200"
                      />
                      <div className="absolute top-1 left-1 bg-amber-600 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                        JPG {Math.round(imageInfo.size / 1024)}KB
                      </div>
                    </div>
                  )
                })}
                {/* Show empty slots */}
                {Array(MAX_PHOTOS - photos.length)
                  .fill(0)
                  .map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="aspect-video bg-amber-50 rounded-lg border-2 border-dashed border-amber-200 flex items-center justify-center"
                    >
                      <Camera className="w-8 h-8 text-amber-300" />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Share Links Section */}
          {shareLinks && (
            <div className="space-y-4 p-6 bg-green-50 rounded-lg border border-green-200">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  ✅ {shareLinks.filename} Uploaded Successfully!
                </h3>
                <p className="text-green-700 text-sm mb-2">
                  Your high-quality vertical JPG photostrip (1080x1920) is now available online and ready to share.
                </p>
                {shareLinks.size && (
                  <p className="text-xs text-green-600">
                    📊 File size: {Math.round(Number.parseInt(shareLinks.size) / 1024)}KB • Format:{" "}
                    {shareLinks.mimeType} • Quality: 95%
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                <Button
                  onClick={() => window.open(shareLinks.webViewLink, "_blank")}
                  variant="outline"
                  className="border-blue-500 text-blue-700 hover:bg-blue-50"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />🔗 View High-Quality JPG in Google Drive
                </Button>

                <Button
                  onClick={() => window.open(shareLinks.directDownloadLink, "_blank")}
                  variant="outline"
                  className="border-green-500 text-green-700 hover:bg-green-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  ⬇️ Download High-Quality JPG from Google Drive
                </Button>

                <Button
                  onClick={() => copyLink(shareLinks.webViewLink)}
                  variant="outline"
                  className="border-amber-500 text-amber-700 hover:bg-amber-50"
                >
                  <Share2 className="w-4 h-4 mr-2" />📋 Copy Share Link
                </Button>
              </div>

              <div className="text-xs text-green-600 bg-white p-3 rounded border">
                <strong>💡 Tip:</strong> Your high-quality vertical JPG photostrip (1080x1920 pixels) is stored safely
                in Google Drive with public viewing permissions. Perfect for mobile viewing and social media sharing!
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
