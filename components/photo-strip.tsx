"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface PhotoStripProps {
  photos: string[]
}

// Javanese decorative elements
const javaneseElements = [
  { name: "batik-parang", class: "bg-amber-100 border-amber-800 border-4 border-dashed" },
  { name: "batik-kawung", class: "bg-orange-50 border-orange-900 border-4 border-double" },
  { name: "wayang", class: "bg-yellow-50 border-yellow-800 border-4" },
  { name: "gamelan", class: "bg-amber-50 border-amber-900 border-4 border-dotted" },
]

// Cheerful colors for frames
const frameColors = ["border-amber-500", "border-orange-500", "border-yellow-600", "border-emerald-600"]

export default function PhotoStrip({ photos }: PhotoStripProps) {
  const [decorStyle, setDecorStyle] = useState(0)
  const [frameColor, setFrameColor] = useState(0)

  // Set random decorative style on mount
  useEffect(() => {
    setDecorStyle(Math.floor(Math.random() * javaneseElements.length))
    setFrameColor(Math.floor(Math.random() * frameColors.length))
  }, [])

  if (photos.length === 0) return null

  const javaneseStyle = javaneseElements[decorStyle]
  const frameStyle = frameColors[frameColor]

  return (
    <div className={cn("p-4 rounded-lg shadow-lg max-w-xs mx-auto", javaneseStyle.class)}>
      <div className="aspect-[9/16] w-full overflow-hidden flex flex-col">
        <div className="text-center py-2 mb-1">
          <h3 className="font-bold text-amber-800 text-lg drop-shadow-md">Kenangan Jawa</h3>
          <p className="text-xs text-amber-700 drop-shadow-sm">{new Date().toLocaleDateString()}</p>
        </div>

        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          {photos.map((photo, index) => (
            <div key={index} className="relative flex-1 overflow-hidden">
              <div className={cn("absolute inset-0 border-2 rounded overflow-hidden", frameStyle)}>
                <img
                  src={photo || "/placeholder.svg"}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Javanese decorative corner */}
              <div className="absolute top-0 right-0 w-12 h-12 opacity-60">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-amber-800">
                  <path d="M0,0 C50,20 80,50 100,100 L0,100 Z" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center py-2 mt-1">
          <div className="flex justify-between px-4">
            <p className="text-xs text-amber-700 drop-shadow-sm">{new Date().toLocaleDateString()}</p>
            <p className="text-xs italic text-amber-700 drop-shadow-sm">Sampun Rampung</p>
          </div>
        </div>
      </div>
    </div>
  )
}
