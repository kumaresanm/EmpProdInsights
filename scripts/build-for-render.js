#!/usr/bin/env node
/**
 * Build script for Render (or any single-server deploy).
 * 1. Install frontend deps and build Angular
 * 2. Copy build output to backend/public
 * 3. Install backend deps
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const frontendDir = path.join(root, 'frontend');
const backendDir = path.join(root, 'backend');
const publicDir = path.join(backendDir, 'public');

function run(cmd, cwd = root) {
  console.log(`Running: ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

// 1. Frontend build
run('npm ci', frontendDir);
run('npm run build', frontendDir);

// 2. Copy dist to backend/public
const distBase = path.join(frontendDir, 'dist', 'frontend');
const distBrowser = path.join(distBase, 'browser');
const distSource = fs.existsSync(path.join(distBrowser, 'index.html'))
  ? distBrowser
  : distBase;

if (!fs.existsSync(path.join(distSource, 'index.html'))) {
  console.error('Build output not found. Expected index.html in', distSource);
  process.exit(1);
}

if (fs.existsSync(publicDir)) {
  fs.rmSync(publicDir, { recursive: true });
}
fs.mkdirSync(publicDir, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const name of fs.readdirSync(distSource)) {
  copyRecursive(path.join(distSource, name), path.join(publicDir, name));
}
console.log('Copied frontend build to backend/public');

// 3. Backend deps
run('npm ci', backendDir);

console.log('Build complete. Start with: npm start');
