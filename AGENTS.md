# Project rules

Keep the physics, renderer, React component, and demo in this repository.
Use the package API in the personal site.
Do not copy the engine into the personal site.

On wide layouts, keep the field between 50% and 65% of the component width.
Keep a balanced field aspect ratio.

Put Material, Motion, and Display in one column of three groups to the left of the field on desktop.
Put Electric field, Magnetic field, and Particles in one column of three groups to the right.
Stack those control groups below the field on narrow screens.

Keep Material, Motion, Electric field, Magnetic field, Particles, and Display as separate settings groups.
Keep all six groups visible without collapsible sections.

Put Readouts and Things to try below the field, outside Controls.

Use native sliders, selects, and checkboxes with keyboard input.
Use document scrolling without inner scroll containers.
Do not use sticky or fixed sections in the component.

Keep the component background transparent.
Use one control style without cards or separate section treatments.
Keep transparent canvas support for the host page.

Use flat rods and ions without shadows or highlights.
Put structure and sample actions above the field.
Put the four brushes below the field.

Keep pointer, keyboard, reduced-motion, and hidden-tab behavior.

Use short sentences in the documentation.
Describe the model as illustrative.
Do not claim quantitative physical accuracy.

After a source change, run `npm test`, `npm run typecheck`, and `npm run build:demo`.
Commit `dist/` with its source.
Keep the React dependency external to the library.
Use no backend or analytics service.
