# Nematic game

Nematic game is a React component and a standalone web app for an interactive 2D material model.
The lab has Liquid, Nematic, and Solid modes, electric and magnetic fields, ions, and local brushes.

On desktop, the field uses about 52% of the component width.
Material, Motion, and Display form one column of three groups on the left.
Electric field, Magnetic field, and Particles form one column of three groups on the right.
On narrow screens, those groups appear below the field.
All six settings groups stay visible.
Do not use collapsible groups.

Put Readouts and Things to try below the field, outside Controls.

Structure, pause, and reset appear above the field.
Brushes and Ripple appear below it.
The particles use flat colors without shadows or highlights.
The component and canvas can show the host page background.
The component has no pinned sections or inner scroll containers.

[Open the lab](https://esmirnov.ai/nematic-game/) · [Component API](docs/API.md) · [Model and limits](docs/MODEL.md) · [Demo deployment](docs/DEPLOY.md)

## Install the component

Use Node.js 24 or later for development.
The component needs React 18.2 or React 19.
Install React in the host app.

```sh
npm install https://github.com/eduard-s/nematic-game/archive/refs/tags/v0.2.0.tar.gz
```

Import the component and its stylesheet.

```tsx
import { NematicLab } from "@eduard-s/nematic-game";
import "@eduard-s/nematic-game/styles.css";

export function MyPage() {
  return <NematicLab />;
}
```

The component supplies default colors and settings.
You can supply part of the configuration.
The component uses defaults for the other values.

```tsx
<NematicLab
  seed={42}
  initialMode="nematic"
  initialMaterial={{ heat: 0.15, density: 0.65, stirring: 0.8 }}
  initialEnvironment={{ ions: 0.4, electric: 0.2 }}
  initialDisplay={{ directors: true, polarized: false }}
  theme={{ sample: "#172D42", rodHigh: "#91DCE5", accent: "#215577" }}
  storageKey="my-material-lab"
  onMetrics={(metrics) => console.log(metrics.order)}
/>
```

The `initial*` props apply when the component mounts.
Reset sample restores those values.
To replace the initial configuration, change the React `key`.
Changes to `theme` apply without a reset.
Use six-digit hex values for colors.
Set `storageKey={false}` to disable storage of discoveries.

For Next.js, import the stylesheet in a layout or page.
The package includes the `"use client"` directive.
The host site supplies its header, footer, and navigation.
Use `transparentCanvas` to show the host page through the field.
Supply darker rod and ion colors for a light host page.

## Run the standalone app

Clone the repository.

```sh
git clone https://github.com/eduard-s/nematic-game.git
cd nematic-game
```

Install the dependencies.

```sh
npm ci
```

Start the development server.

```sh
npm run dev
```

Open `http://127.0.0.1:4174/`.
Open `/embedded.html` to examine two instances with separate settings and colors.

## Use the lab

1. Select Liquid, Nematic, or Solid.
2. Select a brush.
3. Hold or drag on the field.
4. Change the material and field controls.
5. Press Reset sample to restore the initial configuration.

Stir moves nearby particles.
Swirl makes a local vortex.
Pull collects nearby particles.
Comb turns nearby rods toward the brush path.
Send a ripple applies an impulse at the center.

Keys 1 through 4 select a brush.
Arrow keys move the brush.
Hold Space to apply the brush.
Escape pauses or resumes motion.

The display controls change the image, without changes to the physics.
Discoveries provide optional experiments.
Discoveries do not stop free play.

## Use the engine

The engine and canvas renderer do not need React.

```ts
import {
  createNematicGame,
  stepNematicGame,
  renderNematicGame,
  DEFAULT_DISPLAY,
  resolveTheme,
} from "@eduard-s/nematic-game/core";

const world = createNematicGame(800, 450, 42);
stepNematicGame(world, 1 / 60);
renderNematicGame(context, world, false, DEFAULT_DISPLAY,
  resolveTheme({ sample: "#172D42" }));
```

## Development

Do the automated tests.

```sh
npm test
npm run typecheck
npm run build:demo
```

The repository includes the compiled library in `dist/`.
The fixed Git tag includes the compiled files.
After changes to the source, regenerate the library.

```sh
npm run build
```

Commit the source and its compiled output together.
The CI workflow compares the compiled output with the source.
The demo uses the same component source.

The project has no runtime dependencies other than the host React installation.
No account, server, analytics service, or API key is necessary.

## Performance

The engine uses a spatial grid and reusable force buffers.
The model has limits for rods, ions, trails, and brush wakes.
The canvas has a maximum pixel ratio of 1.5 and a maximum area of 1.6 million pixels.
The frame limit decreases from 60 to 30 when the measured frame cost increases.
The simulation stops in hidden tabs and outside the viewport.
The reduced-motion preference pauses the initial sample and removes animated trails.

## Contribute

Describe the behavior that you want to change.
Include a test for changes to the physics or configuration.
Do the automated tests before a pull request.
Examine the demo at laptop and phone widths.
Keep the field wide and the controls in document flow.

## License

The project uses the MIT license.
See [LICENSE](LICENSE).
