"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, LogIn } from "lucide-react"

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      await signIn("google", {
        callbackUrl: "/",
        redirect: true,
      })
    } catch (error) {
      console.error("Error signing in:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-amber-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Camera className="w-12 h-12 text-amber-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-amber-800">PhotoBooth Online</CardTitle>
          <CardDescription className="text-amber-700">
            Masuk untuk mulai mengambil foto dan menyimpan ke Google Drive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            size="lg"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Sedang masuk...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Masuk dengan Google
              </>
            )}
          </Button>
          <p className="text-xs text-amber-600 text-center mt-4">
            Dengan masuk, Anda memberikan izin untuk menyimpan foto ke Google Drive Anda
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
