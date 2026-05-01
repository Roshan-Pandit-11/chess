import {WebSocketServer , WebSocket} from "ws" ;
import { Chess } from "chess.js";
import {randomUUID} from "crypto" ;
import { createRedisClient } from "@repo/redis";

const wss = new WebSocketServer({port : 8080}) ;
const socketMap = new Map<string , WebSocket>() ;

const queueClient = createRedisClient() ;
const subscriber = createRedisClient() ;
const publisher = createRedisClient() ;
const redis = createRedisClient() ;

async function main () {
    await queueClient.connect() ;
    await subscriber.connect() ;
    await publisher.connect() ;
    await redis.connect() ;

    const gameInit = await subscriber.subscribe("gameInit" , (data) => {
    const msg = JSON.parse(data) ;
    const {players , gameId} = msg ;

    const wsWhite = socketMap.get(players.white) ;
    const wsBlack = socketMap.get(players.black) ;

    if (!wsWhite && !wsBlack){
        return ;
    }

    const game = new Chess() ;

    async function setGame () {
        await redis.hSet(`game:${gameId}` ,{
            white : players.white , 
            black : players.black ,
            fen : game.fen()
        }) ;
    }
    setGame() ;

    wsWhite?.send(JSON.stringify({
        type : "room_added" ,
        gameId ,
        your : players.white ,
        fen : game.fen() 
    }))
    wsBlack?.send(JSON.stringify({
        type : "room_added" ,
        gameId ,
        your : players.black ,
        fen : game.fen() 
    }))
    });

    const gameMove = await subscriber.subscribe("gameMove" , (data) => {
        const moveData = JSON.parse(data) ;
        const {gameId , fen , status} = moveData ;
        if (!moveData.fen) return ;

        async function getGame() {
            const game = await redis.hGetAll(`game:${gameId}`) ;
            if (!game.fen){
                console.log("Game Not Found") ;
                return ;
            }
            const {white , black} = game ;
            if (!white || !black) {
                console.log("Player Not Found") ;
                return ;
            }

            const wsWhite = socketMap.get(white) ; 
            const wsBlack = socketMap.get(black) ; 

            if (!wsWhite && !wsBlack) {
                console.log("WebSocket Not Found") ;
                return ;
            }

            if (wsWhite?.readyState){
                wsWhite.send(JSON.stringify({
                    type : "moveDone" ,
                    fen : fen ,
                    status : status ,
                }))
            }
            if (wsBlack?.readyState){
                wsBlack.send(JSON.stringify({
                    type : "moveDone" ,
                    fen : fen ,
                    status : status ,
                }))
            }
        }
        getGame() ;
    })
}
main() ;

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
           const makeMove = await publisher.publish("makeMove" , JSON.stringify({
                gameId : gameId ,
                from : msg.from ,
                to : msg.to ,
                your : msg.your
            }))
        }

        if (msg.type == "moveDone"){
           const makeMove = await publisher.publish("makeMove" , JSON.stringify({
                fen : msg.fen ,
                status : msg.status 
            }))
        }

    })

})