window.__modules = {};
window.module = { exports: {} };
window.require = function(id) {
  if (id === 'node:crypto') {
    return {
      randomInt: (min, max) => {
        const range = max - min;
        const max_val = Math.floor(0xFFFFFFFF / range) * range;
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
        reject(new Error(`Execution error in ${file}: ${e.message}`));
      };
      
      window.addEventListener('error', errorHandler, { once: true });
      
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

loadApp().catch(err => {
  console.error(err);
  document.body.innerHTML = `<h1>Erro Crítico</h1><p>${err.message}</p>`;
});
