"use client"
import { useSocket } from "@/app/hooks/useSocket";
import { Chess } from "chess.js";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Chessboard, PieceDropHandlerArgs } from "react-chessboard" ;

export default function ChessBoard () {
    const socket = useSocket() ;
    const {gameId} = useParams() ;
    const chessGameRef = useRef(new Chess()) ;
    const yourColor = useRef<"w"|"b"|null>(null) ;
    const playerId = useRef(null) ;
    const chessGame = chessGameRef.current ;
    const [chessPosition , setChessPosition] = useState(chessGame.fen()) ;

    useEffect(() => {
        if (!socket) return ;

        const handleMessage = (event : MessageEvent) => {
            const msg = JSON.parse(event.data) ;
            console.log(msg) ;

            if (msg.type === "game_state") {
                chessGameRef.current = new Chess(msg.gameState.fen);
                setChessPosition(msg.gameState.fen);
                playerId.current = msg.your ;

                if (msg.your === msg.gameState.white) {
                    console.log("White") ;
                    yourColor.current = "w";
                } else if (msg.your === msg.gameState.black) {
                    console.log("Black")
                    yourColor.current = "b";
                }
            }

            if (msg.type == "moveDone"){
                chessGameRef.current = new Chess(msg.fen) ;
                setChessPosition(msg.fen) ;
            }
        }

        socket.addEventListener("message" , handleMessage) ;
        return () => {
            socket.removeEventListener("message" , handleMessage) ;
        }
    }, [socket]) ;

    useEffect(() => {
        if (!socket) return ;

        socket.send(JSON.stringify({
            type : "game_state" ,
            gameId : gameId ,
        }))
    }, [socket]) ;

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

    const chessBoardOptions = {
        position : chessPosition ,
        onPieceDrop ,
        id : 'one-vs-one'
    }
    return (
        <div>
            <Chessboard options={chessBoardOptions} />            
        </div>
    )
}