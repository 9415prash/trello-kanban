import { WebSocketServer, WebSocket } from "ws";

const server = new WebSocketServer({port: 3002});

const ROOMS: Record<string, {userId : string, socket : WebSocket}[]> = {

}

server.on("connection", (socket) => {

    socket.on("message", (data) =>{
        const parsedData = JSON.parse(data.toString());

        if(parsedData.type == "join"){
            const boardId = parsedData.boardId;
            if (!ROOMS[boardId]){
                ROOMS[boardId] = [];
            }
            const newUserId = Math.random().toString();
            ROOMS[boardId].push({userId : newUserId, socket : socket});

            socket.send(JSON.stringify({
                type : "initial_state",
                users : ROOMS[boardId].filter(x => x.userId != newUserId).map(u  => ({id : u.userId}))
            }))

            ROOMS[boardId].forEach(user => {
                user.socket.send(JSON.stringify({
                    type : "join",
                    userId : newUserId
                }))
            })
        }
    })

    socket.on("close", () => {
        Object.entries(ROOMS).forEach(([roomId, users]) => {
            const leaving = users.find(u => u.socket === socket);
            if (leaving) {
                ROOMS[roomId] = users.filter(x => x.socket !== socket);
                ROOMS[roomId].forEach(({socket}) => socket.send(JSON.stringify({
                    type : "leave",
                    userId : leaving.userId
                })))
            }
        })
    })
})
