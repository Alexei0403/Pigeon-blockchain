import { Server } from "socket.io";
import PumpSocket from "./socket-modules/pump-socket";

export const setupSockets = (io: Server) => {
    const sockets = [PumpSocket]
    sockets.map(socket => new socket(io))
}