"use client"

import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"
import type { ReactNode } from "react"

interface AuthWrapperProps {
  children: ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-700">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-amber-800 mb-4">PhotoBooth Online</h1>
          <p className="text-amber-700 mb-6">Silakan masuk untuk menggunakan aplikasi</p>
          <Button
            onClick={() => (window.location.href = "/auth/signin")}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Masuk
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100">
      {/* Header dengan info user */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <User className="w-6 h-6 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">{session.user?.name}</p>
              <p className="text-xs text-amber-600">{session.user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="border-amber-500 text-amber-700 hover:bg-amber-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Keluar
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="py-8">{children}</div>
    </div>
  )
}
