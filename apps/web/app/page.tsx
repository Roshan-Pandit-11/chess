"use client"
import randomUUID from "crypto" ;
import { useEffect, useRef, useState } from "react";
import { Chessboard, PieceDropHandlerArgs } from "react-chessboard";
import { useSocket } from "./hooks/useSocket";

export default function Home() {
  const [fen, setFen] = useState();
  const socket = useSocket() ;
  const [gameId , setGameId] = useState(null) ;

  useEffect(() => {
    if (!socket) return ;

      socket.send(JSON.stringify({
        type : "add_room"  
      }))

    socket.onmessage = (dataStream) => {
      const msg = JSON.parse(dataStream.data) ;
      
      if (msg.type == "room_added"){
        setFen(msg.fen) ;
        setGameId(msg.gameId) ;
      }

      if (msg.type == "move"){
        setFen(msg.fen) ;
        if (msg.isCheck){
          alert("check") ;
        }
      }
    }
    return () => {
      socket.close() ;
    }
  }, [socket]) ;

  function onPieceDrop ({sourceSquare , targetSquare} : PieceDropHandlerArgs) {
    if (!targetSquare || !socket){
      return false ;
    }

    socket.send(JSON.stringify({
      type : "move" ,
      gameId : gameId ,
      sourceSquare : sourceSquare ,
      targetSquare : targetSquare 
    }))

    return true ;
    
  }

  const chessBoardOptions = {
    position : fen ,
    onPieceDrop ,
    id : "abc_hd"
  }

  return (
    <div className="flex">
      <div>CHESS</div>
      <div>
        <Chessboard  options={chessBoardOptions} />
      </div>
    </div>
  );
}
