// Enhanced image processing utilities with better error handling

export function dataUrlToBuffer(dataUrl: string): Buffer {
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Invalid data URL format - must start with 'data:image/'")
  }

  try {
    const base64Data = dataUrl.replace(/^data:image\/[^;]+;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")

    if (buffer.length === 0) {
      throw new Error("Empty image buffer")
    }

    return buffer
  } catch (error) {
    throw new Error(`Failed to convert data URL to buffer: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export function validateImageBuffer(buffer: Buffer): { isValid: boolean; format?: string } {
  if (buffer.length === 0) {
    return { isValid: false }
  }

  // Check for JPEG signature
  if (buffer.length >= 3) {
    const jpegSignature = buffer.slice(0, 3).toString("hex").toLowerCase()
    if (jpegSignature === "ffd8ff") {
      return { isValid: true, format: "JPEG" }
    }
  }

  // Check for PNG signature
  if (buffer.length >= 8) {
    const pngSignature = buffer.slice(0, 8).toString("hex").toLowerCase()
    if (pngSignature === "89504e470d0a1a0a") {
      return { isValid: true, format: "PNG" }
    }
  }

  // Check for WebP signature
  if (buffer.length >= 12) {
    const webpSignature = buffer.slice(8, 12).toString("ascii")
    if (webpSignature === "WEBP") {
      return { isValid: true, format: "WebP" }
    }
  }

  return { isValid: false }
}

export async function convertToJpg(canvas: HTMLCanvasElement, quality = 0.9): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Validate canvas
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        reject(new Error("Invalid canvas - must have non-zero dimensions"))
        return
      }

      // Convert canvas to JPG data URL
      const jpgDataUrl = canvas.toDataURL("image/jpeg", quality)

      if (!jpgDataUrl.startsWith("data:image/jpeg")) {
        reject(new Error("Failed to convert to JPG format - invalid output"))
        return
      }

      // Validate the result
      const base64Data = jpgDataUrl.replace(/^data:image\/jpeg;base64,/, "")
      if (base64Data.length === 0) {
        reject(new Error("Failed to convert to JPG format - empty result"))
        return
      }

      console.log(`✅ Canvas converted to JPG: ${Math.round((base64Data.length * 3) / 4 / 1024)}KB`)
      resolve(jpgDataUrl)
    } catch (error) {
      reject(new Error(`Canvas to JPG conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`))
    }
  })
}

export function getImageInfo(dataUrl: string): { format: string; size: number; sizeKB: number } {
  try {
    const formatMatch = dataUrl.match(/^data:image\/([^;]+)/)
    const format = formatMatch ? formatMatch[1].toUpperCase() : "UNKNOWN"

    const base64Data = dataUrl.replace(/^data:image\/[^;]+;base64,/, "")
    const size = Math.round((base64Data.length * 3) / 4) // More accurate size calculation
    const sizeKB = Math.round(size / 1024)

    return { format, size, sizeKB }
  } catch (error) {
    return { format: "UNKNOWN", size: 0, sizeKB: 0 }
  }
}

export function optimizeImageQuality(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Try different quality levels to find optimal size/quality balance
      const qualityLevels = [0.95, 0.9, 0.85, 0.8]
      const maxSizeKB = 500 // Target max size

      for (const quality of qualityLevels) {
        const jpgDataUrl = await convertToJpg(canvas, quality)
        const info = getImageInfo(jpgDataUrl)

        console.log(`Quality ${quality}: ${info.sizeKB}KB`)

        if (info.sizeKB <= maxSizeKB || quality === qualityLevels[qualityLevels.length - 1]) {
          console.log(`✅ Optimized JPG: ${info.sizeKB}KB at ${quality * 100}% quality`)
          resolve(jpgDataUrl)
          return
        }
      }
    } catch (error) {
      reject(error)
    }
  })
}
