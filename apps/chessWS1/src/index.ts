import {WebSocketServer , WebSocket} from "ws" ;
import { Chess } from "chess.js";
import {randomUUID} from "crypto" ;

const wss = new WebSocketServer({port : 8080}) ;
let players : WebSocket[] = [] ;
let games : {
    gameId : string ,
    game : Chess ,
    wSocket : WebSocket ,
    bSocket : WebSocket ,
}[] = [] ;

wss.on("connection" , (ws) => {
    ws.on("error" , (err) => {
        console.error(err) ;
    })

    ws.on("message" , (data) => {
        const msg = JSON.parse(data.toString()) ;
        
        if (msg.type == "add_room"){
            if (players.length == 0){
                players.push(ws) ;
                ws.send(JSON.stringify({
                    type : "add_room" ,
                    msg : "Waiting for another player"
                }))
            }else{
                const player1 = players.pop() ;
                if (player1 == undefined){
                    ws.send(JSON.stringify({
                        type : "add_room" ,
                        msg : "Unable to find player"
                    }))
                    return ;
                }
                const game = new Chess() ;
                const gameId = randomUUID() ;
                games.push({
                    gameId : gameId ,
                    game : game ,
                    wSocket : player1 ,
                    bSocket : ws ,
                })
                player1.send(JSON.stringify({
                    type : "room_added" ,
                    gameId : gameId ,
                    fen : game.fen() ,
                    your : "white" ,
                }))
                ws.send(JSON.stringify({
                    type : "room_added" ,
                    gameId : gameId ,
                    fen : game.fen() ,
                    your : "black"
                }))
            }
        }

        if (msg.type == "move"){
           const gameId = msg.gameId ;
           const game = games.find((game) => game.gameId == gameId) ;
           if (game == undefined){
                ws.send(JSON.stringify({
                    type : "no_room" ,
                    msg : "No Room Found"
                }))
            return ;
           }
           if (ws !== game.wSocket && ws !== game.bSocket) {
            ws.send(JSON.stringify({
                type: "error",
                msg: "You are not part of this game"
            }));
                return;
            }

           const isWhite = ws === game.wSocket ;
           if ((game.game.turn() === "w" && !isWhite) || (game.game.turn() === "b" && isWhite)) {
                ws.send(JSON.stringify({
                    type : "turn" ,
                    msg : "Not Your Turn"
                }))
            return ;
           }

           const sourceSquare = msg.sourceSquare ;
           const targetSquare = msg.targetSquare ;

            if (!targetSquare) {
                console.log("No target") ;
                ws.send(JSON.stringify({
                    type : "move" ,
                    msg : "Invalid Target Square"
                }))
                return ;
            }

            try {
            const move = game?.game.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: "q"
            });

            if (move == null || move == undefined) {
                console.log("Invalid move");
                ws.send(JSON.stringify({
                    type : "move" ,
                    msg : "Invalid Move"
                }))
                return ; 
            }
            const isCheckMate = game.game.isCheckmate()
            const isDraw = game.game.isDraw()
            const isGameOver = isCheckMate || isDraw

            const isCheck = !isGameOver && game.game.isCheck()
            const fen = game?.game.fen() ;
            if (game.bSocket.readyState === WebSocket.OPEN){
                game.bSocket.send(JSON.stringify({
                type : "move" ,
                fen : fen ,
                isCheck , isCheckMate , isDraw , isGameOver 
            }))
            }
            if (game.wSocket.readyState === WebSocket.OPEN){
                game.wSocket.send(JSON.stringify({
                type : "move" ,
                fen : fen , 
                isCheck , isCheckMate , isDraw , isGameOver 
            }))
            }
            if (isGameOver){
                games = games.filter((game) => game.gameId !== gameId) ;
            }
            return ;
            } catch (error) {
                console.log("Not You Move") ;
                return ;
            }
        }
    })

})