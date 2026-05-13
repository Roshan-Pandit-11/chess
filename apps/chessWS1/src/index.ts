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
        white : players.white , 
        black : players.black ,
        fen : game.fen() 
    }))
    wsBlack?.send(JSON.stringify({
        type : "room_added" ,
        gameId ,
        your : players.black ,
        white : players.white , 
        black : players.black ,
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
            const playerId = msg.playerId ;
            socketMap.set(playerId , ws) ;
            (ws as any).playerId = playerId ;
            const matchMaking = await queueClient.lPush("matchMaking" , playerId) ;
            await redis.set(`player:${playerId}` , "waiting") ;
            ws.send(JSON.stringify({
                type : "room_adding" ,
                msg : "please Wait"
            }))
        }

        if (msg.type == "remove_room"){
            const playerId = (ws as any).playerId ;
            await redis.set(`player:${playerId}` , "cancelled") ;
            await queueClient.lRem("matchMaking" , 0, playerId) ;
            ws.send(JSON.stringify({
                type : "removed" ,
                msg : "removed from matchMaking"
            }))
        }

        if (msg.type == "room_added"){
            ws.send(JSON.stringify({
                type : "room_added" ,
                gameId : msg.gameId ,
                your : msg.black ,
                white : msg.white , 
                black : msg.black ,
                fen : msg.fen 
            }))
        }

        if (msg.type == "game_state"){
            const playerId = msg.playerId ;
            (ws as any).playerId = playerId ;
            const gameState = await redis.hGetAll(`game:${msg.gameId}`) ;
            ws.send(JSON.stringify({
                type : "game_state" ,
                gameId : msg.gameId ,
                gameState : gameState ,
                your : playerId 
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

        if (msg.type == "player_data"){
            const {playerId , gameId} = msg ;
            const game = await redis.hGetAll(`game:${gameId}`) ;
            if (!game) return ;
            const wsWhite = socketMap.get(game.white as string) ;
            const wsBlack = socketMap.get(game.black as string) ;
            if (!wsWhite || !wsBlack) return ;
            if (playerId == game.black){
                wsWhite.send(JSON.stringify({
                    type : "player_data" ,
                    gameId ,
                    name : msg.name ,
                    img : msg.img 
                }))
            }else{
                wsBlack.send(JSON.stringify({
                    type : "player_data" ,
                    gameId ,
                    name : msg.name ,
                    img : msg.img 
                }))
            }

        }

        // if (msg.type == "moveDone"){
        //    const makeMove = await publisher.publish("makeMove" , JSON.stringify({
        //         fen : msg.fen ,
        //         status : msg.status 
        //     }))
        // }

        if (msg.type == "register_socket"){
            const playerId = msg.playerId ;
            socketMap.set(playerId , ws) ;
            (ws as any).playerId = playerId ;
        }

        if (msg.type == "play_again"){
            const playerId = msg.playerId ;
            const gameId = msg.gameId ;

            const game = await redis.hGetAll(`game:${gameId}`) ;
            if (!game) return ;

            const wsBlack = socketMap.get(`${game.black}`) ;
            const wsWhite = socketMap.get(`${game.white}`) ;

            if (!wsBlack || !wsWhite) {
                ws.send(JSON.stringify({
                    type : "Socket_dies"
                }))
                return ;
            }

            const checkOppWantToPlay = await redis.get(`${gameId}`) ;

            if (!checkOppWantToPlay || checkOppWantToPlay == null){
                
                await redis.set(`${gameId}` , playerId) ;
                if (playerId == game.black){
                    wsWhite.send(JSON.stringify({
                        type : "play_again" ,
                    }))
                    return ;
                }else{
                    wsBlack.send(JSON.stringify({
                        type : "play_again" ,
                    }))
                    return ;
                }
            }
            await redis.del(`${gameId}`) ;
            const newGame = new Chess() ;
            await redis.hSet(`game:${gameId}` , {
                fen : newGame.fen() 
            })
            wsWhite.send(JSON.stringify({
                type : "play_again_done" ,
                fen : newGame.fen() 
            }))
            wsBlack.send(JSON.stringify({
                type : "play_again_done" ,
                fen : newGame.fen() 
            }))
        }

    })

    ws.on("close" , async () => {
        const playerId = (ws as any).playerId ;
        if (playerId) {
            await queueClient.lRem("matchMaking" , 0 , playerId) ;
            socketMap.delete(playerId) ;
        }
    })

})