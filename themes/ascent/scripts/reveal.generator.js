'use strict';

const fs = require('fs');
const path = require('path');
const { cwd } = require('process');

function listFilesRecursive(rootDir) {
  const out = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.isFile()) {
        out.push(full);
      }
    }
  }
  if (fs.existsSync(rootDir)) {
    walk(rootDir);
  }
  return out;
}

function pathUnderNodeModules(file) {
  const parts = file.split(path.sep);
  const nmIdx = parts.lastIndexOf('node_modules');
  if (nmIdx === -1) {
    return path.basename(file);
  }
  return parts.slice(nmIdx + 1).join('/');
}

const revealGeneratorCallback = () => {
  const dirs = [
    path.join(__dirname, '..', 'node_modules', 'reveal.js'),
    path.join(cwd(), 'node_modules', 'reveal.js'),
  ];
  const dir = dirs.find((d) => fs.existsSync(d));
  if (!dir) {
    throw new Error('reveal.js not found');
  }
  const baseDir = fs.realpathSync(dir);

  const seen = new Set();
  const absoluteFiles = [];

  for (const f of listFilesRecursive(baseDir)) {
    if (!seen.has(f)) {
      seen.add(f);
      absoluteFiles.push(f);
    }
  }

  const altReveal = path.join(cwd(), 'node_modules', 'revealjs');
  if (fs.existsSync(altReveal)) {
    for (const f of listFilesRecursive(altReveal)) {
      if (!seen.has(f)) {
        seen.add(f);
        absoluteFiles.push(f);
      }
    }
  }

  return absoluteFiles.map((file) => ({
    data: () => fs.createReadStream(file),
    path: pathUnderNodeModules(file),
  }));
};

module.exports = { revealGeneratorCallback };
