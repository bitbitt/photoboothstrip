"use client"

import { useState, useEffect } from "react"

interface CountdownTimerProps {
  seconds: number
  onComplete: () => void
}

export default function CountdownTimer({ seconds, onComplete }: CountdownTimerProps) {
  const [count, setCount] = useState(seconds)

  useEffect(() => {
    if (count <= 0) {
      onComplete()
      return
    }

    const timer = setTimeout(() => {
      setCount(count - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [count, onComplete])

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-8xl font-bold text-amber-600 animate-pulse">{count}</div>
      <div className="text-xl mt-2 text-amber-800">Siap-siap!</div>
    </div>
  )
}

