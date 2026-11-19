/*
 * Dependency-free tests for the site's single light theme (Node built-ins only).
 *
 * Run from the repository root:  node --test
 *
 * The site ships one light palette on a light red background. There is no dark
 * mode: no theme switch, no prefers-color-scheme detection and no saved
 * choice. These checks read the static site files and fail if dark-mode
 * support comes back, if the background stops being light red, if the palette
 * drops below WCAG contrast thresholds, if a ratio written in the styles.css
 * comments no longer matches the real colours, or if the page stops painting
 * with those checked tokens (a hardcoded colour would bypass the contrast
 * checks).
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// [foreground token, background token, minimum ratio, what it covers]
const CONTRAST_CHECKS = [
  ['--text', '--bg', 7, 'marquee text (AAA)'],
  ['--focus', '--bg', 3, 'focus ring (WCAG 1.4.11)'],
  ['--button-border', '--bg', 3, 'button boundary (WCAG 1.4.11)'],
  ['--button-bg', '--bg', 3, 'button fill against the page (WCAG 1.4.11)'],
  ['--button-text', '--button-bg', 4.5, 'button label (AA)'],
  ['--button-text', '--button-bg-hover', 4.5, 'hovered button label (AA)'],
];

// [selector, property, token]: where each checked pair is actually painted.
// The marquee words set no colour of their own and inherit body's --text.
const REQUIRED_TOKEN_USES = [
  ['body', 'background-color', '--bg'],
  ['body', 'color', '--text'],
  ['.action-button', 'background-color', '--button-bg'],
  ['.action-button', 'border', '--button-border'],
  ['.action-button', 'color', '--button-text'],
  ['.action-button:hover', 'background-color', '--button-bg-hover'],
  ['.action-button:focus-visible', 'outline', '--focus'],
  ['.site-header', 'border-bottom', '--text'],
  ['.site-footer', 'border-top', '--text'],
  ['.site-header', 'background-color', '--bg'],
  ['.site-footer', 'background-color', '--bg'],
  ['.nav-link', 'color', '--text'],
  ['.nav-link:focus-visible', 'outline', '--focus'],
  ['.skip-link:focus-visible', 'outline', '--focus'],
];

// Properties that paint a colour. Their values may only use var(--token),
// lengths and the keywords below.
const COLOUR_PROPERTY = /^(color|background(-color|-image)?|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|(box|text)-shadow|fill|stroke|caret-color|accent-color|text-decoration(-color)?)$/;
const NON_COLOUR_KEYWORDS = new Set([
  'none', 'solid', 'dashed', 'dotted', 'double', 'inset',
  'inherit', 'initial', 'unset', 'revert', 'currentcolor', 'transparent',
]);
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i;

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

// Contrast ratios written in the :root comments as "~R:1 vs --other", as
// [{ token, other, stated }]. Thresholds alone would let these drift.
function documentedRatios() {
  const blocks = read('styles.css').match(/:root\s*\{[^}]*\}/g) || [];
  assert.equal(blocks.length, 1, 'styles.css must declare exactly one :root palette');
  const claims = [];
  const commented = /(--[\w-]+)\s*:[^;]+;[ \t]*\/\*([\s\S]*?)\*\//g;
  let match;
  while ((match = commented.exec(blocks[0])) !== null) {
    const ratio = /~(\d+(?:\.\d+)?):1 vs (--[\w-]+)/g;
    let claim;
    while ((claim = ratio.exec(match[2])) !== null) {
      claims.push({ token: match[1], other: claim[2], stated: claim[1] });
    }
  }
  return claims;
}

// Every rule of styles.css except :root, including rules nested in @media and
// @keyframes, as { selectors: [...], declarations: [{ property, value }] }.
function styleRules() {
  const css = stripCssComments(read('styles.css'));
  const rules = [];
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rule.exec(css)) !== null) {
    const selectors = match[1].split(',').map(function (selector) {
      return selector.trim();
    });
    if (selectors.indexOf(':root') !== -1) {
      continue;
    }
    const declarations = match[2].split(';')
      .map(function (declaration) {
        return declaration.trim();
      })
      .filter(Boolean)
      .map(function (declaration) {
        const colon = declaration.indexOf(':');
        return {
          property: declaration.slice(0, colon).trim().toLowerCase(),
          value: declaration.slice(colon + 1).trim().toLowerCase(),
        };
      });
    rules.push({ selectors: selectors, declarations: declarations });
  }
  assert.ok(rules.length > 0, 'styles.css has no rules to check');
  return rules;
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

test('the page background is light red', function () {
  const tokens = rootTokens();
  const hsl = toHsl(tokens['--bg']);
  // Red sits at hue 0 (wrapping to 360). It must be saturated enough to read as
  // red, and light enough for the dark text and controls to keep contrast.
  assert.ok(hsl.hue <= 15 || hsl.hue >= 345,
    '--bg should be red (hue near 0), got hue ' + hsl.hue);
  assert.ok(hsl.saturation >= 0.5,
    '--bg should be a saturated red, got saturation ' + hsl.saturation);
  assert.ok(hsl.lightness >= 0.7 && hsl.lightness <= 0.9,
    '--bg should be a light red, got lightness ' + hsl.lightness);

  const css = stripCssComments(read('styles.css'));
  assert.match(css, /body\s*\{[^}]*background-color:\s*var\(--bg\)/,
    'body must paint the light red --bg');
});

test('only a light colour scheme is declared', function () {
  assert.equal(rootTokens()['color-scheme'], 'light');
  assert.match(read('index.html'), /<meta\s+name="color-scheme"\s+content="light">/);
});

test('the contrast ratios written in styles.css match the real colours', function () {
  const t = rootTokens();
  const claims = documentedRatios();
  claims.forEach(function (claim) {
    assert.ok(t[claim.other], claim.token + ' compares against undeclared ' + claim.other);
    const actual = contrastRatio(t[claim.token], t[claim.other]).toFixed(1);
    assert.equal(actual, claim.stated,
      claim.token + ' says ~' + claim.stated + ':1 vs ' + claim.other + ', real ratio is ' + actual + ':1');
  });
  CONTRAST_CHECKS.forEach(function (check) {
    const documented = claims.some(function (claim) {
      return (claim.token === check[0] && claim.other === check[1]) ||
        (claim.token === check[1] && claim.other === check[0]);
    });
    assert.ok(documented, check[3] + ': styles.css should note the ' + check[0] + ' / ' + check[1] + ' ratio');
  });
});

test('text and controls keep accessible contrast on the light red background', function () {
  const t = rootTokens();
  CONTRAST_CHECKS.forEach(function (check) {
    const ratio = contrastRatio(t[check[0]], t[check[1]]);
    assert.ok(ratio >= check[2],
      check[3] + ': ' + check[0] + ' on ' + check[1] + ' is ' + ratio.toFixed(2) +
      ':1, needs ' + check[2] + ':1');
  });
});

test('the page paints with the contrast-checked tokens', function () {
  const rules = styleRules();
  REQUIRED_TOKEN_USES.forEach(function (use) {
    const selector = use[0];
    const property = use[1];
    const expected = 'var(' + use[2] + ')';
    const values = rules
      .filter(function (rule) {
        return rule.selectors.indexOf(selector) !== -1;
      })
      .reduce(function (all, rule) {
        return all.concat(rule.declarations);
      }, [])
      .filter(function (declaration) {
        return declaration.property === property;
      })
      .map(function (declaration) {
        return declaration.value;
      });
    assert.ok(values.length > 0, selector + ' must declare ' + property);
    values.forEach(function (value) {
      assert.ok(value.indexOf(expected) !== -1,
        selector + ' { ' + property + ': ' + value + ' } must use ' + expected);
    });
  });
});

test('no colour is hardcoded outside the :root palette', function () {
  const audited = new Set();
  CONTRAST_CHECKS.forEach(function (check) {
    audited.add(check[0]);
    audited.add(check[1]);
  });

  styleRules().forEach(function (rule) {
    const where = rule.selectors.join(', ');
    rule.declarations.forEach(function (declaration) {
      const label = where + ' { ' + declaration.property + ': ' + declaration.value + ' }';
      assert.doesNotMatch(declaration.value, COLOUR_LITERAL, label + ' hardcodes a colour');
      if (!COLOUR_PROPERTY.test(declaration.property)) {
        return;
      }
      const rest = declaration.value.replace(/var\(([^)]*)\)/g, function (whole, inner) {
        const token = inner.trim();
        assert.match(token, /^--[\w-]+$/, label + ': var() fallbacks could hide a colour');
        assert.ok(audited.has(token), label + ': ' + token + ' is not contrast-checked');
        return ' ';
      });
      if (declaration.property === 'text-decoration' && declaration.value === 'underline') {
        return;
      }
      (rest.replace(/-?\d*\.?\d+[a-z%]*/g, ' ').match(/[a-z-]+/g) || []).forEach(function (word) {
        assert.ok(NON_COLOUR_KEYWORDS.has(word), label + ': "' + word + '" may be a named colour');
      });
    });
  });

  const html = read('index.html');
  assert.doesNotMatch(html, /<style[\s>]|\sstyle\s*=/i, 'index.html must not carry inline styles');
  assert.doesNotMatch(read('script.js'), /\.style\b|cssText|setProperty|insertRule/,
    'script.js must not set styles directly');
});

test('the light/dark switch is gone from the page', function () {
  const html = read('index.html');
  assert.doesNotMatch(html, /theme-toggle|role="switch"/i);
  assert.doesNotMatch(html, /theme\.js/, 'index.html must not load theme.js');
  assert.equal(fs.existsSync(path.join(ROOT, 'theme.js')), false, 'theme.js should be deleted');
});

test('no dark-mode styles, system detection or saved preference remain', function () {
  const forbidden = [
    [/data-theme/i, 'data-theme attribute'],
    [/prefers-color-scheme/i, 'prefers-color-scheme detection'],
    [/localStorage/, 'localStorage persistence'],
    [/matchMedia/, 'matchMedia lookups'],
    [/theme-toggle/i, 'theme switch'],
    [/color-scheme:[^;]*\bdark\b/i, 'dark colour scheme'],
    [/name="color-scheme"\s+content="[^"]*\bdark\b/i, 'dark colour-scheme meta tag'],
  ];
  siteFiles().forEach(function (file) {
    forbidden.forEach(function (rule) {
      assert.doesNotMatch(file.text, rule[0], file.name + ' still contains ' + rule[1]);
    });
  });
});
