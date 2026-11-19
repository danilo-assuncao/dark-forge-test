/* Dependency-free checks of the SPA shell (Node built-ins only): shared layout
   in index.html and the route table / 404 handling in script.js. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');

test('index.html holds the shared header, main outlet and footer once', function () {
  assert.equal((html.match(/<header\b/g) || []).length, 1);
  assert.equal((html.match(/<footer\b/g) || []).length, 1);
  assert.match(html, /<main[^>]*id="app"/);
  assert.match(html, /href="#\/about"/);
});

test('routing is client-side via the hash and has a 404 fallback', function () {
  assert.match(js, /hashchange/);
  assert.match(js, /'\/about'\s*:/);
  assert.match(js, /notFoundView/);
  assert.match(js, /404/);
});

test('route rendering uses DOM APIs, not innerHTML', function () {
  assert.doesNotMatch(js, /innerHTML/);
});
