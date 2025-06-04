import { createCipheriv, randomBytes } from "crypto";
import { writeFileSync } from "fs";

const AES_KEY = Buffer.from("01234567890123456789012345678901");
const AES_IV = randomBytes(16);

// Сборка, реверс, шифрование финального файла
export function finalizeResult(
  receivedChunks: Map<number, Float32Array>,
  totalSize: number
) {
  // 1. Сортировка в правильном порядке
  const sortedIndices = Array.from(receivedChunks.keys()).sort((a, b) => a - b);
  const resultArray = new Float32Array(totalSize);

  let offset = 0;
  for (const index of sortedIndices) {
    const chunk = receivedChunks.get(index);
    if (!chunk) {
      throw new Error(`Missing chunk at index ${index}`);
    }
    resultArray.set(chunk, offset);
    offset += chunk.length;
  }

  // 2. Реверс
  resultArray.reverse();

  // 3. Конвертация в Buffer
  const floatBuffer = Buffer.alloc(resultArray.length * 4);
  for (let i = 0; i < resultArray.length; i++) {
    floatBuffer.writeFloatBE(resultArray[i], i * 4);
  }

  // 4. AES-256-CBC шифрование
  const cipher = createCipheriv("aes-256-cbc", AES_KEY, AES_IV);
  const encrypted = Buffer.concat([
    AES_IV,
    cipher.update(floatBuffer),
    cipher.final(),
  ]);

  // 5. Запись в файл
  writeFileSync("output.enc", encrypted);
  console.log("Encrypted output saved to output.enc");
}
