import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(root, 'files');
const outputDir = join(root, 'dist');
const nestedOutputDir = join(outputDir, 'files');
const skipFiles = new Set(['index.html']);

function copyTree(fromDir, targetRoot) {
  for (const entry of readdirSync(fromDir)) {
    const sourcePath = join(fromDir, entry);
    const relPath = relative(sourceDir, sourcePath);
    const targetPath = join(targetRoot, relPath);
    const stat = statSync(sourcePath);

    if (stat.isDirectory()) {
      copyTree(sourcePath, targetRoot);
      continue;
    }

    if (skipFiles.has(basename(sourcePath))) continue;

    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }
}

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

copyTree(sourceDir, outputDir);
copyTree(sourceDir, nestedOutputDir);
console.log('Copied runtime assets from files/ to dist/ and dist/files/.');
