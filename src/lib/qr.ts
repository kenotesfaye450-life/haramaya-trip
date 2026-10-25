import { encodeTicketPayload } from "@/lib/tickets";

/**
 * Minimal, zero-dependency, self-contained QR Code SVG generator (Model 2).
 * Supports Byte encoding mode with Error Correction Level L/M.
 */

// Galois Field GF(256) tables with primitive polynomial 0x11d (285)
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  EXP[i + 255] = x;
  LOG[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP[LOG[x] + LOG[y]];
}

function polyMul(p: number[] | Uint8Array, q: number[] | Uint8Array): number[] {
  const r = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      r[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return r;
}

function polyDiv(dividend: Uint8Array, divisor: number[]): Uint8Array {
  const result = Array.from(dividend);
  for (let i = 0; i <= result.length - divisor.length; i++) {
    const coef = result[i];
    if (coef !== 0) {
      for (let j = 1; j < divisor.length; j++) {
        result[i + j] ^= gfMul(divisor[j], coef);
      }
    }
  }
  return new Uint8Array(result.slice(dividend.length - divisor.length + 1));
}

function rsGeneratorPoly(numEcBytes: number): number[] {
  let poly: number[] = [1];
  for (let i = 0; i < numEcBytes; i++) {
    poly = polyMul(poly, [1, EXP[i]]);
  }
  return poly;
}

// Version table parameters for EC Level M (Version 1 to 10)
// Format: [totalCodewords, ecCodewords, ecBlocksGroup1, dataCodewordsPerBlockG1, ecBlocksG2, dataCodewordsPerBlockG2]
const VERSION_PARAMS: Record<number, [number, number, number, number, number, number]> = {
  1: [26, 10, 1, 16, 0, 0],
  2: [44, 16, 1, 28, 0, 0],
  3: [70, 26, 1, 44, 0, 0],
  4: [100, 36, 2, 32, 0, 0],
  5: [134, 48, 2, 43, 0, 0],
  6: [172, 64, 4, 27, 0, 0],
  7: [196, 72, 4, 31, 0, 0],
  8: [242, 88, 2, 38, 2, 39],
  9: [292, 110, 3, 36, 2, 37],
  10: [346, 130, 4, 43, 1, 44],
};

function selectVersion(dataLen: number): number {
  for (let v = 1; v <= 10; v++) {
    const [total, ec] = VERSION_PARAMS[v];
    const dataCapacity = total - ec;
    // Overhead: 4 bits mode + (v < 10 ? 8 : 16) bits count
    const headerBits = v < 10 ? 12 : 20;
    const maxDataBytes = Math.floor((dataCapacity * 8 - headerBits) / 8);
    if (dataLen <= maxDataBytes) return v;
  }
  return 10;
}

const ALIGNMENT_PATTERN_POS: Record<number, number[]> = {
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

// Format info bits for EC Level M (00) and masks 0 to 7
const FORMAT_BITS: number[] = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
];

class BitBuffer {
  private buffer: number[] = [];
  private length = 0;

  put(num: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      this.putBit(((num >>> i) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }

  getBits(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  getLength(): number {
    return this.length;
  }
}

function generateQrMatrix(text: string): boolean[][] {
  const utf8Bytes = Buffer.from(text, "utf-8");
  const version = selectVersion(utf8Bytes.length);
  const size = version * 4 + 17;
  const [totalCodewords, ecCodewords, g1Blocks, g1Data, g2Blocks, g2Data] = VERSION_PARAMS[version];
  const totalDataCodewords = totalCodewords - ecCodewords;

  const bb = new BitBuffer();
  // Byte mode indicator: 0100
  bb.put(4, 4);
  // Character count indicator
  bb.put(utf8Bytes.length, version < 10 ? 8 : 16);
  // Data bytes
  for (const byte of utf8Bytes) {
    bb.put(byte, 8);
  }
  // Terminator
  const maxDataBits = totalDataCodewords * 8;
  const rem = maxDataBits - bb.getLength();
  bb.put(0, Math.min(4, Math.max(0, rem)));
  // Align to byte boundary
  while (bb.getLength() % 8 !== 0) {
    bb.putBit(false);
  }
  // Pad bytes
  let pad = 0xec;
  while (bb.getLength() < maxDataBits) {
    bb.put(pad, 8);
    pad = pad === 0xec ? 0x11 : 0xec;
  }

  const dataBytes = bb.getBits();
  const ecPerBlock = Math.floor(ecCodewords / (g1Blocks + g2Blocks));
  const rsPoly = rsGeneratorPoly(ecPerBlock);

  // Group blocks
  const blocks: { data: Uint8Array; ec: Uint8Array }[] = [];
  let offset = 0;
  for (let b = 0; b < g1Blocks; b++) {
    const d = dataBytes.slice(offset, offset + g1Data);
    offset += g1Data;
    const padded = new Uint8Array(d.length + ecPerBlock);
    padded.set(d);
    const ec = polyDiv(padded, rsPoly);
    blocks.push({ data: d, ec });
  }
  for (let b = 0; b < g2Blocks; b++) {
    const d = dataBytes.slice(offset, offset + g2Data);
    offset += g2Data;
    const padded = new Uint8Array(d.length + ecPerBlock);
    padded.set(d);
    const ec = polyDiv(padded, rsPoly);
    blocks.push({ data: d, ec });
  }

  // Interleave data codewords
  const finalCodewords = new Uint8Array(totalCodewords);
  let idx = 0;
  const maxBlockLen = Math.max(g1Data, g2Data);
  for (let i = 0; i < maxBlockLen; i++) {
    for (const blk of blocks) {
      if (i < blk.data.length) finalCodewords[idx++] = blk.data[i];
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const blk of blocks) {
      if (i < blk.ec.length) finalCodewords[idx++] = blk.ec[i];
    }
  }

  // Build matrix
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunc = (r: number, c: number, val: boolean) => {
    matrix[r][c] = val;
    reserved[r][c] = true;
  };

  // 1. Finder patterns
  const drawFinder = (top: number, left: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = top + r;
        const col = left + c;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          const isBlack =
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setFunc(row, col, isBlack);
        }
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) setFunc(6, i, i % 2 === 0);
    if (!reserved[i][6]) setFunc(i, 6, i % 2 === 0);
  }

  // 3. Dark module
  setFunc(4 * version + 9, 8, true);

  // 4. Alignment patterns
  const alignCoords = ALIGNMENT_PATTERN_POS[version] ?? [];
  for (const r of alignCoords) {
    for (const c of alignCoords) {
      if (reserved[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isBlack = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
          setFunc(r + dr, c + dc, isBlack);
        }
      }
    }
  }

  // 5. Reserve format info
  for (let i = 0; i < 9; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    const targetRow = size - 1 - i;
    reserved[targetRow][8] = true;
  }

  // 6. Place data with mask (using mask 0: (row + col) % 2 === 0)
  const mask = (r: number, c: number) => (r + c) % 2 === 0;

  let bitIdx = 0;
  const totalBits = finalCodewords.length * 8;
  let dir = -1;
  let col = size - 1;
  while (col > 0) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const row = dir === -1 ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const curCol = col - c;
        if (!reserved[row][curCol]) {
          let bit = false;
          if (bitIdx < totalBits) {
            const byte = finalCodewords[Math.floor(bitIdx / 8)];
            bit = ((byte >>> (7 - (bitIdx % 8))) & 1) === 1;
            bitIdx++;
          }
          if (mask(row, curCol)) bit = !bit;
          matrix[row][curCol] = bit;
        }
      }
    }
    dir = -dir;
    col -= 2;
  }

  // 7. Write format information for EC Level M and mask 0
  const fmt = FORMAT_BITS[0];
  for (let i = 0; i < 15; i++) {
    const bit = ((fmt >>> (14 - i)) & 1) === 1;
    // First copy around top-left
    if (i < 6) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    // Second copy
    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix as boolean[][];
}

export function generateQrSvg(content: string, size = 192): string {
  const matrix = generateQrMatrix(content);
  const matrixSize = matrix.length;
  const margin = 2;
  const total = matrixSize + margin * 2;

  let path = "";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        path += `M${c + margin},${r + margin}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges">
  <rect width="${total}" height="${total}" fill="#ffffff"/>
  <path d="${path}" fill="#09090b"/>
</svg>`;
}

export async function ticketQrSvg(ticketId: string, passengerId: string) {
  const payload = encodeTicketPayload({ v: 1, ticketId, passengerId });
  return generateQrSvg(payload, 200);
}

export function ticketQrValue(ticketId: string, passengerId: string) {
  return encodeTicketPayload({ v: 1, ticketId, passengerId });
}
