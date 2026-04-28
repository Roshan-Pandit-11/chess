import express from "express" ;
import {randomUUID} from "crypto" ;
import {createRedisClient} from "@repo/redis" ;

const app = express() ;
app.use(express.json()) ;

async function matchMaking () {

    const queueClient = createRedisClient() ;
    const publisher = createRedisClient() ;
    await queueClient.connect() ;
    await publisher.connect() ;

    while (true) {
        try {
            const player1 = await queueClient.brPop("matchMaking" , 0) ;
            const p1 = player1?.element ;
            if (!p1) continue ;

            const player2 = await queueClient.brPop("matchMaking" , 5) ;
            const p2 = player2?.element ;

            if (!p2){
                await queueClient.lPush("matchMaking" , p1) ;
                continue ;
            }
            
            await publisher.publish("gameInit" , JSON.stringify({
                gameId : randomUUID() ,
                players : {
                    white : p1 ,
                    black : p2
                }
            }))
        } catch (error) {
            console.error("Worker error" , error) ;
        }
    }
}

matchMaking() ;