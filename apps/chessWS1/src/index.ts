import {WebSocketServer , WebSocket} from "ws" ;
import { Chess } from "chess.js";
import {randomUUID} from "crypto" ;
import { createRedisClient } from "@repo/redis";

const wss = new WebSocketServer({port : 8080}) ;
const socketMap = new Map<string , WebSocket>() ;
const gameMap = new Map<string , Chess>() ;


const queueClient = createRedisClient() ;
const subscriber = createRedisClient() ;
const publisher = createRedisClient() ;

async function main () {
    await queueClient.connect() ;
    await subscriber.connect() ;
    await publisher.connect() ;
}

main () ;

const gameInit = subscriber.subscribe("gameInit" , (data) => {
    const msg = JSON.parse(data) ;
    const {players , gameId} = msg ;

    const wsWhite = socketMap.get(players.white) ;
    const wsBlack = socketMap.get(players.black) ;

    if (!wsWhite && !wsBlack){
        return ;
    }

    const game = new Chess() ;
    gameMap.set(gameId , game) ;

    async function setGame () {
        await publisher.hSet(`game:${gameId}` ,{
            white : players.white , 
            black : players.black ,
            fen : game.fen()
        }) ;
    }
    setGame() ;

    wsWhite?.send(JSON.stringify({
        type : "room_added" ,
        gameId ,
        your : "w" ,
        fen : game.fen() 
    }))
    wsBlack?.send(JSON.stringify({
        type : "room_added" ,
        gameId ,
        your : "b" ,
        fen : game.fen() 
    }))
});


wss.on("connection" , (ws) => {
    ws.on("error" , (err) => {
        console.error(err) ;
    })

    ws.on("message" , async (data) => {
        const msg = JSON.parse(data.toString()) ;
        
        if (msg.type == "add_room"){
            const playerId = randomUUID() ;
            socketMap.set(playerId , ws) ;

            const matchMaking = await queueClient.lPush("matchMaking" , playerId) ;

        }

        if (msg.type == "room_added"){
            ws.send(JSON.stringify({
                type : "room_added" ,
                gameId : msg.gameId ,
                your : msg.your ,
                fen : msg.fen 
            }))
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