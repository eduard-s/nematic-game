import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NematicLab } from "../src/react/index.js";
import "../src/react/styles.css";
import "./page.css";
createRoot(document.getElementById("root")!).render(<StrictMode><main>
  <header><h1>Nematic game</h1><p>Change the material. Make a small tornado.</p>
  <p><a href="https://github.com/eduard-s/nematic-game">Get the source</a>. Use the component in your app. Add your own tools.</p></header>
  <NematicLab />
  <footer><a href="https://esmirnov.ai/nematic-game/">Open the lab on esmirnov.ai</a></footer>
</main></StrictMode>);
