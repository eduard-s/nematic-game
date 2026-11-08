import { createRoot } from "react-dom/client";
import { NematicLab } from "../src/react/index.js";
import "../src/react/styles.css";
import "./page.css";
createRoot(document.getElementById("root")!).render(<>
  <h1>Component examples</h1><p>The two components have separate controls and settings.</p>
  <section id="custom" style={{ maxWidth: 680 }}><h2>Custom colors and settings</h2><NematicLab seed={7} initialMode="solid" initialPaused initialMaterial={{ heat: 0.1, density: 0.25 }} initialEnvironment={{ ions: 0 }} storageKey={false} theme={{ sample: "#172D42", rodHigh: "#91DCE5", rodLow: "#F2B67C", accent: "#215577" }} /></section>
  <section id="default" style={{ maxWidth: 680 }}><h2>Default settings</h2><NematicLab seed={42} initialPaused storageKey={false} /></section>
</>);
