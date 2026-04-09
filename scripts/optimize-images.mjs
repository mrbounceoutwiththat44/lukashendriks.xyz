import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join, extname, basename, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT      = join(__dirname, '..');
const SRC_DIR   = join(ROOT, 'public', 'images');
const OUT_DIR   = join(ROOT, 'public', 'images', 'opt');

const THUMB_MAX_W   = 600;
const GALLERY_MAX_W = 1200;
const AVIF_Q        = 62;
const JPEG_Q        = 82;

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg']);

// Collect thumbnail paths declared in projects.js so files like 1012.jpg
// (no "Thumbnail" in the name) still get the smaller 600px treatment.
function getThumbnailPaths() {
  try {
    const require = createRequire(import.meta.url);
    // Strip ES module syntax so we can require it as CJS
    const fs = require('fs');
    const src = fs.readFileSync(join(ROOT, 'src', 'data', 'projects.js'), 'utf8');
    const matches = [...src.matchAll(/thumbnail:\s*['"]([^'"]+)['"]/g)];
    return new Set(matches.map(m => m[1]));
  } catch {
    return new Set();
  }
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'opt') yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

async function optimizeImage(srcPath, thumbPaths) {
  const ext = extname(srcPath).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) return;

  const rel     = relative(SRC_DIR, srcPath);
  const stem    = rel.replace(/\.[^.]+$/, '');
  const outDir  = join(OUT_DIR, dirname(stem));
  await mkdir(outDir, { recursive: true });

  // Thumbnail if named *Thumbnail* OR explicitly listed as thumbnail in projects.js
  const publicPath = `/images/${rel}`;
  const isThumb = /thumbnail/i.test(basename(srcPath)) || thumbPaths.has(publicPath);
  const maxW    = isThumb ? THUMB_MAX_W : GALLERY_MAX_W;

  const pipeline = sharp(srcPath).resize({ width: maxW, withoutEnlargement: true });

  await Promise.all([
    pipeline.clone().avif({ quality: AVIF_Q }).toFile(join(OUT_DIR, `${stem}.avif`)),
    pipeline.clone().jpeg({ quality: JPEG_Q, mozjpeg: true }).toFile(join(OUT_DIR, `${stem}.jpg`)),
  ]);

  return stem;
}

async function run() {
  const thumbPaths = getThumbnailPaths();
  const files = [];
  for await (const f of walk(SRC_DIR)) files.push(f);

  const results = await Promise.all(files.map(f => optimizeImage(f, thumbPaths)));
  const done = results.filter(Boolean);
  console.log(`[image-opt] ${done.length} images → opt/ (AVIF + JPEG)`);
}

run().catch(err => { console.error(err); process.exit(1); });
