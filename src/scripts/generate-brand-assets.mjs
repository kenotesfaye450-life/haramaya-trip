import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const brandDir = path.resolve('public/brand');
const logoPath = path.join(brandDir, 'haramaya-trip-logo.png');
const GREEN = { r: 8, g: 122, b: 85 };
const BUS_CROP = { left: 135, top: 88, width: 300, height: 140 };
const FAVICON_BUS_CROP = { left: 160, top: 18, width: 135, height: 116 };

async function createBusMark() {
  const { data, info } = await sharp(logoPath)
    .extract(BUS_CROP)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const backgroundSamples = [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1],
  ];
  const sourceRed = Math.round(
    backgroundSamples.reduce((sum, [x, y]) => sum + data[(y * info.width + x) * info.channels], 0) /
      backgroundSamples.length,
  );
  const pixels = Buffer.alloc(info.width * info.height * 4);

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const sourceIndex = (y * info.width + x) * info.channels;
      const outputIndex = (y * info.width + x) * 4;
      const alpha = Math.max(0, Math.min(255, Math.round(((data[sourceIndex] - sourceRed) / (255 - sourceRed)) * 255)));
      pixels[outputIndex] = 255;
      pixels[outputIndex + 1] = 255;
      pixels[outputIndex + 2] = 255;
      pixels[outputIndex + 3] = alpha < 8 ? 0 : alpha;
    }
  }

  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function createIcon(size, mark, markWidth, destination) {
  const { width, height } = await sharp(mark).metadata();
  const markHeight = Math.round((height / width) * markWidth);
  const iconMark = await sharp(mark)
    .resize(markWidth, markHeight, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { ...GREEN, alpha: 1 },
    },
  })
    .composite([{
      input: iconMark,
      left: Math.round((size - markWidth) / 2),
      top: Math.round((size - markHeight) / 2),
    }])
    .png()
    .toFile(destination);
}

function makeIco(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;
  images.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, entry);
    header.writeUInt8(size === 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });

  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

async function run() {
  if (!fs.existsSync(logoPath)) {
    throw new Error(`Approved source logo is missing: ${logoPath}`);
  }

  fs.mkdirSync(brandDir, { recursive: true });
  const metadata = await sharp(logoPath).metadata();
  if (metadata.width < 445 || metadata.height < 240) {
    throw new Error(`Source logo is smaller than the approved 472 × 256 crop source (${metadata.width} × ${metadata.height}).`);
  }

  await sharp({
    create: {
      width: 436,
      height: 112,
      channels: 4,
      background: { r: 25, g: 118, b: 65, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(logoPath)
          .extract({ left: 20, top: 10, width: 112, height: 112 })
          .png()
          .toBuffer(),
        left: 0,
        top: 0,
      },
      {
        input: await sharp(logoPath)
          .extract({ left: 140, top: 24, width: 315, height: 58 })
          .png()
          .toBuffer(),
        left: 116,
        top: 20,
      },
    ])
    .png()
    .toFile(path.join(brandDir, 'haramaya-trip-compact.png'));
  await sharp(logoPath)
    .extract({ left: 20, top: 10, width: 112, height: 112 })
    .png()
    .toFile(path.join(brandDir, 'haramaya-trip-seal.png'));

  const busMark = await createBusMark();
  await fs.promises.writeFile(path.join(brandDir, 'haramaya-trip-bus-mark.png'), busMark);
  const faviconMark = await sharp(busMark).extract(FAVICON_BUS_CROP).png().toBuffer();

  const app512 = path.join(brandDir, 'haramaya-trip-app-512.png');
  await createIcon(512, busMark, 380, app512);
  await sharp(app512)
    .resize(192, 192, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(brandDir, 'haramaya-trip-app-192.png'));
  await createIcon(512, busMark, 340, path.join(brandDir, 'haramaya-trip-maskable-512.png'));
  await sharp(app512)
    .resize(180, 180, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(brandDir, 'apple-touch-icon.png'));

  const faviconFiles = [16, 32, 48];
  const faviconImages = [];
  for (const size of faviconFiles) {
    const destination = path.join(brandDir, `favicon-${size}x${size}.png`);
    await createIcon(size, faviconMark, Math.round(size * 0.875), destination);
    faviconImages.push({
      size,
      data: await sharp(destination).png().toBuffer(),
    });
  }
  await fs.promises.writeFile(path.join(brandDir, 'favicon.ico'), makeIco(faviconImages));
}

run().catch((error) => {
  console.error('Brand asset generation failed:', error);
  process.exit(1);
});
