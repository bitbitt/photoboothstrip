"use client"

import { useState, useEffect } from "react"
import { Camera } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CameraSelectorProps {
  onSelectCamera: (deviceId: string) => void
  selectedDeviceId: string
}

export default function CameraSelector({ onSelectCamera, selectedDeviceId }: CameraSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission first to ensure we get the device list
        await navigator.mediaDevices.getUserMedia({ video: true })

        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((device) => device.kind === "videoinput")
        setDevices(videoDevices)

        // Select the first camera by default if none is selected
        if (videoDevices.length > 0 && !selectedDeviceId) {
          onSelectCamera(videoDevices[0].deviceId)
        }
      } catch (error) {
        console.error("Error getting camera devices:", error)
      }
    }

    getDevices()

    // Listen for device changes
    navigator.mediaDevices.addEventListener("devicechange", getDevices)

    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", getDevices)
    }
  }, [onSelectCamera, selectedDeviceId])

  return (
    <Select value={selectedDeviceId} onValueChange={onSelectCamera}>
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center">
          <Camera className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Select Camera" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {devices.map((device) => (
          <SelectItem key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${devices.indexOf(device) + 1}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
