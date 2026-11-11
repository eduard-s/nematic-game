"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import copy from "./copy.json" with { type: "json" };
import { applyMaterialBrush, clearGameInput, materialMetrics, resizeNematicGame, setEnvironmentParameters, setMaterialMode, setMaterialParameters, stepNematicGame, stirMaterial, type Discovery, type MaterialTool, type Point, type EnvironmentParameters, type MagneticPlane, type MaterialParameters, type MaterialPhase, type NematicGame as World } from "../core/nematic-game.js";
import { DEFAULT_DISPLAY, renderNematicGame, type MaterialDisplay } from "../core/nematic-renderer.js";
import { environmentReadouts, materialReadouts, type EnvironmentSlider } from "./parameter-readouts.js";

const tools: MaterialTool[] = ["stir", "swirl", "pull", "comb"];
import { createConfiguredNematicGame, resolveOptions, type NematicOptions } from "../core/options.js";
import { resolveTheme, type NematicTheme } from "../core/theme.js";
export type NematicLabProps = NematicOptions & {
  theme?: Partial<NematicTheme>;
  transparentCanvas?: boolean;
  className?: string;
  style?: CSSProperties;
  onMetrics?: (metrics: ReturnType<typeof materialMetrics>) => void;
};
function ToolIcon({ tool }: { tool: MaterialTool }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{tool === "stir" ? <><path d="m5 19 9-9m-3-3 6 6m-2-8 4 4" /><path d="M4 5h4M6 3v4M18 17v4m-2-2h4" /></> : tool === "swirl" ? <><path d="M19 8a8 8 0 1 0 1 7M20 4v5h-5" /><path d="M15 10a4 4 0 1 0 1 4" /></> : tool === "pull" ? <><path d="m3 3 5 5H4m4 0V4m13 17-5-5h4m-4 0v4M21 3l-5 5V4m0 4h4M3 21l5-5H4m4 0v4" /><circle cx="12" cy="12" r="1" /></> : <><path d="M5 5h14v5H5zM6 10v9m4-9v9m4-9v9m4-9v9" /></>}</svg>;
}

const initialMetrics = { order: 0, count: 0, ionCount: 0, phase: "nematic" as MaterialPhase, settling: false, motion: 0, latticeError: 0, director: 0 };
function EnvironmentRange({ name, label, hint, value, min = 0, max = 100, degrees = false, disabled, onChange }: {
  name: EnvironmentSlider; label: string; hint?: string; value: number; min?: number; max?: number; degrees?: boolean; disabled: boolean; onChange: (value: number) => void;
}) {
  const id = useId(), position = Math.round(degrees ? value : value * 100);
  const readout = environmentReadouts[name](value);
  const shortLabel: Record<EnvironmentSlider, string> = { electric: "Strength", electricAngle: "Direction", electricResponse: "Rod response", magnetic: "Strength", magneticAngle: "Direction", magneticResponse: "Rod response", ions: "Amount", chargeStrength: "Charge", ionMobility: "Mobility", screening: "Screening" };
  return <div className="material-parameter material-field-range">
    <div className="material-parameter-label"><label htmlFor={id}>{shortLabel[name]}</label><output htmlFor={id}>{readout.text}</output></div>
    {hint && <p id={`${id}-hint`}>{hint}</p>}
    <input id={id} type="range" min={min} max={max} step={1} value={position} disabled={disabled}
      aria-label={label} title={hint} aria-describedby={hint ? `${id}-hint` : undefined} aria-valuetext={readout.spoken ?? readout.text}
      style={{ "--range-progress": `${(position - min) / (max - min) * 100}%` } as CSSProperties}
      onChange={event => onChange(Number(event.target.value) / (degrees ? 1 : 100))} />
  </div>;
}

function MaterialRange({ parameter, params, rodCount = 0, disabled, modeDisabled, onChange }: {
  parameter: { id: string; label: string; shortLabel?: string; description: string; low: string; high: string; modeHint?: string };
  params: MaterialParameters; rodCount?: number; disabled: boolean; modeDisabled?: boolean;
  onChange: (key: keyof MaterialParameters, value: number) => void;
}) {
  const id = useId();
  const key = parameter.id as keyof MaterialParameters, position = Math.round(params[key] * 100);
  const readout = materialReadouts[key](params[key], rodCount);
  return <div className="material-parameter">
    <div className="material-parameter-label"><label htmlFor={id}>{parameter.shortLabel ?? parameter.label}</label><output htmlFor={id}>{readout.text}</output></div>
    <p id={`${id}-hint`}>{modeDisabled ? parameter.modeHint : parameter.description}</p>
    <input id={id} type="range" min={0} max={100} step={1} value={position} disabled={disabled || modeDisabled}
      aria-label={parameter.label} title={`${modeDisabled ? parameter.modeHint : parameter.description} ${parameter.low} to ${parameter.high}.`} aria-describedby={`${id}-hint`} aria-valuetext={readout.spoken ?? readout.text}
      style={{ "--range-progress": `${position}%` } as CSSProperties}
      onChange={event => onChange(key, Number(event.target.value) / 100)} />
    <div className="material-range-ends" aria-hidden="true"><span>{parameter.low}</span><span>{parameter.high}</span></div>
  </div>;
}

export function NematicLab(props: NematicLabProps = {}) {
  const instanceId = useId();
  const [defaults] = useState(() => resolveOptions(props));
  const theme = useMemo(() => resolveTheme(props.theme), [props.theme]);
  const themeRef = useRef(theme); themeRef.current = theme;
  const transparentCanvas = useRef(props.transparentCanvas ?? false); transparentCanvas.current = props.transparentCanvas ?? false;
  const metricsCallback = useRef(props.onMetrics); metricsCallback.current = props.onMetrics;
  const discoveryKey = defaults.storageKey;
  const themeStyle = Object.fromEntries(Object.entries(theme).map(([key, value]) => [`--nematic-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, value])) as CSSProperties;
  const canvas = useRef<HTMLCanvasElement>(null), world = useRef<World | null>(null);
  const toolRef = useRef<MaterialTool>("stir");
  const pending = useRef({ delta: { x: 0, y: 0 }, pulse: false, stamp: false });
  const savedDiscoveries = useRef<Discovery[]>([]);
  const [tool, setTool] = useState<MaterialTool>("stir");
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [frameLimit, setFrameLimit] = useState(60);
  const held = useRef<number | null>(null), seed = useRef<number | null>(null);
  const displayRef = useRef<MaterialDisplay>({ ...defaults.display });
  const actions = useRef({ update: (_params: MaterialParameters) => {}, mode: (_mode: MaterialPhase) => {}, environment: (_params: EnvironmentParameters) => {}, toggle: () => {}, reset: () => {}, draw: () => {}, ripple: () => {} });
  const [params, setParams] = useState<MaterialParameters>({ ...defaults.material });
  const [environment, setEnvironment] = useState<EnvironmentParameters>({ ...defaults.environment });
  const [selectedMode, setSelectedMode] = useState<MaterialPhase>(defaults.mode);
  const [display, setDisplay] = useState<MaterialDisplay>({ ...defaults.display });
  const [metrics, setMetrics] = useState({ ...initialMetrics, phase: defaults.mode });
  const [paused, setPaused] = useState(false), [ready, setReady] = useState(false), [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const surface = canvas.current!, ctx = surface.getContext("2d");
    if (!ctx) { setUnavailable(true); return; }
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    if (seed.current === null) seed.current = defaults.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
    let state = createConfiguredNematicGame(surface.clientWidth, surface.clientHeight, seed.current, defaults);
    state.paused = motion.matches || defaults.paused; world.current = state; surface.dataset.running = "false";
    try {
      const stored: unknown = JSON.parse(discoveryKey ? localStorage.getItem(discoveryKey) || "[]" : "[]");
      savedDiscoveries.current = Array.isArray(stored) ? [...new Set(stored.filter((id): id is Discovery => copy.discoveries.items.some(item => item.id === id)))] : [];
      setDiscoveries(savedDiscoveries.current);
    } catch { /* Storage can be unavailable in private browsing. */ }
    let frame = 0, idleFrame = 0, last = 0, published = 0, visible = true;
    let interval = 1000 / 60, averageCost = 0, samples = 0;
    function publish() {
      const measured = materialMetrics(state); setMetrics(measured); metricsCallback.current?.(measured);
      const unlocked = state.play.discoveries.filter(id => !savedDiscoveries.current.includes(id));
      if (unlocked.length) {
        savedDiscoveries.current = [...savedDiscoveries.current, ...unlocked];
        setDiscoveries(savedDiscoveries.current);
        setAnnouncement(`${copy.discoveries.complete} ${unlocked.map(id => copy.discoveries.items.find(item => item.id === id)!.title).join(", ")}`);
        try { if (discoveryKey) localStorage.setItem(discoveryKey, JSON.stringify(savedDiscoveries.current)); } catch { /* Optional persistence. */ }
      }
    }
    function draw() { renderNematicGame(ctx!, state, motion.matches, displayRef.current, themeRef.current, transparentCanvas.current); }
    function stop() { cancelAnimationFrame(frame); cancelAnimationFrame(idleFrame); frame = 0; idleFrame = 0; last = 0; surface.dataset.running = "false"; }
    function invalidate() {
      if (!state.paused && visible && !document.hidden) { run(); return; }
      if (!idleFrame && visible && !document.hidden) idleFrame = requestAnimationFrame(() => { idleFrame = 0; draw(); });
    }
    function tick(time: number) {
      frame = 0;
      if (state.paused || document.hidden || !visible) { stop(); return; }
      if (last && time - last < interval - 0.75) { frame = requestAnimationFrame(tick); return; }
      const started = performance.now(), dt = last ? Math.min((time - last) / 1000, 1 / 30) : 1 / 60;
      last = time;
      const input = pending.current;
      if (state.pointer.down || input.stamp) applyMaterialBrush(state, state.pointer, input.delta, toolRef.current, dt, input.pulse);
      input.delta.x = 0; input.delta.y = 0; input.pulse = false; input.stamp = false;
      stepNematicGame(state, dt); draw();
      if (time - published > 200) { publish(); published = time; }
      averageCost += (performance.now() - started - averageCost) * 0.05;
      // Slow devices get fewer frames, never extra catch-up work. Hysteresis
      // avoids bouncing between budgets. Display quality never changes physics.
      if (++samples > 120 && ((interval < 20 && averageCost > 12) || (interval > 20 && averageCost < 6))) {
        interval = interval < 20 ? 1000 / 30 : 1000 / 60; samples = 0;
        setFrameLimit(interval > 20 ? 30 : 60);
      }
      frame = requestAnimationFrame(tick);
    }
    function run() {
      if (!frame && !state.paused && visible && !document.hidden) {
        last = 0; surface.dataset.running = "true"; frame = requestAnimationFrame(tick);
      }
    }
    function release() {
      clearGameInput(state);
      const pointerId = held.current; held.current = null;
      if (pointerId !== null && surface.hasPointerCapture(pointerId)) surface.releasePointerCapture(pointerId);
      pending.current = { delta: { x: 0, y: 0 }, pulse: false, stamp: false };
    }
    function resize() {
      const width = surface.clientWidth, height = surface.clientHeight;
      if (!width || !height) return;
      const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1_600_000 / (width * height)));
      surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio);
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      resizeNematicGame(state, width, height); release(); draw(); publish();
    }
    function visibility() { if (document.hidden) { release(); stop(); } else run(); }
    function motionChange() { if (motion.matches) { state.paused = true; setPaused(true); release(); stop(); } draw(); }
    actions.current = {
      draw: invalidate,
      ripple: () => { if (!state.paused) { stirMaterial(state, { x: state.width / 2, y: state.height / 2 }, { x: 0, y: 0 }, true); invalidate(); } },
      update: next => { setMaterialParameters(state, next); draw(); publish(); },
      mode: next => { release(); setMaterialMode(state, next); draw(); publish(); },
      environment: next => { setEnvironmentParameters(state, next); draw(); publish(); },
      toggle: () => { state.paused = !state.paused; setPaused(state.paused); release(); if (state.paused) stop(); else run(); draw(); publish(); },
      reset: () => {
        stop(); state = createConfiguredNematicGame(surface.clientWidth, surface.clientHeight, seed.current!, defaults);
        state.paused = motion.matches || defaults.paused; world.current = state; release();
        setParams({ ...defaults.material }); setSelectedMode(defaults.mode); setEnvironment({ ...defaults.environment }); setPaused(state.paused); setTool("stir"); toolRef.current = "stir"; state.tool = "stir"; draw(); publish(); run();
        displayRef.current = { ...defaults.display }; setDisplay({ ...defaults.display }); draw();
      }
    };
    const observer = new ResizeObserver(resize); observer.observe(surface);
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) run(); else { release(); stop(); }
    });
    intersection.observe(surface);
    document.addEventListener("visibilitychange", visibility); window.addEventListener("blur", release); motion.addEventListener("change", motionChange);
    resize(); setPaused(state.paused); setReady(true); run();
    return () => { stop(); observer.disconnect(); intersection.disconnect(); document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", release); motion.removeEventListener("change", motionChange); world.current = null; held.current = null; };
  }, []);

  useEffect(() => { actions.current.draw(); }, [theme, props.transparentCanvas]);

  function selectTool(next: MaterialTool) {
    setTool(next); toolRef.current = next;
    if (world.current) world.current.tool = next;
    actions.current.draw();
  }
  function queueBrush(delta: Point, pulse = false) {
    pending.current.delta.x += delta.x; pending.current.delta.y += delta.y;
    pending.current.pulse ||= pulse; pending.current.stamp = true;
    actions.current.draw();
  }
  function update(next: MaterialParameters) { setParams(next); actions.current.update(next); }
  function updateEnvironment(next: EnvironmentParameters) { setEnvironment(next); actions.current.environment(next); }
  function updateDisplay(next: MaterialDisplay) {
    displayRef.current = next; setDisplay(next);
    actions.current.draw();
  }
  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function release(event: PointerEvent<HTMLCanvasElement>) {
    if (held.current !== event.pointerId) return;
    held.current = null; if (world.current) clearGameInput(world.current);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    actions.current.draw();
  }
  const phase = copy.presets.find(p => p.id === metrics.phase)!;

  return <div className={["nematic-game", props.className].filter(Boolean).join(" ")} data-transparent-canvas={props.transparentCanvas ?? false} style={{ ...themeStyle, ...props.style }}>
    <div className="material-lab">
      <section className="material-sample" aria-label="Live material sample">
        <div className="material-sample-bar">
        <div className="material-control-header">
        <div className="material-start-label"><span>{copy.startingState}</span></div>
        <div className="material-presets" aria-label={copy.startingState}>
          {copy.presets.map(preset => <button type="button" key={preset.id} disabled={!ready}
            aria-pressed={selectedMode === preset.id} title={`${copy.modeHints[preset.id as MaterialPhase]} ${copy.changeStructure}`}
            onClick={() => { setSelectedMode(preset.id as MaterialPhase); actions.current.mode(preset.id as MaterialPhase); }}>{preset.label}</button>)}
        </div>
        <p className="material-preset-help">{copy.presetHint}</p>
        </div>
          <div className="material-sample-actions">
          <button className="material-pause" type="button" disabled={!ready} onClick={() => actions.current.toggle()}
            aria-label={paused ? copy.resume : copy.pause} title={paused ? copy.resume : copy.pause}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{paused ? <path d="m9 5 10 7-10 7Z" /> : <><path d="M8 5v14" /><path d="M16 5v14" /></>}</svg>
          </button>
        <button type="button" className="material-reset" aria-label={copy.reset} title={copy.reset} disabled={!ready} onClick={() => actions.current.reset()}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 8a6.5 6.5 0 1 1 .7 6M3.5 3v5h5" /></svg>{copy.resetShort}
        </button>
          </div>
        </div>
        <div className="material-canvas">
          <canvas ref={canvas} tabIndex={0} role="application" aria-label={copy.accessibleLabel} data-structure={selectedMode} data-frame-limit={frameLimit}
            onPointerDown={event => {
              if (event.button !== 0 || held.current !== null || !world.current) return;
              event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); held.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              const p = point(event); world.current.pointer = { ...p, active: true, down: true };
              queueBrush({ x: 0, y: 0 }, true);
            }}
            onPointerMove={event => {
              const state = world.current; if (!state || (event.pointerType !== "mouse" && held.current !== event.pointerId)) return;
              const p = point(event), previous = state.pointer;
              if (held.current === event.pointerId) queueBrush({ x: p.x - previous.x, y: p.y - previous.y });
              state.pointer = { ...p, active: true, down: held.current === event.pointerId }; actions.current.draw();
            }}
            onPointerUp={release} onPointerCancel={release}
            onLostPointerCapture={() => { held.current = null; if (world.current) clearGameInput(world.current); actions.current.draw(); }}
            onPointerLeave={() => { if (held.current === null && world.current) { clearGameInput(world.current); actions.current.draw(); } }}
            onKeyDown={event => {
              const state = world.current;
              if (!state) return;
              if (["1", "2", "3", "4"].includes(event.key)) { event.preventDefault(); selectTool(tools[Number(event.key) - 1]); }
              else if (event.key.startsWith("Arrow")) {
                event.preventDefault();
                const delta = { x: event.key === "ArrowLeft" ? -14 : event.key === "ArrowRight" ? 14 : 0, y: event.key === "ArrowUp" ? -14 : event.key === "ArrowDown" ? 14 : 0 };
                state.pointer.x = Math.max(0, Math.min(state.width, state.pointer.x + delta.x));
                state.pointer.y = Math.max(0, Math.min(state.height, state.pointer.y + delta.y));
                state.pointer.active = true; queueBrush(delta);
              }
              else if (event.key === "Escape" && !event.repeat) { event.preventDefault(); actions.current.toggle(); }
              else if (event.key === " ") {
                event.preventDefault();
                state.pointer.active = true; state.pointer.down = true;
                queueBrush({ x: 0, y: 0 }, !event.repeat);
              }
            }}
            onKeyUp={event => { if (event.key === " " && world.current) { event.preventDefault(); world.current.pointer.down = false; } }}
            onBlur={() => { if (held.current === null && world.current) { clearGameInput(world.current); pending.current = { delta: { x: 0, y: 0 }, pulse: false, stamp: false }; } }}>
            {copy.fallback}
          </canvas>
          {unavailable && <p className="material-fallback">{copy.fallback}</p>}
          <noscript><p className="material-fallback">{copy.fallback}</p></noscript>
          {announcement && <p key={announcement} className="material-discovery-toast" aria-hidden="true">{announcement}</p>}
        </div>
        <div className="material-playbar" role="group" aria-label={copy.tools.title}>
          <div className="material-brushes">{tools.map((id, index) => <button type="button" key={id} disabled={!ready}
            aria-pressed={tool === id} title={`${copy.tools[id].hint} (${index + 1})`} onClick={() => selectTool(id)}>
            <ToolIcon tool={id} /><span>{copy.tools[id].label}</span><kbd aria-hidden="true">{index + 1}</kbd>
          </button>)}</div>
          <button className="material-ripple" type="button" aria-label={copy.tools.ripple} title={copy.tools.ripple} disabled={!ready || paused} onClick={() => actions.current.ripple()}>{copy.tools.rippleShort}</button>
        </div>
        <p className="material-brush-hint">{paused ? "Motion is paused. Resume to use a brush." : copy.tools[tool].hint}</p>
        <div className="material-sample-footer">
          <div className="material-sample-state"><span className="material-live-dot" data-paused={paused} aria-hidden="true" /><h2><span className="material-state-prefix">{copy.currentState} </span>{metrics.settling ? copy.settling : phase.label}</h2>
            {ready && <span className="material-count">{metrics.count} rods · {metrics.ionCount} {environment.charged ? "ions" : "tracers"}</span>}</div>
          <span><i aria-hidden="true" />{copy.legend}</span>
          {metrics.ionCount > 0 && <span className="material-ion-key">{environment.charged ? <><b className="ion-positive">+</b><b className="ion-negative">-</b>{copy.fields.ionKey}</> : <><b className="ion-neutral">0</b>{copy.fields.neutralKey}</>}</span>}
        </div>
      </section>
      <aside className="material-controls" aria-labelledby={`${instanceId}-controls-title`}>
        <h2 id={`${instanceId}-controls-title`}>{copy.groups.title}</h2>
        <div className="material-controls-left">
        <fieldset className="material-field-group material-base-group"><legend>{copy.materialTitle}</legend>
        <div className="material-sliders">
          {copy.parameters.map(parameter => <MaterialRange key={parameter.id} parameter={parameter} params={params} rodCount={metrics.count} disabled={!ready}
            modeDisabled={parameter.id === "alignment" && selectedMode === "liquid"} onChange={(key, value) => update({ ...params, [key]: value })} />)}
        </div>
        </fieldset>
        <fieldset className="material-field-group material-shape-group"><legend>{copy.shapeTitle}</legend>
          <div className="material-sliders">
            {copy.extraParameters.map(parameter => <MaterialRange key={parameter.id} parameter={parameter} params={params} disabled={!ready}
              modeDisabled={parameter.id === "stiffness" && selectedMode !== "solid"} onChange={(key, value) => update({ ...params, [key]: value })} />)}
          </div>
        </fieldset>
        <fieldset className="material-field-group material-display-group"><legend>{copy.display.title}</legend>
          <div className="material-detail-options">
            {(["mesh", "directors", "trails", "detail", "wakes", "polarized"] as const).map(key => <label key={key}>
              <input type="checkbox" id={`${instanceId}-display-${key}`} checked={display[key]} disabled={!ready} title={key === "polarized" ? copy.display.polarizedHint : undefined} aria-describedby={key === "polarized" ? `${instanceId}-polarized-hint` : undefined} onChange={event => updateDisplay({ ...display, [key]: event.target.checked })} />{copy.display[key]}
            </label>)}
          </div>
          <p className="material-display-note" id={`${instanceId}-polarized-hint`}>{copy.display.polarizedHint}</p>
        </fieldset>
        </div>
        <div className="material-controls-right">
          <fieldset className="material-field-group material-environment-group"><legend>{copy.fields.electricTitle}</legend>
            <EnvironmentRange name="electric" label={copy.fields.electricStrength} value={environment.electric} disabled={!ready}
              onChange={value => updateEnvironment({ ...environment, electric: value })} />
            <EnvironmentRange name="electricAngle" label={copy.fields.electricAngle} value={environment.electricAngle} max={360} degrees disabled={!ready}
              hint={copy.fields.angleHint} onChange={value => updateEnvironment({ ...environment, electricAngle: value })} />
            <EnvironmentRange name="electricResponse" label={copy.fields.electricResponse} hint={copy.fields.responseHint} value={environment.electricResponse} min={-100} disabled={!ready}
              onChange={value => updateEnvironment({ ...environment, electricResponse: value })} />
            <p className="material-field-note">{copy.fields.electricHint}</p>
          <div className="material-field-actions">
            <button type="button" disabled={!ready} onClick={() => updateEnvironment({ ...environment, electric: 0.7, electricAngle: 0, magnetic: 0.55, magneticPlane: "out", ions: 0.5, charged: true })}>{copy.fields.demoLabel}</button>
            <button type="button" disabled={!ready} onClick={() => updateEnvironment({ ...environment, electric: 0, magnetic: 0 })}>{copy.fields.clearLabel}</button>
          </div>
          </fieldset>
          <fieldset className="material-field-group material-environment-group"><legend>{copy.fields.magneticTitle}</legend>
            <EnvironmentRange name="magnetic" label={copy.fields.magneticStrength} value={environment.magnetic} disabled={!ready}
              onChange={value => updateEnvironment({ ...environment, magnetic: value })} />
            <div className="material-plane-control">
            <label className="material-plane-label" htmlFor={`${instanceId}-magnetic-plane`}>Plane</label>
            <select id={`${instanceId}-magnetic-plane`} aria-label={copy.fields.planeLabel} value={environment.magneticPlane} disabled={!ready}
              onChange={event => updateEnvironment({ ...environment, magneticPlane: event.target.value as MagneticPlane })}>
              {copy.fields.planes.map(plane => <option value={plane.value} key={plane.value}>{plane.label}</option>)}
            </select>
            </div>
            <EnvironmentRange name="magneticAngle" label={copy.fields.magneticAngle} value={environment.magneticAngle} max={180} degrees
              disabled={!ready || environment.magneticPlane !== "in-plane"} onChange={value => updateEnvironment({ ...environment, magneticAngle: value })} />
            <EnvironmentRange name="magneticResponse" label={copy.fields.magneticResponse} hint={copy.fields.responseHint} value={environment.magneticResponse} min={-100}
              disabled={!ready || environment.magneticPlane !== "in-plane"} onChange={value => updateEnvironment({ ...environment, magneticResponse: value })} />
            <p className="material-field-note">{environment.magneticPlane === "in-plane" ? copy.fields.inPlaneHint : copy.fields.throughPlaneHint}</p>
          </fieldset>
          <fieldset className="material-field-group material-ions-group"><legend>{copy.groups.particles}</legend>
            <EnvironmentRange name="ions" label={copy.fields.amountLabel} value={environment.ions} disabled={!ready}
              onChange={value => updateEnvironment({ ...environment, ions: value })} />
            <label className="material-charge-switch"><span>Charged<small>{environment.charged ? copy.fields.chargedLabel : copy.fields.neutralLabel}</small></span>
              <input type="checkbox" role="switch" checked={environment.charged} disabled={!ready} aria-label={copy.fields.chargeLabel}
                onChange={event => updateEnvironment({ ...environment, charged: event.target.checked })} />
            </label>
            <p className="material-field-note">{environment.charged ? copy.fields.chargedHint : copy.fields.neutralHint}</p>
            <p className="material-ion-count">{environment.charged ? `${metrics.ionCount / 2} positive / ${metrics.ionCount / 2} negative` : `${metrics.ionCount} neutral tracers`}</p>
            <EnvironmentRange name="chargeStrength" label={copy.fields.chargeStrength} value={environment.chargeStrength} min={10} max={200} disabled={!ready || !environment.charged}
              hint={copy.fields.chargeHint} onChange={value => updateEnvironment({ ...environment, chargeStrength: value })} />
            <EnvironmentRange name="ionMobility" label={copy.fields.ionMobility} value={environment.ionMobility} disabled={!ready}
              hint={copy.fields.mobilityHint} onChange={value => updateEnvironment({ ...environment, ionMobility: value })} />
            <EnvironmentRange name="screening" label={copy.fields.screening} value={environment.screening} disabled={!ready || !environment.charged}
              hint={copy.fields.screeningHint} onChange={value => updateEnvironment({ ...environment, screening: value })} />
          </fieldset>
        </div>
      </aside>
      <section className="material-readouts" aria-labelledby={`${instanceId}-readouts-title`}>
        <h2 id={`${instanceId}-readouts-title`}>{copy.groups.readouts}</h2>
        <dl className="material-stats">
          <div><dt>{copy.orderLabel}</dt><dd className="material-order"><progress id={`${instanceId}-order`} aria-label={copy.orderLabel} aria-valuetext={`${metrics.order.toFixed(2)} out of 1`} title={copy.orderHint} max={1} value={metrics.order} /><output>{metrics.order.toFixed(2)}</output></dd></div>
          <div><dt>{copy.motionLabel}</dt><dd>{metrics.motion.toFixed(1)} <span>px/s</span></dd></div>
          <div><dt>{copy.latticeLabel}</dt><dd>{selectedMode === "solid" ? `${metrics.latticeError.toFixed(1)} px` : "Free"}</dd></div>
          <div><dt>{copy.directorLabel}</dt><dd>{metrics.order > 0.15 ? `${Math.round(metrics.director)}°` : "Unordered"}</dd></div>
        </dl>
      </section>
      <section className="material-experiments">
        <h2>{copy.discoveries.title} <span>{discoveries.length}/{copy.discoveries.items.length}</span></h2>
        <div className="material-discoveries">
          <p className="material-field-note">{discoveryKey ? copy.discoveries.saved : "Discoveries last until you reload this page."}</p>
          <ol>{copy.discoveries.items.map((item, index) => <li key={item.id} data-complete={discoveries.includes(item.id as Discovery)}>
            <span className="material-discovery-mark" aria-label={discoveries.includes(item.id as Discovery) ? "Discovered" : "To discover"}>{discoveries.includes(item.id as Discovery) ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg> : String(index + 1).padStart(2, "0")}</span>
            <div><strong>{item.title}</strong><p>{item.hint}</p></div>
          </li>)}</ol>
          <p className="material-keyboard-hint">{copy.tools.keyboard}</p>
        </div>
      </section>
    </div>
    <p className="material-announcement" role="status" aria-live="polite">{announcement}</p>
    <p className="material-model-note">{copy.modelNote}</p>
  </div>;
}
