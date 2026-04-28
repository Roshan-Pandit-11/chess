import { createClient } from "redis";

export function createRedisClient () {
    const client = createClient() ;

    client.on("error" , (err) => {
        console.error("Redis error" , err) ;
    })

    return client ;
}