"use client"

import { forwardRef, useImperativeHandle, useRef, useEffect } from "react"

interface CameraPreviewProps {
  isMirrored: boolean
  isCapturing: boolean
  currentPhotoIndex: number
  maxPhotos: number
  onCameraError: (error: string) => void
  onCameraReady: () => void
}

export interface CameraPreviewRef {
  getVideoElement: () => HTMLVideoElement | null
  getCanvasElement: () => HTMLCanvasElement | null
}

const CameraPreview = forwardRef<CameraPreviewRef, CameraPreviewProps>(
  ({ isMirrored, isCapturing, currentPhotoIndex, maxPhotos, onCameraError, onCameraReady }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useImperativeHandle(ref, () => ({
      getVideoElement: () => videoRef.current,
      getCanvasElement: () => canvasRef.current,
    }))

    useEffect(() => {
      const initCamera = async () => {
        try {
          console.log("📷 Initializing landscape camera...")

          // Request landscape camera with full scene visibility
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

            // Wait for video to be ready
            videoRef.current.onloadedmetadata = () => {
              console.log("✅ Landscape camera initialized:", {
                width: videoRef.current?.videoWidth,
                height: videoRef.current?.videoHeight,
                aspectRatio: (videoRef.current?.videoWidth || 0) / (videoRef.current?.videoHeight || 1),
              })
              onCameraReady()
            }
          }
        } catch (error) {
          console.error("❌ Camera initialization failed:", error)
          onCameraError("Camera access denied. Please allow camera permissions and refresh the page.")
        }
      }

      initCamera()

      // Cleanup function
      return () => {
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream
          stream.getTracks().forEach((track) => track.stop())
        }
      }
    }, [onCameraError, onCameraReady])

    return (
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
            📷 Live Camera {isMirrored && "(Mirrored)"}
          </div>

          {/* Frame guide overlay */}
          <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none">
            <div className="absolute top-2 left-2 text-white/70 text-xs">Full Scene Preview</div>
          </div>

          {/* Capturing indicator */}
          {isCapturing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-6xl mb-4 animate-pulse">📸</div>
                <div className="text-2xl font-bold mb-2">
                  Taking Photo {currentPhotoIndex + 1}/{maxPhotos}
                </div>
                <div className="text-lg opacity-80">Keep still and smile! 😊</div>
              </div>
            </div>
          )}
        </div>

        {/* Camera info */}
        <div className="mt-2 text-center text-sm text-amber-700">
          <span className="inline-flex items-center gap-2">
            📐 Landscape Mode • Full Scene Visible • 16:9 Aspect Ratio
          </span>
        </div>
      </div>
    )
  },
)

CameraPreview.displayName = "CameraPreview"

export default CameraPreview
