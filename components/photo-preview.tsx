"use client"

interface PhotoPreviewProps {
  photoUrl: string
}

export default function PhotoPreview({ photoUrl }: PhotoPreviewProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-amber-200">
      <div className="aspect-[9/16] w-full">
        <img src={photoUrl || "/placeholder.svg"} alt="Photo preview" className="w-full h-full object-contain" />
      </div>
    </div>
  )
}
