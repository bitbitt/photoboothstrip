import PhotoBooth from "@/components/photo-booth"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-800 mb-2 drop-shadow-md">📸 PhotoBooth Online</h1>
          <p className="text-amber-700 mb-2">Keep Smile! 😊</p>
          <p className="text-sm text-amber-600">Take 3 photos → Get instant shareable links → Download anytime!</p>
        </div>

        <PhotoBooth />

        <footer className="mt-12 text-center text-amber-700 text-sm">
          <p>© {new Date().getFullYear()} PhotoBooth Online - Every day is a happy day! 🌟</p>
          <p className="text-xs text-amber-600 mt-1">Photos are securely stored and accessible via shareable links</p>
        </footer>
      </div>
    </main>
  )
}
