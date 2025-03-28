import type { Metadata } from "next"
import PhotoBooth from "@/components/photo-booth"

export const metadata: Metadata = {
  title: "PhotoBooth Jawa",
  description: "Abadikan momen dengan tema Jawa yang ceria",
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-800 mb-2 drop-shadow-md">PhotoBooth Jawa</h1>
          <p className="text-amber-700">Abadikan momen indah dengan nuansa Jawa yang ceria</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <PhotoBooth />
        </div>

        <footer className="mt-12 text-center text-amber-700 text-sm">
          <p>© {new Date().getFullYear()} PhotoBooth Jawa - Kenangan Indah Selamanya</p>
        </footer>
      </div>
    </main>
  )
}

