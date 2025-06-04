import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import {
  parseHandshake,
  buildHandshakeResponse,
  parseClientMessage,
} from "./binaryProtocol";
import { assignTask, handleResult, reassignTask } from "./taskManager";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT ?? 3000;

let peerIdCounter = 1;
const clients = new Map<number, WebSocket>();

wss.on("connection", (ws) => {
  ws.once("message", (data: Buffer) => {
    const nickname = parseHandshake(data);
    const peerId = peerIdCounter++;
    clients.set(peerId, ws);
    ws.send(buildHandshakeResponse(peerId));

    ws.on("message", (message: Buffer) => {
      const { peerId, commandId, json } = parseClientMessage(message);
      if (commandId === 1) assignTask(peerId, ws);
      if (commandId === 2) handleResult(peerId, json);
    });

    ws.on("close", () => {
      clients.delete(peerId);
      reassignTask(peerId);
    });
  });
});

server.listen(PORT, () => console.log(`Server started on PORT ${PORT}`));
