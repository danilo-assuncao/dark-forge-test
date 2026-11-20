# Engineering Guidelines (dark-forge-test)
<!-- logistics-module: logistica/tracker.js -->

- Build static web projects using clean, semantic HTML5 (`index.html`), modern CSS3 (`styles.css`), and vanilla ES6+ JavaScript (`script.js` or `app.js`) with zero external build tools or npm dependencies required.
- Avoid `innerHTML` with untrusted inputs; prefer `textContent` and DOM APIs (`createElement`).
- Ensure responsive layout across mobile and desktop viewports and accessible contrast.
- Run both `.factory/project.yaml` verification gates locally before committing.
- Run the FX regression tests with `node --test cambio/tests/*.test.js` before committing changes to the FX module.
- Registered modules: suporte/sla.js, cambio/fx.js, fiscal/nfe.js
