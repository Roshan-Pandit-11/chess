"use client"
import GameEnd from "@/app/components/gameEnd";
import { useSocket } from "@/app/hooks/useSocket";
import { Chess } from "chess.js";
import { randomUUID } from "crypto";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Chessboard, PieceDropHandlerArgs } from "react-chessboard" ;

export default function ChessBoard () {
    const socket = useSocket() ;
    const session = useSession() ;
    const {gameId} = useParams() ;
    const chessGameRef = useRef(new Chess()) ;
    const yourColor = useRef<"w"|"b"|null>(null) ;
    const playerId = useRef(null) ;
    const chessGame = chessGameRef.current ;
    const [chessPosition , setChessPosition] = useState(chessGame.fen()) ;
    const [orientation , setOrientation] = useState<"black" | "white">("white") ;
    const [localplayerId , setLocalPlayerId] = useState<string | null>(null) ;
    const [gameStatus , setGameStatus] = useState<"check"|"draw"|"checkMate"|"normal">("normal") ;
    const [gameResult , setGameResult] = useState<"draw"|"lose"|"win"|undefined>(undefined);
    const [isMe , setIsMe] = useState(false);
    const [opp , setOpp] = useState<{name : string , image : string}>({
        name : "XYZ" ,
        image : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdqurvyQBpNu1ArhdFfuGnNY_4GXDHjQjnmg&s"
    }) ;
    const [gameOver , setGameOver] = useState(false) ;

    useEffect(() => {
        let id = localStorage.getItem("playerId") ;
        if (!playerId){
            id = crypto.randomUUID();
            localStorage.setItem("playerId" , id) ;
        }
        setLocalPlayerId(id) ;
    }, []) ;

    useEffect(() => {
        if (!socket) return ;

        const handleMessage = (event : MessageEvent) => {
            const msg = JSON.parse(event.data) ;
            console.log(msg) ;

            if (msg.type == "player_data"){
                setOpp({
                    name : msg.name ,
                    image : msg.img
                })
            }

            if (msg.type === "game_state") {
                chessGameRef.current = new Chess(msg.gameState.fen);
                setChessPosition(msg.gameState.fen);
                playerId.current = msg.your ;

                if (msg.your === msg.gameState.white) {
                    console.log("White") ;
                    yourColor.current = "w";
                    setOrientation("white");
                } else if (msg.your === msg.gameState.black) {
                    console.log("Black")
                    yourColor.current = "b";
                    setOrientation("black");
                }
            }

            if (msg.type == "moveDone"){
                chessGameRef.current = new Chess(msg.fen) ;
                setChessPosition(msg.fen) ;
                setGameStatus(msg.status) ;
            }

            if (msg.type == "play_again_done"){
                console.log("HEllo") ;
                chessGameRef.current = new Chess(msg.fen) ;
                setChessPosition(msg.fen) ;
                setGameStatus("normal") ;
                handleCancel() ;
            }
        }

        socket.addEventListener("message" , handleMessage) ;
        return () => {
            socket.removeEventListener("message" , handleMessage) ;
        }
    }, [socket]) ;

    useEffect(() => {
        if (gameStatus == "normal") {
            setIsMe(false) ;
            return ;
        }

        if (gameStatus == "checkMate" || gameStatus == "draw"){
            if (gameStatus == "draw") {
                setGameResult("draw") ;
            }
            if (gameStatus == "checkMate"){
                if (chessGame.turn() == yourColor.current){
                    setGameResult("lose") ;
                }
            }else{
                setGameResult("win") ;
            }
            setGameOver(true) ;
        }

        if (chessGame.turn() == yourColor.current){
            setIsMe(true) ;
        }

    }, [gameStatus]) ;

    useEffect(() => {
        if (!socket || !localplayerId) return ;

        socket.send(JSON.stringify({
            type : "player_data" ,
            gameId ,
            playerId : localplayerId ,
            name : session.data?.user?.name ,
            img : session.data?.user?.image
        }))

        socket.send(JSON.stringify({
            type : "game_state" ,
            gameId : gameId ,
            playerId : localplayerId
        }))

    }, [socket , localplayerId]) ;

    useEffect(() => {
        if (!socket || !localplayerId) return ;

        const registerSocket = () => {
            socket.send(JSON.stringify({
                type : "register_socket" ,
                playerId : localplayerId
            }))
        }

        if (socket.readyState === WebSocket.OPEN){
            registerSocket() ;
        }else{
            socket.addEventListener("open" , registerSocket) ;
            return () => {
                socket.removeEventListener("open" , registerSocket) ;
            }
        }
    }, [socket , localplayerId]) ;

    function onPieceDrop ({
        sourceSquare ,
        targetSquare 
    } : PieceDropHandlerArgs) {
        if (!targetSquare) {
            console.log("No Target Square");
            return false ;
        }
        const game = chessGameRef.current ;
        if (game.turn() !== yourColor.current){
            console.log("Not your Turn")
            return false ;
        }

        const piece = game.get(sourceSquare as any);
            if (!piece || piece.color !== yourColor.current) {
            console.log("Something")
            return false;
        }

        const temp = new Chess(game.fen()) ;
        try {
            const move = temp.move({
                from : sourceSquare ,
                to : targetSquare ,
                promotion : "q"
            }) ;
            if (!move) return false ;
        } catch (error) {
            return false ;
        }

        socket?.send(JSON.stringify({
            type : "move" ,
            gameId : gameId ,
            from : sourceSquare ,
            to : targetSquare ,
            your : playerId.current
        }))
        return true ;
    }

    function handleCancel () {
        setGameStatus("normal") ;
        setGameResult(undefined) ;
        setGameOver(false) ;
        setIsMe(false) ;
    }

    const chessBoardOptions = {
        position : chessPosition ,
        onPieceDrop ,
        boardOrientation:orientation,
        id : 'one-vs-one' ,
    }
    return (
  <div className="fixed inset-0 bg-[#1a2127] text-white overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4">
    {/* Main Game Container - Constraints prevent overflow */}
    {gameOver && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">{<GameEnd result={gameResult} gameId={gameId}/>}</div>}

    <div className={`w-full max-w-[min(90vh,700px)] flex flex-col gap-2 ${gameOver && "blur-sm"}`}>
      
      {/* Opponent Info (Top) */}
      <div className="flex items-center gap-3 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
        <img
          src={opp.image || "/default-avatar.png"}
          alt="Opponent"
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-md object-cover border border-zinc-700"
        />
        <div className="flex flex-col">
          <span className="text-sm sm:text-base font-semibold text-zinc-200 truncate max-w-[150px]">
            {opp.name || "Opponent"}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Opponent</span>
        </div>
      </div>

      {/* Chessboard Wrapper */}
      <div className="relative aspect-square w-full shadow-2xl rounded-sm overflow-hidden border-2 border-zinc-800">
        <Chessboard
          options={chessBoardOptions}
          boardWidth={
            typeof window !== "undefined"
              ? Math.min(window.innerWidth - 32, window.innerHeight - 200, 700)
              : 700
          }
        />
      </div>

      {/* Player Info (Bottom) */}
      <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded-lg border border-white/10">
        <div className="flex items-center gap-3">
          <img
            src={session.data?.user?.image || "/default-avatar.png"}
            alt="Player"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-md object-cover border border-zinc-700"
          />
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-semibold text-zinc-200 truncate max-w-[150px]">
              {session.data?.user?.name || "You"}
            </span>
            <span className="text-[10px] text-green-500 uppercase tracking-wider font-bold">You</span>
          </div>
        </div>
        {(isMe && gameStatus != "normal") && <div className="px-4 py-2 rounded-2xl bg-red-500/35 border border-red-500/40 backdrop-blur-xl shadow-[0_0_30px_rgba(239,68,68,0.35)]">{gameStatus}</div>}
      </div>

    </div>
  </div>
);
}