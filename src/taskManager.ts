import WebSocket from "ws";
import { finalizeResult } from "./finalize";
import dotenv from "dotenv";
dotenv.config();

const chunkSize = Number(process.env.CHUNK_SIZE);
const totalSize = Number(process.env.TOTAL_SIZE);

if (isNaN(chunkSize) || isNaN(totalSize)) {
  throw new Error("CHUNK_SIZE and TOTAL_SIZE must be valid numbers in .env");
}

const fullData = new Float32Array(totalSize);
let currentIndex = 0;

type Task = {
  startIndex: number;
  chunk: Float32Array;
};

const tasks: Record<number, Task> = {};
const receivedChunks: Map<number, Float32Array> = new Map();

// Определение следующего участка данных для обработки
export function getNextChunk(): {
  startIndex: number;
  chunk: Float32Array;
} | null {
  if (currentIndex >= totalSize) return null;

  const end = Math.min(currentIndex + chunkSize, totalSize);
  const chunk = fullData.slice(currentIndex, end);
  const result = { startIndex: currentIndex, chunk };
  currentIndex = end;

  return result;
}

// Назначение и отправка задачи клиенту
export function assignTask(peerId: number, ws: WebSocket) {
  const next = getNextChunk();
  if (!next) {
    console.log("No more tasks to assign");
    return;
  }

  tasks[peerId] = next;

  const message = Buffer.from(
    JSON.stringify({ chunk: Array.from(next.chunk) })
  );
  const header = Buffer.alloc(4);
  header.writeUInt16BE(peerId, 0);
  header.writeUInt16BE(1, 2);

  ws.send(Buffer.concat([header, message]));
  console.log(`Sent chunk at ${next.startIndex} to peer ${peerId}`);
}

// Обработка результата от клиента
export function handleResult(peerId: number, data: any) {
  const floatChunk = new Float32Array(data.result);

  const task = tasks[peerId];
  if (!task) {
    console.log(`No task assigned for peer ${peerId}`);
    return;
  }

  const { startIndex } = task;

  receivedChunks.set(startIndex, floatChunk);
  delete tasks[peerId];

  console.log(`Received result from peer ${peerId} (chunk at ${startIndex})`);

  // Проверка, все ли чанки собраны
  if (receivedChunks.size * chunkSize >= totalSize) {
    console.log("All chunks received. Finalizing...");
    finalizeResult(receivedChunks, totalSize);
  }
}

// Перераспределение задачи, если клиент отключился
export function reassignTask(peerId: number) {
  const task = tasks[peerId];
  if (!task) return;

  // Возвращаем чанк назад в очередь
  currentIndex = Math.min(currentIndex, task.startIndex);
  delete tasks[peerId];
  console.log(
    `Task at ${task.startIndex} returned due to disconnect of peer ${peerId}`
  );
}
