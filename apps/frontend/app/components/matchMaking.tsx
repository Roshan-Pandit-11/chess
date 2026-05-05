"use client"
import { useEffect, useRef, useState } from "react";

export function MatchMaking({ time , isTimeOver , onCancel}: { time: number , isTimeOver:() => void , onCancel : () => void}) {
    const [timer , setTimer] = useState(time) ;
    const [timeComplete , setTimeComplete] = useState(false) ;

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev : number) => {
                if (prev <= 1){
                    clearInterval(interval);
                    setTimeComplete(true);
                    timeOver() ;
                    return 0 ;
                }
            return prev - 1 ;
            })
        }, 1000);
        return () => clearInterval(interval);
    }, []) ;

    function timeOver () {
        setTimeout(() => {
            isTimeOver() ;
        }, 1000);
    }
  return (
    <div className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#0A0A0A] text-white">

      {/* 🌌 Blurred Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.04),transparent_40%)] blur-2xl opacity-70" />

      {/* 🧊 Glass Card */}
      <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-10 py-12 shadow-2xl flex flex-col items-center gap-6">

      <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-600 hover:text-white hover:cursor-pointer  transition-colors text-lg"
        >
          ✕
        </button>

        {/* 🎯 Title */}
        <h1 className={`text-xl tracking-wide text-gray-300 ${timeComplete ? "text-red-600" : ""}`}>
          {timeComplete ? "Cannot Find" :  "Finding Opponent..."}
        </h1>

        {/* ⏱ Timer */}
        <div className="text-6xl font-semibold tracking-wider">
          {timer}s
        </div>

        {/* 🔄 Animated Dots */}
        <div className="flex gap-1 mt-2">
          <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-150" />
          <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-300" />
        </div>

        {/* 💡 Subtext */}
        <p className="text-sm text-gray-400 text-center max-w-xs">
          Matching you with a player of similar skill level...
        </p>

      </div>
    </div>
  );
}