# Project rules

Keep the physics, renderer, React component, and demo in this repository.
Use the package API in the personal site.
Do not copy the engine into the personal site.

Keep the field at full component width.
Put the controls below the field.
Use document scrolling without inner scroll containers.
Keep pointer, keyboard, reduced-motion, and hidden-tab behavior.

Use short sentences in the documentation.
Describe the model as illustrative.
Do not claim quantitative physical accuracy.

After a source change, run `npm test`, `npm run typecheck`, and `npm run build:demo`.
Commit `dist/` with its source.
Keep the React dependency external to the library.
Use no backend or analytics service.
