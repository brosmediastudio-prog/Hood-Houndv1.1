import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(root, 'files');
const outputDir = join(root, 'dist');
const nestedOutputDir = join(outputDir, 'files');

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

    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }
}

if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true, force: true });
}
mkdirSync(outputDir, { recursive: true });

copyTree(sourceDir, outputDir);
copyTree(sourceDir, nestedOutputDir);
console.log('Built dist/ by copying files/ verbatim to both dist/ and dist/files/.');
