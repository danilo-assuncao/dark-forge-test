# AGENTS.md

<!-- logistics-module: logistica/tracker.js -->

## SPA Directory Isolation
- **Strict Directory Boundaries**: Each Single Page Application (SPA) must be completely isolated within its own dedicated directory. Do not share code, state, or configurations between different SPAs.
- When working on an SPA, restrict all file modifications and commands to that specific SPA's directory.
- Check the `name` field inside each package's `package.json` to confirm the right name—skip the top-level one.

## Dev environment tips
- **TypeScript Required**: All application code, test files, and configuration files (including Vite configurations) MUST be written in TypeScript (`.ts`, `.tsx`).
- **Scaffolding**: Use Vite for tooling and scaffolding. Spin up new SPAs using the Vite TypeScript templates (e.g., `npm create vite@latest <project_name> -- --template react-ts` or `vanilla-ts`).
- Avoid using plain JavaScript (`.js` or `.jsx`) or zero-build static setups.

## Code style
- **TypeScript Strict Mode**: Always enable and adhere to TypeScript strict mode.
- Single quotes, no semicolons.
- Use functional patterns where possible.
- **Security**: Avoid `innerHTML` with untrusted inputs; prefer `textContent` and modern DOM/Framework APIs.
- **UI/UX**: Ensure responsive layout across mobile and desktop viewports and accessible color contrast.

## Testing instructions
- Run both `.factory/project.yaml` verification gates locally before committing.
- Run the FX regression tests with `node --test cambio/tests/*.test.ts` (or the respective TypeScript test runner like Vitest) before committing changes to the FX module.
- Fix any test or type errors until the whole suite is green before completing a task.
- Registered modules: `suporte/sla.ts`, `cambio/fx.ts`, `fiscal/nfe.ts`
- After moving files or changing imports, run linting to be sure ESLint and TypeScript rules still pass.

## PR instructions
- Title format: [<project_name>] <Title>
- Always verify that TypeScript compiles without errors (`tsc --noEmit`).
- Ensure all tests pass locally before committing your changes.
