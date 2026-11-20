'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { el, initApp } = require('../app.js');

test('el creates element with correct tag and properties', (t) => {
  if (typeof global.document === 'undefined') {
    global.document = {
      createElement(tag) {
        return {
          tagName: tag.toUpperCase(),
          className: '',
          textContent: '',
          attributes: {},
          children: [],
          listeners: {},
          setAttribute(k, v) { this.attributes[k] = v; },
          appendChild(c) { this.children.push(c); },
          addEventListener(evt, cb) { this.listeners[evt] = cb; }
        };
      }
    };
  }

  const btn = el('button', { className: 'test-btn', textContent: 'Click Me', id: 'b1' });
  
  assert.strictEqual(btn.tagName, 'BUTTON');
  assert.strictEqual(btn.className, 'test-btn');
  assert.strictEqual(btn.textContent, 'Click Me');
  assert.strictEqual(btn.attributes['id'], 'b1');

  const container = el('div', {}, [btn]);
  assert.strictEqual(container.tagName, 'DIV');
  assert.strictEqual(container.children.length, 1);
  assert.strictEqual(container.children[0], btn);
});

test('initApp renders initial state without errors', (t) => {
  const root = {
    textContent: '',
    children: [],
    appendChild(c) { this.children.push(c); }
  };
  
  // initApp requires document.createElement to work correctly for complex elements
  initApp(root);
  assert.strictEqual(root.children.length, 1); // should append container
  const container = root.children[0];
  assert.strictEqual(container.tagName, 'DIV');
  assert.strictEqual(container.className, 'container');
});
