"use client";

import { Crown, Home, RotateCcw, Swords } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSocket } from "../hooks/useSocket";
import { useEffect, useState } from "react";
import { ParamValue } from "next/dist/server/request/params";

type GameEndProps = {
  result?: "win" | "lose" | "draw";
  gameId : ParamValue ,
};

export default function GameEnd({
  result = "draw",
  gameId ,
}: GameEndProps) {
  const router = useRouter();
  const socket = useSocket() ;
  const [playerId , setPlayerId] = useState<string|null>(null) ;
  const [oppWantToPlay , setOppWantToPlay] = useState(false) ;
  const [oppRemoved , setOppRemoved] = useState(false) ;

  useEffect(() => {
        let id = localStorage.getItem("playerId") ;
        if (!playerId){
            id = crypto.randomUUID();
            localStorage.setItem("playerId" , id) ;
        }
        setPlayerId(id) ;
    }, []) ;

  useEffect(() => {
    if (!socket) return ;
    const handleMessage = (e : MessageEvent) => {
      const msg = JSON.parse(e.data) ;
      if (msg.type == "play_again"){
        setOppWantToPlay(true) ;
      }
    }

    socket.addEventListener("message" , handleMessage) ;
    return () => {
      socket.removeEventListener("message" , handleMessage) ;
    }
  }, [socket]) ;

  function playAgain () {
    if (!gameId) return ;
    if (!socket) {
        alert("Try Again") ;
        return ;
    }
    socket.send(JSON.stringify({
        type : "play_again" ,
        gameId ,
        playerId
    }))
  }

  return (
  <div className="min-h-screen flex items-center justify-center px-4 bg-transparent">
    
    {/* Main Card */}
    <div className="relative overflow-hidden w-full max-w-md rounded-[32px] border border-white/10 bg-[#111827]/80 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] p-8 text-white">
      
      {/* Glow Effects */}
      <div className="absolute -top-24 -left-24 h-48 w-48 bg-yellow-500/20 blur-3xl rounded-full" />
      <div className="absolute -bottom-24 -right-24 h-48 w-48 bg-orange-500/10 blur-3xl rounded-full" />

      {/* Content */}
      <div className="relative z-10">
        
        {/* Top Icon */}
        <div className="flex justify-center mb-6">
          <div
            className={`
              relative flex items-center justify-center
              h-24 w-24 rounded-full border
              ${
                result === "win"
                  ? "bg-yellow-500/15 border-yellow-400/30"
                  : result === "lose"
                  ? "bg-red-500/15 border-red-400/30"
                  : "bg-gray-500/15 border-gray-300/20"
              }
            `}
          >
            {/* Pulse Ring */}
            <div
              className={`
                absolute inset-0 rounded-full animate-ping opacity-20
                ${
                  result === "win"
                    ? "bg-yellow-400"
                    : result === "lose"
                    ? "bg-red-400"
                    : "bg-gray-300"
                }
              `}
            />

            <Crown
              size={44}
              className={
                result === "win"
                  ? "text-yellow-400"
                  : result === "lose"
                  ? "text-red-400"
                  : "text-gray-300"
              }
            />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1
            className={`
              text-5xl font-extrabold tracking-tight
              ${
                result === "win"
                  ? "text-yellow-400"
                  : result === "lose"
                  ? "text-red-400"
                  : "text-gray-200"
              }
            `}
          >
            {result === "win"
              ? "Victory"
              : result === "lose"
              ? "Defeat"
              : "Draw"}
          </h1>

          <p className="mt-3 text-gray-400 text-sm tracking-wide uppercase">
            Game Finished
          </p>
        </div>

        {/* Divider */}
        <div className="my-8 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Buttons */}
        <div className="flex flex-col gap-4">
          {oppWantToPlay && <div className="px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-green-500/10 to-teal-500/20 border border-emerald-400/30 backdrop-blur-xl text-emerald-300 font-bold text-lg tracking-wide shadow-[0_0_30px_rgba(16,185,129,0.35)] animate-pulse text-center">
        ♟️ Opponent Wants To Play Again
        </div>}
          {/* Play Again */}
          <button
            onClick={() => {
              playAgain() ;
            }}
            className={`
              group relative overflow-hidden
              w-full rounded-2xl py-3.5
               text-black font-semibold
              transition-all duration-300
              hover:scale-[1.02]
              shadow-lg shadow-yellow-500/20
             ${oppWantToPlay ? "bg-green-500 hover:bg-green-400" : "bg-yellow-500 hover:bg-yellow-400"}`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <RotateCcw
                size={20}
                className="transition-transform duration-300 group-hover:rotate-180"
              />
              Play Again
            </span>

            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-white/10" />
          </button>

          {/* New Match */}
          <button
            onClick={() => router.push("/matchmaking")}
            className="
              group w-full rounded-2xl py-3.5
              border border-white/10
              bg-white/5 hover:bg-white/10
              transition-all duration-300
              hover:scale-[1.02]
            "
          >
            <span className="flex items-center justify-center gap-2">
              <Swords
                size={20}
                className="transition-transform duration-300 group-hover:rotate-12"
              />
              New Match
            </span>
          </button>

          {/* Home */}
          <button
            onClick={() => router.push("/")}
            className="
              group w-full rounded-2xl py-3.5
              border border-white/10
              bg-transparent hover:bg-white/5
              transition-all duration-300
              hover:scale-[1.02]
            "
          >
            <span className="flex items-center justify-center gap-2">
              <Home
                size={20}
                className="transition-transform duration-300 group-hover:-translate-x-1"
              />
              Back To Home
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
);
}