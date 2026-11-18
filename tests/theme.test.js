/*
 * Dependency-free tests for the site's single dark theme (Node built-ins only).
 *
 * Run from the repository root:  node --test
 *
 * The site ships one dark palette on a brown background. There is no light
 * mode: no theme switch, no prefers-color-scheme detection and no saved
 * choice. These checks read the static site files and fail if light-mode
 * support comes back, if the background stops being brown, or if the
 * palette drops below WCAG contrast thresholds.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

// Top-level site files, the same set the browser loads.
function siteFiles() {
  return fs.readdirSync(ROOT)
    .filter(function (name) {
      return /\.(html|css|js)$/.test(name);
    })
    .map(function (name) {
      return { name: name, text: read(name) };
    });
}

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

// Custom properties declared in the single :root rule of styles.css.
function rootTokens() {
  const css = stripCssComments(read('styles.css'));
  const blocks = css.match(/:root\s*\{[^}]*\}/g) || [];
  assert.equal(blocks.length, 1, 'styles.css must declare exactly one :root palette');
  const tokens = {};
  const declaration = /(--[\w-]+|color-scheme)\s*:\s*([^;]+);/g;
  let match;
  while ((match = declaration.exec(blocks[0])) !== null) {
    tokens[match[1]] = match[2].trim().toLowerCase();
  }
  return tokens;
}

function parseHex(value) {
  assert.match(value, /^#[0-9a-f]{6}$/, 'expected a #rrggbb colour, got ' + value);
  return [1, 3, 5].map(function (i) {
    return parseInt(value.slice(i, i + 2), 16) / 255;
  });
}

function relativeLuminance(hex) {
  const linear = parseHex(hex).map(function (channel) {
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function toHsl(hex) {
  const rgb = parseHex(hex);
  const max = Math.max.apply(null, rgb);
  const min = Math.min.apply(null, rgb);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (delta !== 0) {
    if (max === rgb[0]) {
      hue = 60 * (((rgb[1] - rgb[2]) / delta) % 6);
    } else if (max === rgb[1]) {
      hue = 60 * ((rgb[2] - rgb[0]) / delta + 2);
    } else {
      hue = 60 * ((rgb[0] - rgb[1]) / delta + 4);
    }
  }
  if (hue < 0) {
    hue += 360;
  }
  return { hue: hue, saturation: saturation, lightness: lightness };
}

test('the page background is brown', function () {
  const tokens = rootTokens();
  const hsl = toHsl(tokens['--bg']);
  // Brown is a dark, desaturated orange: warm hue, some saturation, low lightness.
  assert.ok(hsl.hue >= 10 && hsl.hue <= 45, '--bg hue should be orange-brown, got ' + hsl.hue);
  assert.ok(hsl.saturation >= 0.2, '--bg should not be grey, got saturation ' + hsl.saturation);
  assert.ok(hsl.lightness >= 0.1 && hsl.lightness <= 0.4,
    '--bg should be a dark brown, got lightness ' + hsl.lightness);

  const css = stripCssComments(read('styles.css'));
  assert.match(css, /body\s*\{[^}]*background-color:\s*var\(--bg\)/,
    'body must paint the brown --bg');
});

test('only a dark colour scheme is declared', function () {
  assert.equal(rootTokens()['color-scheme'], 'dark');
  assert.match(read('index.html'), /<meta\s+name="color-scheme"\s+content="dark">/);
});

test('text and controls keep accessible contrast on the brown background', function () {
  const t = rootTokens();
  const checks = [
    ['--text', '--bg', 7, 'marquee text (AAA)'],
    ['--focus', '--bg', 3, 'focus ring (WCAG 1.4.11)'],
    ['--button-border', '--bg', 3, 'button boundary (WCAG 1.4.11)'],
    ['--button-text', '--button-bg', 4.5, 'button label (AA)'],
    ['--button-text', '--button-bg-hover', 4.5, 'hovered button label (AA)'],
  ];
  checks.forEach(function (check) {
    const ratio = contrastRatio(t[check[0]], t[check[1]]);
    assert.ok(ratio >= check[2],
      check[3] + ': ' + check[0] + ' on ' + check[1] + ' is ' + ratio.toFixed(2) +
      ':1, needs ' + check[2] + ':1');
  });
});

test('the light/dark switch is gone from the page', function () {
  const html = read('index.html');
  assert.doesNotMatch(html, /theme-toggle|role="switch"/i);
  assert.doesNotMatch(html, /theme\.js/, 'index.html must not load theme.js');
  assert.equal(fs.existsSync(path.join(ROOT, 'theme.js')), false, 'theme.js should be deleted');
});

test('no light-mode styles, system detection or saved preference remain', function () {
  const forbidden = [
    [/data-theme/i, 'data-theme attribute'],
    [/prefers-color-scheme/i, 'prefers-color-scheme detection'],
    [/localStorage/, 'localStorage persistence'],
    [/matchMedia/, 'matchMedia lookups'],
    [/theme-toggle/i, 'theme switch'],
    [/color-scheme:\s*(only\s+)?light/i, 'light colour scheme'],
  ];
  siteFiles().forEach(function (file) {
    forbidden.forEach(function (rule) {
      assert.doesNotMatch(file.text, rule[0], file.name + ' still contains ' + rule[1]);
    });
  });
});
