/**
 * Copies Monaco editor static files from node_modules into public/monaco/vs
 * so they are served from the app's own domain instead of a CDN.
 * Runs automatically as the "prebuild" and "predev" npm lifecycle hooks.
 */

const fs   = require('fs');
const path = require('path');

const src  = path.join(__dirname, '..', 'node_modules', 'monaco-editor', 'min', 'vs');
const dest = path.join(__dirname, '..', 'public', 'monaco', 'vs');

if (fs.existsSync(dest)) {
  console.log('[copy-monaco] Already present — skipping.');
} else {
  console.log('[copy-monaco] Copying monaco-editor/min/vs → public/monaco/vs …');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log('[copy-monaco] Done.');
}
