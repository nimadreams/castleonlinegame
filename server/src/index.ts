import { createServer } from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { MatchRoom } from "./rooms/MatchRoom";
import { config } from "./config/config";

const httpServer = createServer();
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer })
});

gameServer.define("match", MatchRoom);

httpServer.listen(config.port, () => {
  console.log(`Game server listening on :${config.port}`);
});
