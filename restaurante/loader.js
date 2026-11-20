window.__modules = {};
window.module = { exports: {} };
window.require = function(id) {
  if (id === 'node:crypto') {
    return {
      randomInt: (min, max) => {
        if (max === undefined) {
          max = min;
          min = 0;
        }
        const range = max - min;
        if (!Number.isSafeInteger(range) || range <= 0 || range > 2**32) {
          throw new RangeError(`invalid range`);
        }
        const max_val = Math.floor(0x100000000 / range) * range;
        const val = new Uint32Array(1);
        do {
          crypto.getRandomValues(val);
        } while (val[0] >= max_val);
        return min + (val[0] % range);
      }
    };
  }
  return window.__modules[id];
};

async function loadApp() {
  const files = ['./menu.js', './customizer.js', './delivery.js', './order.js', './app.js'];
  for (const file of files) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = file;
      
      const errorHandler = (e) => {
        if (!e.filename || new URL(file, document.baseURI).href !== e.filename) return;
        window.removeEventListener('error', errorHandler);
        reject(new Error(`Execution error in ${file}: ${e.message}`));
      };
      
      window.addEventListener('error', errorHandler);
      
      script.onload = () => {
        window.removeEventListener('error', errorHandler);
        if (file !== './app.js') {
          window.__modules[file] = window.module.exports;
          window.module.exports = {};
        }
        resolve();
      };
      
      script.onerror = () => {
        window.removeEventListener('error', errorHandler);
        reject(new Error(`Failed to load ${file}`));
      };
      
      document.head.appendChild(script);
    });
  }
}

window.loadAppPromise = loadApp().catch(err => {
  console.error(err);
  const h1 = document.createElement('h1');
  h1.textContent = 'Erro Crítico';
  const p = document.createElement('p');
  p.textContent = err.message;
  document.body.textContent = '';
  document.body.appendChild(h1);
  document.body.appendChild(p);
});
