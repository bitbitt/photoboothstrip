"use client"

import { useState, useRef, useEffect } from "react"
import { Camera, RefreshCw, Upload, Download, Sparkles, Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import CameraSelector from "./camera-selector"
import CountdownTimer from "./countdown-timer"
import PhotoPreview from "./photo-preview"
import PhotoStrip from "./photo-strip"
import { uploadToGoogleDrive } from "@/lib/google-drive"
import { savePhotoMetadata } from "@/lib/supabase"

export default function PhotoBooth() {
  const { toast } = useToast()
  const isMobile = useMobile()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [deviceId, setDeviceId] = useState<string>("")
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [isComplete, setIsComplete] = useState<boolean>(false)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [driveLink, setDriveLink] = useState<string>("")
  const [isMirrored, setIsMirrored] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  const MAX_PHOTOS = 3

  // Handle fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!isFullscreen) {
          // Enter fullscreen
          if (containerRef.current?.requestFullscreen) {
            containerRef.current.requestFullscreen()
            setIsFullscreen(true)
          }
        }
      }
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [isFullscreen])

  // Initialize camera when deviceId changes
  useEffect(() => {
    if (!deviceId) return

    const initCamera = async () => {
      try {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }

        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: { ideal: 9 / 16 },
          },
          audio: false,
        }

        const newStream = await navigator.mediaDevices.getUserMedia(constraints)
        setStream(newStream)

        if (videoRef.current) {
          videoRef.current.srcObject = newStream
        }
      } catch (error) {
        console.error("Error accessing camera:", error)
        toast({
          title: "Camera Error",
          description: "Could not access the camera. Please check permissions.",
          variant: "destructive",
        })
      }
    }

    initCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [deviceId, toast])

  // Cache photos in localStorage
  useEffect(() => {
    if (photos.length > 0) {
      localStorage.setItem("cachedPhotos", JSON.stringify(photos))
    }
  }, [photos])

  // Restore cached photos on mount
  useEffect(() => {
    const cachedPhotos = localStorage.getItem("cachedPhotos")
    if (cachedPhotos) {
      try {
        const parsedPhotos = JSON.parse(cachedPhotos)
        if (Array.isArray(parsedPhotos) && parsedPhotos.length > 0) {
          setPhotos(parsedPhotos)
          if (parsedPhotos.length === MAX_PHOTOS) {
            setIsComplete(true)
          } else {
            setCurrentStep(parsedPhotos.length)
          }
        }
      } catch (error) {
        console.error("Error parsing cached photos:", error)
      }
    }

    // Initialize camera on first load
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter((device) => device.kind === "videoinput")
          if (videoDevices.length > 0) {
            setDeviceId(videoDevices[0].deviceId)
          }
        })
        .catch((err) => {
          console.error("Error enumerating devices:", err)
        })
    }
  }, [])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    // Set canvas dimensions to match video aspect ratio
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext("2d")
    if (!context) return

    // Apply mirroring if needed
    if (isMirrored) {
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
    }

    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Reset transformation if mirrored
    if (isMirrored) {
      context.setTransform(1, 0, 0, 1, 0, 0)
    }

    // Convert canvas to data URL (JPEG format with 0.9 quality)
    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.9)

    // Add the new photo to the array
    setPhotos((prev) => [...prev, photoDataUrl])
    setCurrentStep((prev) => prev + 1)
  }

  const startCountdown = () => {
    setIsCountingDown(true)
  }

  const handleCountdownComplete = () => {
    capturePhoto()
    setIsCountingDown(false)
  }

  const retakeLastPhoto = () => {
    setPhotos((prev) => prev.slice(0, -1))
    setCurrentStep((prev) => prev - 1)
  }

  const resetPhotoBooth = () => {
    setPhotos([])
    setCurrentStep(0)
    setIsComplete(false)
    setDriveLink("")
    localStorage.removeItem("cachedPhotos")
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  const createPhotostrip = async () => {
    if (photos.length !== MAX_PHOTOS) return

    try {
      // Create a photostrip canvas with 9:16 aspect ratio
      const photoStripCanvas = document.createElement("canvas")
      const ctx = photoStripCanvas.getContext("2d")
      if (!ctx) return

      // Create photostrip with 9:16 overall aspect ratio
      const img1 = new Image()
      const img2 = new Image()
      const img3 = new Image()

      img1.crossOrigin = "anonymous"
      img2.crossOrigin = "anonymous"
      img3.crossOrigin = "anonymous"

      img1.src = photos[0]
      img2.src = photos[1]
      img3.src = photos[2]

      // Wait for images to load
      await Promise.all([
        new Promise((resolve) => (img1.onload = resolve)),
        new Promise((resolve) => (img2.onload = resolve)),
        new Promise((resolve) => (img3.onload = resolve)),
      ])

      // Set canvas size for the photostrip with 9:16 aspect ratio
      const canvasWidth = 1080
      const canvasHeight = 1920 // 9:16 ratio

      photoStripCanvas.width = canvasWidth
      photoStripCanvas.height = canvasHeight

      // Calculate image height (each image gets 1/3 of the height minus padding)
      const padding = 40
      const headerFooterHeight = 80
      const availableHeight = canvasHeight - padding * 4 - headerFooterHeight * 2
      const imageHeight = availableHeight / 3

      // Fill with background (Javanese batik pattern color)
      ctx.fillStyle = "#FEF3C7" // amber-100
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // Draw border
      ctx.strokeStyle = "#92400E" // amber-800
      ctx.lineWidth = 20
      ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20)

      // Draw header with transparent background and drop shadow
      ctx.save()
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)"
      ctx.shadowBlur = 10
      ctx.shadowOffsetX = 3
      ctx.shadowOffsetY = 3
      ctx.fillStyle = "#92400E"
      ctx.font = "bold 48px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Kenangan Jawa", canvasWidth / 2, padding + 40)
      ctx.restore()

      // Draw images with proper contain sizing
      const drawImageContained = (img: HTMLImageElement, x: number, y: number, width: number, height: number) => {
        const imgRatio = img.width / img.height
        const containerRatio = width / height

        let drawWidth, drawHeight, offsetX, offsetY

        if (imgRatio > containerRatio) {
          // Image is wider than container
          drawWidth = width
          drawHeight = width / imgRatio
          offsetX = 0
          offsetY = (height - drawHeight) / 2
        } else {
          // Image is taller than container
          drawHeight = height
          drawWidth = height * imgRatio
          offsetX = (width - drawWidth) / 2
          offsetY = 0
        }

        ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight)
      }

      // Draw each image
      const imageWidth = canvasWidth - padding * 2
      const y1 = padding + headerFooterHeight + padding
      const y2 = y1 + imageHeight + padding
      const y3 = y2 + imageHeight + padding

      // Draw images directly without white background
      // Image 1
      ctx.strokeStyle = "#B45309" // amber-700
      ctx.lineWidth = 8
      ctx.strokeRect(padding, y1, imageWidth, imageHeight)
      drawImageContained(img1, padding, y1, imageWidth, imageHeight)

      // Image 2
      ctx.strokeRect(padding, y2, imageWidth, imageHeight)
      drawImageContained(img2, padding, y2, imageWidth, imageHeight)

      // Image 3
      ctx.strokeRect(padding, y3, imageWidth, imageHeight)
      drawImageContained(img3, padding, y3, imageWidth, imageHeight)

      // Draw footer with transparent background and drop shadow
      const footerY = y3 + imageHeight + padding
      ctx.save()
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)"
      ctx.shadowBlur = 10
      ctx.shadowOffsetX = 3
      ctx.shadowOffsetY = 3
      ctx.fillStyle = "#92400E"

      // Sejajarkan tanggal dan teks "Sampun Rampung"
      ctx.font = "24px Arial"
      ctx.textAlign = "left"
      ctx.fillText(new Date().toLocaleDateString(), padding + 20, footerY + 30)

      ctx.font = "italic 36px Arial"
      ctx.textAlign = "right"
      ctx.fillText("Sampun Rampung", canvasWidth - padding - 20, footerY + 30)
      ctx.restore()

      // Convert to data URL
      const photoStripDataUrl = photoStripCanvas.toDataURL("image/jpeg", 0.9)
      return photoStripDataUrl
    } catch (error) {
      console.error("Error creating photostrip:", error)
      throw new Error("Failed to create photostrip")
    }
  }

  const savePhotostrip = async () => {
    try {
      setIsProcessing(true)
      const photoStripDataUrl = await createPhotostrip()

      if (!photoStripDataUrl) {
        throw new Error("Failed to create photostrip")
      }

      // Create download link
      const link = document.createElement("a")
      link.href = photoStripDataUrl
      link.download = `photostrip-jawa-${new Date().toISOString().slice(0, 10)}.jpg`
      link.click()

      toast({
        title: "Berhasil!",
        description: "Photostrip telah tersimpan di perangkat Anda",
      })

      return photoStripDataUrl
    } catch (error) {
      console.error("Error saving photostrip:", error)
      toast({
        title: "Error",
        description: "Gagal menyimpan photostrip",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const uploadPhotostrip = async () => {
    if (photos.length !== MAX_PHOTOS) return

    setIsUploading(true)

    try {
      // Generate photostrip
      const photoStripDataUrl = await createPhotostrip()
      if (!photoStripDataUrl) throw new Error("Failed to create photostrip")

      // Upload to Google Drive
      const { fileId, webViewLink } = await uploadToGoogleDrive(photoStripDataUrl)

      // Save the Drive link
      setDriveLink(webViewLink)

      // Save metadata to Supabase
      await savePhotoMetadata({
        created_at: new Date().toISOString(),
        drive_file_id: fileId,
        photo_count: photos.length,
        drive_link: webViewLink,
      })

      toast({
        title: "Unggahan Berhasil!",
        description: "Photostrip Anda telah diunggah ke Google Drive",
      })
    } catch (error) {
      console.error("Error uploading photostrip:", error)
      toast({
        title: "Unggahan Gagal",
        description: "Tidak dapat mengunggah ke Google Drive. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    if (photos.length === MAX_PHOTOS && !isComplete) {
      setIsComplete(true)
    }
  }, [photos, isComplete])

  return (
    <div ref={containerRef} className="grid gap-6">
      <Card className="p-4 border-amber-200 bg-white shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-amber-800">
            {isComplete ? "Photostrip Jawa Anda" : "Ambil Foto Anda"}
          </h2>
          <div className="flex items-center gap-2">
            {!isComplete && (
              <>
                <CameraSelector onSelectCamera={setDeviceId} selectedDeviceId={deviceId} />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mirror"
                    checked={isMirrored}
                    onCheckedChange={(checked) => setIsMirrored(checked === true)}
                  />
                  <label
                    htmlFor="mirror"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-amber-700"
                  >
                    Mirror
                  </label>
                </div>
              </>
            )}
            {isComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetPhotoBooth}
                className="border-amber-500 text-amber-700 hover:bg-amber-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Mulai Ulang
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="border-amber-500 text-amber-700 hover:bg-amber-50"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {!isComplete ? (
          <div className="relative overflow-hidden rounded-lg mx-auto w-full max-w-md">
            <div className="aspect-[9/16] w-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain ${isCountingDown ? "opacity-80" : ""} ${isMirrored ? "scale-x-[-1]" : ""}`}
              />

              {isCountingDown && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <CountdownTimer seconds={3} onComplete={handleCountdownComplete} />
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
        ) : (
          <div className="flex justify-center w-full">
            <PhotoStrip photos={photos} />
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-amber-700">
              Foto {currentStep}/{MAX_PHOTOS}
            </span>
            <span className="text-sm text-amber-700">{Math.round((currentStep / MAX_PHOTOS) * 100)}% Selesai</span>
          </div>
          <Progress
            value={(currentStep / MAX_PHOTOS) * 100}
            className="h-2 bg-amber-100"
            indicatorClassName="bg-amber-500"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {!isComplete ? (
            <>
              {!isCountingDown && currentStep < MAX_PHOTOS && (
                <Button onClick={startCountdown} className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Camera className="w-4 h-4 mr-2" />
                  Ambil Foto {currentStep + 1}
                </Button>
              )}

              {currentStep > 0 && !isCountingDown && (
                <Button
                  variant="outline"
                  onClick={retakeLastPhoto}
                  className="border-amber-500 text-amber-700 hover:bg-amber-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Ambil Ulang Foto Terakhir
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={savePhotostrip}
                disabled={isProcessing}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Simpan ke Perangkat
              </Button>

              <Button
                variant="outline"
                onClick={uploadPhotostrip}
                disabled={isUploading}
                className="border-amber-500 text-amber-700 hover:bg-amber-50"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Unggah ke Google Drive
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {driveLink && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 font-medium mb-2 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
              Photostrip Anda telah diunggah!
            </p>
            <p className="text-sm text-amber-700 mb-2">
              Anda dapat mengakses photostrip di Google Drive melalui link berikut:
            </p>
            <a
              href={driveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {driveLink}
            </a>
          </div>
        )}
      </Card>

      {photos.length > 0 && !isComplete && (
        <Card className="p-4 border-amber-200 bg-white shadow-lg">
          <h3 className="text-lg font-medium mb-3 text-amber-800">Pratinjau</h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <PhotoPreview key={index} photoUrl={photo} />
            ))}
            {Array(MAX_PHOTOS - photos.length)
              .fill(0)
              .map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="aspect-[9/16] bg-amber-50 rounded-lg flex items-center justify-center border border-amber-200"
                >
                  <Camera className="w-8 h-8 text-amber-300" />
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}

