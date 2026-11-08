"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import copy from "./copy.json" with { type: "json" };
import { applyMaterialBrush, clearGameInput, materialMetrics, resizeNematicGame, setEnvironmentParameters, setMaterialMode, setMaterialParameters, stepNematicGame, stirMaterial } from "../core/nematic-game.js";
import { renderNematicGame } from "../core/nematic-renderer.js";
const tools = ["stir", "swirl", "pull", "comb"];
import { createConfiguredNematicGame, resolveOptions } from "../core/options.js";
import { resolveTheme } from "../core/theme.js";
function ToolIcon({ tool }) {
    return _jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: tool === "stir" ? _jsxs(_Fragment, { children: [_jsx("path", { d: "m5 19 9-9m-3-3 6 6m-2-8 4 4" }), _jsx("path", { d: "M4 5h4M6 3v4M18 17v4m-2-2h4" })] }) : tool === "swirl" ? _jsxs(_Fragment, { children: [_jsx("path", { d: "M19 8a8 8 0 1 0 1 7M20 4v5h-5" }), _jsx("path", { d: "M15 10a4 4 0 1 0 1 4" })] }) : tool === "pull" ? _jsxs(_Fragment, { children: [_jsx("path", { d: "m3 3 5 5H4m4 0V4m13 17-5-5h4m-4 0v4M21 3l-5 5V4m0 4h4M3 21l5-5H4m4 0v4" }), _jsx("circle", { cx: "12", cy: "12", r: "1" })] }) : _jsx(_Fragment, { children: _jsx("path", { d: "M5 5h14v5H5zM6 10v9m4-9v9m4-9v9m4-9v9" }) }) });
}
const initialMetrics = { order: 0, count: 0, ionCount: 0, phase: "nematic", settling: false, motion: 0, latticeError: 0, director: 0 };
function EnvironmentRange({ name, label, hint, value, min = 0, max = 100, degrees = false, disabled, onChange }) {
    const id = useId(), shown = Math.round(degrees ? value : value * 100);
    return _jsxs("div", { className: "material-parameter material-field-range", children: [_jsxs("div", { className: "material-parameter-label", children: [_jsx("label", { htmlFor: id, children: label }), _jsxs("output", { htmlFor: id, children: [shown, _jsx("span", { children: degrees ? "°" : "%" })] })] }), hint && _jsx("p", { id: `${id}-hint`, children: hint }), _jsx("input", { id: id, type: "range", min: min, max: max, step: 1, value: shown, disabled: disabled, title: hint, "aria-describedby": hint ? `${id}-hint` : undefined, "aria-valuetext": degrees ? `${shown} degrees` : `${shown} percent, relative scale`, style: { "--range-progress": `${(shown - min) / (max - min) * 100}%` }, onChange: event => onChange(Number(event.target.value) / (degrees ? 1 : 100)) })] });
}
function MaterialRange({ parameter, params, disabled, modeDisabled, onChange }) {
    const id = useId();
    const key = parameter.id, percent = Math.round(params[key] * 100);
    return _jsxs("div", { className: "material-parameter", children: [_jsxs("div", { className: "material-parameter-label", children: [_jsx("label", { htmlFor: id, children: parameter.label }), _jsxs("output", { htmlFor: id, children: [percent, _jsx("span", { children: "%" })] })] }), _jsx("p", { id: `${id}-hint`, children: modeDisabled ? parameter.modeHint : parameter.description }), _jsx("input", { id: id, type: "range", min: 0, max: 100, step: 1, value: percent, disabled: disabled || modeDisabled, title: `${modeDisabled ? parameter.modeHint : parameter.description} ${parameter.low} to ${parameter.high}.`, "aria-describedby": `${id}-hint`, "aria-valuetext": `${percent} percent, relative scale`, style: { "--range-progress": `${percent}%` }, onChange: event => onChange(key, Number(event.target.value) / 100) }), _jsxs("div", { className: "material-range-ends", "aria-hidden": "true", children: [_jsx("span", { children: parameter.low }), _jsx("span", { children: parameter.high })] })] });
}
export function NematicLab(props = {}) {
    const instanceId = useId();
    const [defaults] = useState(() => resolveOptions(props));
    const theme = useMemo(() => resolveTheme(props.theme), [props.theme]);
    const themeRef = useRef(theme);
    themeRef.current = theme;
    const metricsCallback = useRef(props.onMetrics);
    metricsCallback.current = props.onMetrics;
    const discoveryKey = defaults.storageKey;
    const themeStyle = Object.fromEntries(Object.entries(theme).map(([key, value]) => [`--nematic-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, value]));
    const canvas = useRef(null), world = useRef(null);
    const toolRef = useRef("stir");
    const pending = useRef({ delta: { x: 0, y: 0 }, pulse: false, stamp: false });
    const savedDiscoveries = useRef([]);
    const [tool, setTool] = useState("stir");
    const [discoveries, setDiscoveries] = useState([]);
    const [announcement, setAnnouncement] = useState("");
    const [frameLimit, setFrameLimit] = useState(60);
    const held = useRef(null), seed = useRef(null);
    const displayRef = useRef({ ...defaults.display });
    const actions = useRef({ update: (_params) => { }, mode: (_mode) => { }, environment: (_params) => { }, toggle: () => { }, reset: () => { }, draw: () => { }, ripple: () => { } });
    const [params, setParams] = useState({ ...defaults.material });
    const [environment, setEnvironment] = useState({ ...defaults.environment });
    const [selectedMode, setSelectedMode] = useState(defaults.mode);
    const [display, setDisplay] = useState({ ...defaults.display });
    const [metrics, setMetrics] = useState({ ...initialMetrics, phase: defaults.mode });
    const [paused, setPaused] = useState(false), [ready, setReady] = useState(false), [unavailable, setUnavailable] = useState(false);
    useEffect(() => {
        const surface = canvas.current, ctx = surface.getContext("2d");
        if (!ctx) {
            setUnavailable(true);
            return;
        }
        const motion = matchMedia("(prefers-reduced-motion: reduce)");
        if (seed.current === null)
            seed.current = defaults.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
        let state = createConfiguredNematicGame(surface.clientWidth, surface.clientHeight, seed.current, defaults);
        state.paused = motion.matches || defaults.paused;
        world.current = state;
        surface.dataset.running = "false";
        try {
            const stored = JSON.parse(discoveryKey ? localStorage.getItem(discoveryKey) || "[]" : "[]");
            savedDiscoveries.current = Array.isArray(stored) ? [...new Set(stored.filter((id) => copy.discoveries.items.some(item => item.id === id)))] : [];
            setDiscoveries(savedDiscoveries.current);
        }
        catch { /* Storage can be unavailable in private browsing. */ }
        let frame = 0, idleFrame = 0, last = 0, published = 0, visible = true;
        let interval = 1000 / 60, averageCost = 0, samples = 0;
        function publish() {
            const measured = materialMetrics(state);
            setMetrics(measured);
            metricsCallback.current?.(measured);
            const unlocked = state.play.discoveries.filter(id => !savedDiscoveries.current.includes(id));
            if (unlocked.length) {
                savedDiscoveries.current = [...savedDiscoveries.current, ...unlocked];
                setDiscoveries(savedDiscoveries.current);
                setAnnouncement(`${copy.discoveries.complete} ${unlocked.map(id => copy.discoveries.items.find(item => item.id === id).title).join(", ")}`);
                try {
                    if (discoveryKey)
                        localStorage.setItem(discoveryKey, JSON.stringify(savedDiscoveries.current));
                }
                catch { /* Optional persistence. */ }
            }
        }
        function draw() { renderNematicGame(ctx, state, motion.matches, displayRef.current, themeRef.current); }
        function stop() { cancelAnimationFrame(frame); cancelAnimationFrame(idleFrame); frame = 0; idleFrame = 0; last = 0; surface.dataset.running = "false"; }
        function invalidate() {
            if (!state.paused && visible && !document.hidden) {
                run();
                return;
            }
            if (!idleFrame && visible && !document.hidden)
                idleFrame = requestAnimationFrame(() => { idleFrame = 0; draw(); });
        }
        function tick(time) {
            frame = 0;
            if (state.paused || document.hidden || !visible) {
                stop();
                return;
            }
            if (last && time - last < interval - 0.75) {
                frame = requestAnimationFrame(tick);
                return;
            }
            const started = performance.now(), dt = last ? Math.min((time - last) / 1000, 1 / 30) : 1 / 60;
            last = time;
            const input = pending.current;
            if (state.pointer.down || input.stamp)
                applyMaterialBrush(state, state.pointer, input.delta, toolRef.current, dt, input.pulse);
            input.delta.x = 0;
            input.delta.y = 0;
            input.pulse = false;
            input.stamp = false;
            stepNematicGame(state, dt);
            draw();
            if (time - published > 200) {
                publish();
                published = time;
            }
            averageCost += (performance.now() - started - averageCost) * 0.05;
            // Slow devices get fewer frames, never extra catch-up work. Hysteresis
            // avoids bouncing between budgets. Display quality never changes physics.
            if (++samples > 120 && ((interval < 20 && averageCost > 12) || (interval > 20 && averageCost < 6))) {
                interval = interval < 20 ? 1000 / 30 : 1000 / 60;
                samples = 0;
                setFrameLimit(interval > 20 ? 30 : 60);
            }
            frame = requestAnimationFrame(tick);
        }
        function run() {
            if (!frame && !state.paused && visible && !document.hidden) {
                last = 0;
                surface.dataset.running = "true";
                frame = requestAnimationFrame(tick);
            }
        }
        function release() {
            clearGameInput(state);
            const pointerId = held.current;
            held.current = null;
            if (pointerId !== null && surface.hasPointerCapture(pointerId))
                surface.releasePointerCapture(pointerId);
            pending.current = { delta: { x: 0, y: 0 }, pulse: false, stamp: false };
        }
        function resize() {
            const width = surface.clientWidth, height = surface.clientHeight;
            if (!width || !height)
                return;
            const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1_600_000 / (width * height)));
            surface.width = Math.round(width * ratio);
            surface.height = Math.round(height * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            resizeNematicGame(state, width, height);
            release();
            draw();
            publish();
        }
        function visibility() { if (document.hidden) {
            release();
            stop();
        }
        else
            run(); }
        function motionChange() { if (motion.matches) {
            state.paused = true;
            setPaused(true);
            release();
            stop();
        } draw(); }
        actions.current = {
            draw: invalidate,
            ripple: () => { if (!state.paused) {
                stirMaterial(state, { x: state.width / 2, y: state.height / 2 }, { x: 0, y: 0 }, true);
                invalidate();
            } },
            update: next => { setMaterialParameters(state, next); draw(); publish(); },
            mode: next => { release(); setMaterialMode(state, next); draw(); publish(); },
            environment: next => { setEnvironmentParameters(state, next); draw(); publish(); },
            toggle: () => { state.paused = !state.paused; setPaused(state.paused); release(); if (state.paused)
                stop();
            else
                run(); draw(); publish(); },
            reset: () => {
                stop();
                state = createConfiguredNematicGame(surface.clientWidth, surface.clientHeight, seed.current, defaults);
                state.paused = motion.matches || defaults.paused;
                world.current = state;
                release();
                setParams({ ...defaults.material });
                setSelectedMode(defaults.mode);
                setEnvironment({ ...defaults.environment });
                setPaused(state.paused);
                setTool("stir");
                toolRef.current = "stir";
                state.tool = "stir";
                draw();
                publish();
                run();
                displayRef.current = { ...defaults.display };
                setDisplay({ ...defaults.display });
                draw();
            }
        };
        const observer = new ResizeObserver(resize);
        observer.observe(surface);
        const intersection = new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
            if (visible)
                run();
            else {
                release();
                stop();
            }
        });
        intersection.observe(surface);
        document.addEventListener("visibilitychange", visibility);
        window.addEventListener("blur", release);
        motion.addEventListener("change", motionChange);
        resize();
        setPaused(state.paused);
        setReady(true);
        run();
        return () => {
            stop();
            observer.disconnect();
            intersection.disconnect();
            document.removeEventListener("visibilitychange", visibility);
            window.removeEventListener("blur", release);
            motion.removeEventListener("change", motionChange);
            world.current = null;
            held.current = null;
        };
    }, []);
    useEffect(() => { actions.current.draw(); }, [theme]);
    function selectTool(next) {
        setTool(next);
        toolRef.current = next;
        if (world.current)
            world.current.tool = next;
        actions.current.draw();
    }
    function queueBrush(delta, pulse = false) {
        pending.current.delta.x += delta.x;
        pending.current.delta.y += delta.y;
        pending.current.pulse ||= pulse;
        pending.current.stamp = true;
        actions.current.draw();
    }
    function update(next) { setParams(next); actions.current.update(next); }
    function updateEnvironment(next) { setEnvironment(next); actions.current.environment(next); }
    function updateDisplay(next) {
        displayRef.current = next;
        setDisplay(next);
        actions.current.draw();
    }
    function point(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    function release(event) {
        if (held.current !== event.pointerId)
            return;
        held.current = null;
        if (world.current)
            clearGameInput(world.current);
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        actions.current.draw();
    }
    const phase = copy.presets.find(p => p.id === metrics.phase);
    return _jsxs("div", { className: ["nematic-game", props.className].filter(Boolean).join(" "), style: { ...themeStyle, ...props.style }, children: [_jsxs("div", { className: "material-lab", children: [_jsxs("section", { className: "material-sample", "aria-label": "Live material sample", children: [_jsxs("div", { className: "material-sample-bar", children: [_jsxs("div", { className: "material-sample-state", children: [_jsx("span", { className: "material-live-dot", "data-paused": paused, "aria-hidden": "true" }), _jsxs("h2", { children: [_jsxs("span", { className: "material-state-prefix", children: [copy.currentState, " "] }), metrics.settling ? copy.settling : phase.label] }), ready && _jsxs("span", { className: "material-count", children: [metrics.count, " rods \u00B7 ", metrics.ionCount, " ", environment.charged ? "ions" : "tracers"] })] }), _jsx("button", { className: "material-pause", type: "button", disabled: !ready, onClick: () => actions.current.toggle(), "aria-label": paused ? copy.resume : copy.pause, title: paused ? copy.resume : copy.pause, children: _jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: paused ? _jsx("path", { d: "m9 5 10 7-10 7Z" }) : _jsxs(_Fragment, { children: [_jsx("path", { d: "M8 5v14" }), _jsx("path", { d: "M16 5v14" })] }) }) })] }), _jsxs("div", { className: "material-canvas", children: [_jsx("canvas", { ref: canvas, tabIndex: 0, role: "application", "aria-label": copy.accessibleLabel, "data-structure": selectedMode, onPointerDown: event => {
                                            if (event.button !== 0 || held.current !== null || !world.current)
                                                return;
                                            event.preventDefault();
                                            event.currentTarget.focus({ preventScroll: true });
                                            held.current = event.pointerId;
                                            event.currentTarget.setPointerCapture(event.pointerId);
                                            const p = point(event);
                                            world.current.pointer = { ...p, active: true, down: true };
                                            queueBrush({ x: 0, y: 0 }, true);
                                        }, onPointerMove: event => {
                                            const state = world.current;
                                            if (!state || (event.pointerType !== "mouse" && held.current !== event.pointerId))
                                                return;
                                            const p = point(event), previous = state.pointer;
                                            if (held.current === event.pointerId)
                                                queueBrush({ x: p.x - previous.x, y: p.y - previous.y });
                                            state.pointer = { ...p, active: true, down: held.current === event.pointerId };
                                            actions.current.draw();
                                        }, onPointerUp: release, onPointerCancel: release, onLostPointerCapture: () => { held.current = null; if (world.current)
                                            clearGameInput(world.current); actions.current.draw(); }, onPointerLeave: () => { if (held.current === null && world.current) {
                                            clearGameInput(world.current);
                                            actions.current.draw();
                                        } }, onKeyDown: event => {
                                            const state = world.current;
                                            if (!state)
                                                return;
                                            if (["1", "2", "3", "4"].includes(event.key)) {
                                                event.preventDefault();
                                                selectTool(tools[Number(event.key) - 1]);
                                            }
                                            else if (event.key.startsWith("Arrow")) {
                                                event.preventDefault();
                                                const delta = { x: event.key === "ArrowLeft" ? -14 : event.key === "ArrowRight" ? 14 : 0, y: event.key === "ArrowUp" ? -14 : event.key === "ArrowDown" ? 14 : 0 };
                                                state.pointer.x = Math.max(0, Math.min(state.width, state.pointer.x + delta.x));
                                                state.pointer.y = Math.max(0, Math.min(state.height, state.pointer.y + delta.y));
                                                state.pointer.active = true;
                                                queueBrush(delta);
                                            }
                                            else if (event.key === "Escape" && !event.repeat) {
                                                event.preventDefault();
                                                actions.current.toggle();
                                            }
                                            else if (event.key === " ") {
                                                event.preventDefault();
                                                state.pointer.active = true;
                                                state.pointer.down = true;
                                                queueBrush({ x: 0, y: 0 }, !event.repeat);
                                            }
                                        }, onKeyUp: event => { if (event.key === " " && world.current) {
                                            event.preventDefault();
                                            world.current.pointer.down = false;
                                        } }, onBlur: () => { if (held.current === null && world.current) {
                                            clearGameInput(world.current);
                                            pending.current = { delta: { x: 0, y: 0 }, pulse: false, stamp: false };
                                        } }, children: copy.fallback }), unavailable && _jsx("p", { className: "material-fallback", children: copy.fallback }), _jsx("noscript", { children: _jsx("p", { className: "material-fallback", children: copy.fallback }) }), announcement && _jsx("p", { className: "material-discovery-toast", "aria-hidden": "true", children: announcement }, announcement)] }), _jsxs("div", { className: "material-playbar", role: "group", "aria-label": copy.tools.title, children: [_jsx("div", { className: "material-brushes", children: tools.map((id, index) => _jsxs("button", { type: "button", disabled: !ready, "aria-pressed": tool === id, title: `${copy.tools[id].hint} (${index + 1})`, onClick: () => selectTool(id), children: [_jsx(ToolIcon, { tool: id }), _jsx("span", { children: copy.tools[id].label }), _jsx("kbd", { "aria-hidden": "true", children: index + 1 })] }, id)) }), _jsx("button", { className: "material-ripple", type: "button", disabled: !ready || paused, onClick: () => actions.current.ripple(), children: copy.tools.ripple })] }), _jsx("p", { className: "material-brush-hint", children: paused ? "Motion is paused. Resume to use a brush." : copy.tools[tool].hint }), _jsxs("div", { className: "material-sample-footer", children: [_jsxs("span", { children: [_jsx("i", { "aria-hidden": "true" }), copy.legend] }), metrics.ionCount > 0 && _jsx("span", { className: "material-ion-key", children: environment.charged ? _jsxs(_Fragment, { children: [_jsx("b", { className: "ion-positive", children: "+" }), _jsx("b", { className: "ion-negative", children: "-" }), copy.fields.ionKey] }) : _jsxs(_Fragment, { children: [_jsx("b", { className: "ion-neutral", children: "0" }), copy.fields.neutralKey] }) }), _jsx("span", { title: "The frame limit adapts to rendering cost. Simulation sleeps off screen.", children: ready ? `${frameLimit} fps limit · auto` : copy.dragHint })] })] }), _jsxs("div", { className: "material-control-footer", children: [_jsxs("div", { className: "material-order", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: `${instanceId}-order`, children: copy.orderLabel }), _jsxs("output", { children: [Math.round(metrics.order * 100), "%"] })] }), _jsx("progress", { id: `${instanceId}-order`, max: 1, value: metrics.order }), _jsx("p", { children: copy.orderHint })] }), _jsxs("dl", { className: "material-stats", children: [_jsxs("div", { children: [_jsx("dt", { children: copy.motionLabel }), _jsxs("dd", { children: [metrics.motion.toFixed(1), " ", _jsx("span", { children: "px/s" })] })] }), _jsxs("div", { children: [_jsx("dt", { children: copy.latticeLabel }), _jsx("dd", { children: selectedMode === "solid" ? `${metrics.latticeError.toFixed(1)} px` : "Free" })] }), _jsxs("div", { children: [_jsx("dt", { children: copy.directorLabel }), _jsx("dd", { children: metrics.order > 0.15 ? `${Math.round(metrics.director)}°` : "Unordered" })] })] }), _jsxs("button", { type: "button", className: "material-reset", disabled: !ready, onClick: () => actions.current.reset(), children: [_jsx("svg", { viewBox: "0 0 20 20", "aria-hidden": "true", children: _jsx("path", { d: "M3.5 8a6.5 6.5 0 1 1 .7 6M3.5 3v5h5" }) }), copy.reset] })] }), _jsxs("aside", { className: "material-controls", "aria-labelledby": `${instanceId}-controls-title`, children: [_jsxs("div", { className: "material-control-header", children: [_jsx("h2", { id: `${instanceId}-controls-title`, children: copy.controlsTitle }), _jsx("div", { className: "material-start-label", children: _jsx("span", { children: copy.startingState }) }), _jsx("div", { className: "material-presets", "aria-label": copy.startingState, children: copy.presets.map(preset => _jsx("button", { type: "button", disabled: !ready, "aria-pressed": selectedMode === preset.id, title: copy.changeStructure, onClick: () => { setSelectedMode(preset.id); actions.current.mode(preset.id); }, children: preset.label }, preset.id)) }), _jsx("p", { className: "material-preset-help", children: copy.presetHint })] }), _jsxs("div", { className: "material-control-panel", id: `${instanceId}-all-controls`, "aria-label": "Material, fields and particle controls", children: [_jsxs("div", { className: "material-control-column material-column-material", children: [_jsxs("fieldset", { className: "material-field-group material-base-group", children: [_jsx("legend", { children: copy.materialTitle }), _jsx("p", { className: "material-mode-note", children: copy.modeHints[selectedMode] }), _jsx("div", { className: "material-sliders", children: copy.parameters.map(parameter => _jsx(MaterialRange, { parameter: parameter, params: params, disabled: !ready, modeDisabled: parameter.id === "alignment" && selectedMode === "liquid", onChange: (key, value) => update({ ...params, [key]: value }) }, parameter.id)) })] }), _jsxs("fieldset", { className: "material-field-group", children: [_jsx("legend", { children: copy.shapeTitle }), _jsx("div", { className: "material-sliders", children: copy.extraParameters.map(parameter => _jsx(MaterialRange, { parameter: parameter, params: params, disabled: !ready, modeDisabled: parameter.id === "stiffness" && selectedMode !== "solid", onChange: (key, value) => update({ ...params, [key]: value }) }, parameter.id)) })] })] }), _jsxs("div", { className: "material-control-column material-column-fields", children: [_jsxs("fieldset", { className: "material-field-group", children: [_jsx("legend", { children: copy.fields.electricTitle }), _jsx(EnvironmentRange, { name: "electric", label: copy.fields.electricStrength, value: environment.electric, disabled: !ready, onChange: value => updateEnvironment({ ...environment, electric: value }) }), _jsx(EnvironmentRange, { name: "electricAngle", label: copy.fields.electricAngle, value: environment.electricAngle, max: 360, degrees: true, disabled: !ready, hint: copy.fields.angleHint, onChange: value => updateEnvironment({ ...environment, electricAngle: value }) }), _jsx(EnvironmentRange, { name: "electricResponse", label: copy.fields.electricResponse, hint: copy.fields.responseHint, value: environment.electricResponse, min: -100, disabled: !ready, onChange: value => updateEnvironment({ ...environment, electricResponse: value }) }), _jsx("p", { className: "material-field-note", children: copy.fields.electricHint })] }), _jsxs("fieldset", { className: "material-field-group", children: [_jsx("legend", { children: copy.fields.magneticTitle }), _jsx(EnvironmentRange, { name: "magnetic", label: copy.fields.magneticStrength, value: environment.magnetic, disabled: !ready, onChange: value => updateEnvironment({ ...environment, magnetic: value }) }), _jsx("label", { className: "material-plane-label", htmlFor: `${instanceId}-magnetic-plane`, children: copy.fields.planeLabel }), _jsx("select", { id: `${instanceId}-magnetic-plane`, value: environment.magneticPlane, disabled: !ready, onChange: event => updateEnvironment({ ...environment, magneticPlane: event.target.value }), children: copy.fields.planes.map(plane => _jsx("option", { value: plane.value, children: plane.label }, plane.value)) }), _jsx(EnvironmentRange, { name: "magneticAngle", label: copy.fields.magneticAngle, value: environment.magneticAngle, max: 180, degrees: true, disabled: !ready || environment.magneticPlane !== "in-plane", onChange: value => updateEnvironment({ ...environment, magneticAngle: value }) }), _jsx(EnvironmentRange, { name: "magneticResponse", label: copy.fields.magneticResponse, hint: copy.fields.responseHint, value: environment.magneticResponse, min: -100, disabled: !ready || environment.magneticPlane !== "in-plane", onChange: value => updateEnvironment({ ...environment, magneticResponse: value }) }), _jsx("p", { className: "material-field-note", children: environment.magneticPlane === "in-plane" ? copy.fields.inPlaneHint : copy.fields.throughPlaneHint })] }), _jsxs("div", { className: "material-field-actions", children: [_jsx("button", { type: "button", disabled: !ready, onClick: () => updateEnvironment({ ...environment, electric: 0.7, electricAngle: 0, magnetic: 0.55, magneticPlane: "out", ions: 0.5, charged: true }), children: copy.fields.demoLabel }), _jsx("button", { type: "button", disabled: !ready, onClick: () => updateEnvironment({ ...environment, electric: 0, magnetic: 0 }), children: copy.fields.clearLabel })] })] }), _jsxs("div", { className: "material-control-column material-column-particles", children: [_jsxs("fieldset", { className: "material-field-group", children: [_jsx("legend", { children: copy.fields.ionsTitle }), _jsx(EnvironmentRange, { name: "ions", label: copy.fields.amountLabel, value: environment.ions, disabled: !ready, onChange: value => updateEnvironment({ ...environment, ions: value }) }), _jsxs("label", { className: "material-charge-switch", children: [_jsxs("span", { children: [copy.fields.chargeLabel, _jsx("small", { children: environment.charged ? copy.fields.chargedLabel : copy.fields.neutralLabel })] }), _jsx("input", { type: "checkbox", role: "switch", checked: environment.charged, disabled: !ready, "aria-label": copy.fields.chargeLabel, onChange: event => updateEnvironment({ ...environment, charged: event.target.checked }) })] }), _jsx("p", { className: "material-field-note", children: environment.charged ? copy.fields.chargedHint : copy.fields.neutralHint }), _jsx("p", { className: "material-ion-count", children: environment.charged ? `${metrics.ionCount / 2} positive / ${metrics.ionCount / 2} negative` : `${metrics.ionCount} neutral tracers` }), _jsx(EnvironmentRange, { name: "chargeStrength", label: copy.fields.chargeStrength, value: environment.chargeStrength, min: 10, max: 200, disabled: !ready || !environment.charged, hint: copy.fields.chargeHint, onChange: value => updateEnvironment({ ...environment, chargeStrength: value }) }), _jsx(EnvironmentRange, { name: "ionMobility", label: copy.fields.ionMobility, value: environment.ionMobility, disabled: !ready, hint: copy.fields.mobilityHint, onChange: value => updateEnvironment({ ...environment, ionMobility: value }) }), _jsx(EnvironmentRange, { name: "screening", label: copy.fields.screening, value: environment.screening, disabled: !ready || !environment.charged, hint: copy.fields.screeningHint, onChange: value => updateEnvironment({ ...environment, screening: value }) })] }), _jsxs("fieldset", { className: "material-field-group", children: [_jsx("legend", { children: copy.display.title }), _jsx("div", { className: "material-detail-options", children: ["mesh", "directors", "trails", "detail", "wakes", "polarized"].map(key => _jsxs("label", { children: [_jsx("input", { type: "checkbox", id: `${instanceId}-display-${key}`, checked: display[key], disabled: !ready, onChange: event => updateDisplay({ ...display, [key]: event.target.checked }) }), copy.display[key]] }, key)) }), display.polarized && _jsx("p", { className: "material-field-note", children: copy.display.polarizedHint })] })] })] })] }), _jsxs("fieldset", { className: "material-field-group material-discoveries", children: [_jsxs("legend", { children: [copy.discoveries.title, " ", _jsxs("span", { children: [discoveries.length, "/", copy.discoveries.items.length] })] }), _jsx("p", { className: "material-field-note", children: discoveryKey ? copy.discoveries.saved : "Discoveries last until you reload this page." }), _jsx("ol", { children: copy.discoveries.items.map((item, index) => _jsxs("li", { "data-complete": discoveries.includes(item.id), children: [_jsx("span", { className: "material-discovery-mark", "aria-label": discoveries.includes(item.id) ? "Discovered" : "To discover", children: discoveries.includes(item.id) ? _jsx("svg", { viewBox: "0 0 20 20", "aria-hidden": "true", children: _jsx("path", { d: "m4 10 4 4 8-8" }) }) : String(index + 1).padStart(2, "0") }), _jsxs("div", { children: [_jsx("strong", { children: item.title }), _jsx("p", { children: item.hint })] })] }, item.id)) }), _jsx("p", { className: "material-keyboard-hint", children: copy.tools.keyboard })] })] }), _jsx("p", { className: "material-announcement", role: "status", "aria-live": "polite", children: announcement }), _jsx("p", { className: "material-model-note", children: copy.modelNote })] });
}
