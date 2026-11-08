# Component API

Import `NematicLab` from `@eduard-s/nematic-game`.
Import the stylesheet once in the host app.
The package also exports `NematicGame` as an alias.

| Prop | Default | Effect |
| --- | --- | --- |
| `initialMode` | `"nematic"` | Selects the initial structure. |
| `initialMaterial` | `DEFAULT_MATERIAL` | Replaces selected material values. |
| `initialEnvironment` | `DEFAULT_ENVIRONMENT` | Replaces selected field and ion values. |
| `initialDisplay` | `DEFAULT_DISPLAY` | Replaces selected display values. |
| `initialPaused` | `false` | Pauses the initial sample. Reduced motion also pauses the sample. |
| `seed` | Random unsigned 32-bit integer | Makes the initial arrangement repeatable at the same dimensions. |
| `theme` | `DEFAULT_THEME` | Replaces selected colors. Colors use six-digit hex notation. |
| `storageKey` | `"nematic-game-discoveries-v1"` | Selects the key for discoveries. `false` disables storage. |
| `onMetrics` | None | Receives measured order, speed, count, lattice error, and shared axis. |
| `className` | None | Adds a class to the root element. |
| `style` | None | Adds styles to the root element. |

Initial props apply once per mount.
Reset sample restores the configuration from that mount.
A new React `key` starts a new sample with new initial props.
The theme can change after the component mounts.
The `onMetrics` callback can change after the component mounts.

The component uses container queries.
Its layout responds to the component width, rather than the browser width.
Each instance has unique control IDs.
Use different storage keys for separate discovery records.

## Material values

Values use a relative scale from 0 to 1.

| Key | Default | Effect |
| --- | --- | --- |
| `heat` | `0.26` | Controls thermal noise. |
| `density` | `0.58` | Controls the rod count. |
| `alignment` | `0.88` | Adds orientational coupling in Nematic and Solid modes. |
| `rodLength` | `0.5` | Controls rod length and collision distance. |
| `viscosity` | `0.35` | Controls damping. |
| `repulsion` | `0.5` | Controls collision force. |
| `stiffness` | `0.65` | Controls the lattice springs in Solid mode. |
| `stirring` | `0.5` | Controls brush force. |

## Environment values

| Key | Default | Range or type |
| --- | --- | --- |
| `electric` | `0` | 0 to 1 |
| `electricAngle` | `0` | 0 to 360 degrees |
| `electricResponse` | `1` | -1 to 1 |
| `magnetic` | `0` | 0 to 1 |
| `magneticAngle` | `90` | 0 to 180 degrees |
| `magneticResponse` | `1` | -1 to 1 |
| `magneticPlane` | `"in-plane"` | `"in-plane"`, `"out"`, or `"into"` |
| `ions` | `0.25` | 0 to 1 |
| `charged` | `true` | Boolean |
| `chargeStrength` | `1` | 0.1 to 2 |
| `ionMobility` | `0.5` | 0 to 1 |
| `screening` | `0` | 0 to 1 |

A direction of 0 degrees points right.
A direction of 90 degrees points up.
Positive rod responses align along a field.
Negative rod responses align across a field.

## Display values

`mesh`, `trails`, `detail`, and `wakes` default to `true`.
`directors` and `polarized` default to `false`.
Each display value is a Boolean.
Display values do not change the physics.

## Colors

| Key | Default | Use |
| --- | --- | --- |
| `surface` | `#DFE5DC` | Surface behind the controls. |
| `ink` | `#303832` | Control text. |
| `accent` | `#785448` | Sliders and focus outlines. |
| `controlSurface` | `#EFF2ED` | Light control details. |
| `subtleSurface` | `#DCE3D8` | Slider tracks. |
| `sample` | `#303832` | Canvas background. |
| `rodLow` | `#B9907B` | First orientation color. |
| `rodHigh` | `#B4D2BC` | Second orientation color. |
| `positiveIon` | `#D3A28B` | Positive ions and electric field marks. |
| `negativeIon` | `#9ECAB3` | Negative ions and magnetic field marks. |
| `neutralIon` | `#B8C3B5` | Neutral tracers. |

The canvas and control legend use the same colors.
The renderer caches its rod palette for each theme.
The host app must supply colors with enough contrast.
