export function parseHandshake(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

export function buildHandshakeResponse(peerId: number): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(peerId, 0);
  return buf;
}

export function parseClientMessage(buffer: Buffer) {
  const peerId = buffer.readUInt16BE(0);
  const commandId = buffer.readUInt16BE(2);
  const jsonStr = buffer.slice(4).toString("utf-8");
  return { peerId, commandId, json: JSON.parse(jsonStr) };
}
