import {Chess} from "chess.js" ;
import { createRedisClient } from "@repo/redis";

const subscriber = createRedisClient() ;
const publisher = createRedisClient() ;
const redis = createRedisClient() ;

async function main () {
    await subscriber.connect() ;
    await publisher.connect() ;
    await redis.connect() ;

    await subscriber.subscribe("makeMove" , async (data) => {
            const moveData = JSON.parse(data) ;
            const {gameId , from , to , your} = moveData ;

            const gameData = await redis.hGetAll(`game:${gameId}`) ;

            if (!gameData.fen){
                console.log("Game Not Found") ;
                return ;
            }

            const {white , black , fen} = gameData ;

            if (your !== white && your !== black){
                console.log("Invalid players");
                return ;
            }

            const playerColor = your === white ? "w" : "b" ;
            const game = new Chess(fen) ;
            if (game.turn() !== playerColor){
                console.log("Not Your turn");
                return ;
            }
                let move ;
                try {
                    move = game.move({
                        from , to , 
                        promotion : "q"
                    })
                } catch (error) {
                    console.log("Invalid Move Format");
                    return ;
                }

                if (!move){
                    console.log("Not Your turn");
                    return ;
                }

                await redis.hSet(`game:${gameId}` , {
                    fen : game.fen() ,
                })

                let status = "normal";
                if (game.isCheck()) status = "check" ;
                if (game.isDraw()) status = "draw" ;
                if (game.isCheckmate()) status = "checkMate" ;

                await publisher.publish("gameMove" , JSON.stringify({
                    gameId : gameId ,
                    fen : game.fen() ,
                    status : status
                })) ;
    })
}

main () ;