import WebSocket from "ws";
import dotenv from "dotenv";
dotenv.config();

const wsUrl = process.env.WS_URL || "";
const PORT = process.env.PORT || 3000;

const ws = new WebSocket(`${wsUrl}:${PORT}`);

const nickname = Buffer.from("test-client");

ws.on("open", () => {
  console.log("Connected to server, sending handshake...");
  ws.send(nickname);
});

let peerId: number;

ws.once("message", (data: Buffer) => {
  peerId = data.readUInt16BE(0);
  console.log("Received peerId:", peerId);

  requestTask();
});

ws.on("message", (data: Buffer) => {
  if (data.length <= 4) return;

  const receivedPeerId = data.readUInt16BE(0);
  const commandId = data.readUInt16BE(2);
  const jsonStr = data.slice(4).toString("utf-8");

  const { chunk, startIndex } = JSON.parse(jsonStr);

  if (commandId === 1 && chunk) {
    console.log("Received task chunk");

    const result = chunk.map((f: number) => -f);

    const payload = Buffer.from(JSON.stringify({ result, startIndex }));
    const header = Buffer.alloc(4);
    header.writeUInt16BE(peerId, 0);
    header.writeUInt16BE(2, 2);
    ws.send(Buffer.concat([header, payload]));

    console.log("Sent processed chunk, requesting next...");
    requestTask();
  }
});

function requestTask() {
  const header = Buffer.alloc(4);
  header.writeUInt16BE(peerId, 0);
  header.writeUInt16BE(1, 2);
  const payload = Buffer.from(JSON.stringify({}));
  ws.send(Buffer.concat([header, payload]));
}
