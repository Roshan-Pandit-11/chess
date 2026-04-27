"use client";

import { useEffect, useState } from "react";

export function useSocket () {
    const [socket , setSocket] = useState<WebSocket | null>(null) ;

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:8080") ;

        ws.onopen = () => {
            setSocket(ws) ;
        }

        ws.onclose = () => {
            setSocket(null) ;
        }

        ws.onerror = () => {
            ws.close() ;
        }

        return () => {
            ws.close() ;
        }
    }, []) ;
    return socket ;
}