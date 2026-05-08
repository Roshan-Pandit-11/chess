"use client"
import { Crown, Zap, Globe, BarChart3, Shield, Users, UserPlus } from "lucide-react";
import { useSocket } from "./hooks/useSocket";
import { useEffect, useRef, useState } from "react";
import { useSession , signIn , signOut } from "next-auth/react";
import { MatchMaking } from "./components/matchMaking";
import { useRouter } from "next/navigation";
import { randomUUID } from "crypto";

export default function Landing() {
  const socket = useSocket() ;
  const timer = useRef(0) ;
  const [isMatchMaking , setIsMatchMaking] = useState(false) ;
  const router = useRouter() ;
  const session = useSession() ;
  const [playerId , setPlayerId] = useState<string | null>(null) ;
  console.log(session.data) ;

  useEffect(() => {
      let id = localStorage.getItem("playerId") ;
    if (!playerId || playerId == null){
      id = crypto.randomUUID();
      localStorage.setItem("playerId" , id) ;
    }
    setPlayerId(id) ;
  }, []) ;

  useEffect(() => {
    if (!socket) return ;

    const socketMsg = (event : MessageEvent) => {
      const msg = JSON.parse(event.data) ;

      if (msg.type == "room_adding"){
        timer.current = 25 ;
        setIsMatchMaking(true) ;
      }

      if (msg.type == "room_added"){
        timer.current = 0 ;
        setIsMatchMaking(false) ;
        router.push(`game/${msg.gameId}`) ;
      }
    }

    socket.addEventListener("message" , socketMsg) ;

    return () => {
      socket.removeEventListener("message" , socketMsg) ;
    }
  }, [socket]) ;

  function handleLogin () {
    if (session.data?.user){
      signOut() ;
    }else{
      signIn() ;
    }
  }

  function joinRoom () {
    if (!session.data?.user) {
      signIn() ;
      return ;
    }
    if (!playerId) return ;
    socket?.send(JSON.stringify({
      type : "add_room" ,
      playerId
    }))
  }

  function cancelMatchMaking () {
    socket?.send(JSON.stringify({
      type : "remove_room" ,
      playerId
    }))
  }

  function onTimerCancel () {
    timer.current = 0 ;
    setIsMatchMaking(false) ;
    cancelMatchMaking() ;
  }

  return (
    <div className={`relative min-h-screen text-white overflow-hidden 
      bg-[#0A0A0F]
      bg-[radial-gradient(circle_at_20%_20%,rgba(230,201,122,0.08),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(198,168,90,0.06),transparent_40%)]`}>

        {isMatchMaking && (
        <div className="fixed inset-0 z-[999] backdrop-blur-2xl bg-black/40 flex items-center justify-center">
        <MatchMaking time={timer.current}  isTimeOver={onTimerCancel} onCancel={onTimerCancel}/>
        </div>
        )}

      {/* Noise */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03] mix-blend-overlay bg-[url('/noise.png')]" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50
        backdrop-blur-xl bg-white/[0.04]
        border-b border-[#E6C97A]/10
        shadow-[0_8px_30px_rgba(0,0,0,0.6)]">

        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <Crown className="w-6 h-6 text-[#E6C97A] group-hover:rotate-12 transition" />
            <span className="font-semibold tracking-tight">ChessMate</span>
          </div>

          <button onClick={() => {
            handleLogin() ;
          }} className={`h-9 px-4 rounded-md  
             border border-[#E6C97A]/20
            hover:scale-105 hover:border-[#33304d]
            transition ${!session.data?.user ? "bg-green-500/10" : "bg-red-500/10 "}`}>
            {session.data?.user ? "Sign Out" : "Sign In"}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center">

        {/* PREMIUM BACKGROUND */}
        <div className="absolute inset-0 pointer-events-none">

          {/* Glow blobs */}
          <div className="absolute top-[20%] left-[25%] w-[500px] h-[500px] 
            bg-[#E6C97A]/10 rounded-full blur-[140px]" />

          <div className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] 
            bg-[#C6A85A]/10 rounded-full blur-[120px]" />

          {/* Chess grid */}
          <div className="absolute inset-0 opacity-[0.04]
            bg-[linear-gradient(to_right,#E6C97A_1px,transparent_1px),linear-gradient(to_bottom,#E6C97A_1px,transparent_1px)]
            bg-[size:80px_80px]" />

          {/* Centerpiece king */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[420px] text-[#E6C97A]/4 blur-[6px] select-none">
              ♔
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 
            rounded-full border border-[#E6C97A]/20 
            text-[#E6C97A] text-sm">

            <span className="w-1.5 h-1.5 rounded-full bg-[#3eff52] animate-pulse" />
            Live players online
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-[-0.02em] leading-[1.05]">
            Play Chess Online{" "}
            <span className="bg-gradient-to-br from-[#C6A85A] to-[#F5E6B3] bg-clip-text text-transparent">
              Instantly
            </span>
          </h1>

          <p className="text-gray-400 max-w-xl mx-auto mt-6 mb-10 text-lg">
            Challenge players worldwide or sharpen your strategy. No downloads, no setup — just pure chess.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">

            <button onClick={() => {
              joinRoom()
            }} className="h-14 px-10 rounded-full font-semibold text-black
              bg-gradient-to-br from-[#E6C97A] to-[#C6A85A]
              shadow-[0_10px_40px_rgba(230,201,122,0.25)]
              hover:scale-105 active:scale-[0.98] transition">
              Play Now
            </button>

          </div>
        </div>

        {/* Bottom Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 
          bg-gradient-to-t from-[#0A0A0F] to-transparent" />
      </section>

    </div>
  );
}