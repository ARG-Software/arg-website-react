import { useEffect, useRef } from 'react';
import {
  FLUID_FRAGMENT_SHADER,
  FLUID_VERTEX_SHADER,
  MAX_BALLS,
} from '../../animations/shaders/fluidBlob';
import { prefersReducedMotion } from '@utils/helpers';

const STILL_FRAME_SECONDS = 3;
// The white-grey of the pieces on the navy headers
const DEFAULT_COLOUR = [0.8, 0.8, 0.85];
// The camera sits 3.2 units back with a focal length of 2.2, so one unit of screen space
// (half the shorter canvas side) covers this much of the plane the blob floats on.
const SCREEN_TO_WORLD = 3.2 / 2.2;
const REACH_RANGE = 4;
// The ball a `cursor` canvas grows under the pointer anywhere over the section: its radius,
// how fast it swells, how slowly it melts away after the pointer leaves, and how closely it
// trails the pointer, all in seconds
const CURSOR_RADIUS = 0.12;
const CURSOR_GONE = -0.28;
const CURSOR_GROW_SECONDS = 0.15;
const CURSOR_SHRINK_SECONDS = 3.5;
const CURSOR_FOLLOW_SECONDS = 0.15;
// With a matcap, the camera drifts this far towards the pointer, in world units, taking this
// long to catch up, so the view tilts gently as the pointer moves
const TILT = 0.5;
const TILT_SECONDS = 0.6;
// Seconds the reach takes to catch up with the pointer, and to grow or fade
const FOLLOW_SECONDS = 1.6;
const FOLLOW_DAMPING = 0.65;
const FADE_SECONDS = 1.1;
// Frame gaps longer than this (a hidden tab, a resize) are treated as one normal frame
const MAX_STEP_SECONDS = 1 / 20;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

/**
 * Decorative liquid blob drawn with WebGL. `balls(seconds, view, transition)` returns the
 * spheres that melt together, as [x, y, z, radius] in a view about 2.9 units across its shorter
 * side (`view` gives its half width and half height; `transition` is −1 to 1 through the
 * section when `scrollParallax` is on); `melt` sets how strongly they flow into each other,
 * `colour` is the liquid's base colour as [r, g, b] from 0 to 1, `matcap` (an image of a lit
 * sphere) lights it in a soft studio look through a long lens that tilts towards the pointer,
 * and `cursor` grows a ball under the pointer that pulls pieces out of it, instead of reaching
 * for it. `maxPixelRatio` caps the resolution for canvases that cover a whole section. The blob
 * leans towards the pointer and stretches a drop out to meet it; that only moves the spheres
 * already sent each frame, so it adds no rendering work. The loop only runs while the canvas
 * is on screen; reduced motion gets one still frame.
 */
export function FluidCanvas({
  balls,
  melt = 0.35,
  colour = DEFAULT_COLOUR,
  matcap = null,
  cursor = false,
  scrollParallax = false,
  maxPixelRatio = 2,
  className = '',
}) {
  const canvasRef = useRef(null);
  const matcapRef = useRef(matcap);
  matcapRef.current = matcap;
  const applyMatcapRef = useRef(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: true });
    if (!gl) return undefined;

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, FLUID_VERTEX_SHADER));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FLUID_FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
    gl.useProgram(program);

    // One triangle that covers the whole canvas
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = name => gl.getUniformLocation(program, name);
    gl.uniform1f(uniform('uMelt'), melt);
    gl.uniform3fv(uniform('uColour'), colour);
    gl.uniform1f(uniform('uMatte'), 0);
    gl.uniform2f(uniform('uCamera'), 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255])
    );
    const applyMatcap = image => {
      gl.uniform1f(uniform('uMatte'), image ? 1 : 0);
      if (!image) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Upright, so the top of the picture lights the top of the body
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    };
    applyMatcap(matcapRef.current);
    const cameraUniform = uniform('uCamera');
    const resolution = uniform('uResolution');
    const time = uniform('uTime');
    const ballsUniform = uniform('uBalls');
    const count = uniform('uCount');
    const packed = new Float32Array(MAX_BALLS * 4);
    // Pointer target in world units, and the eased point and strength that follow it
    // Also the pointer across the area from -1 to 1, and the eased camera that drifts after it
    const pointer = { x: 0, y: 0, active: false, across: 0, rise: 0 };
    const camera = { x: 0, y: 0 };
    const reach = { x: 0, y: 0, vx: 0, vy: 0, strength: 0 };
    // The piece that follows the pointer, and the half extents of the view in world units
    const cursorBall = { x: 0, y: 0, radius: 0, over: false, leaving: 0, leaveFrom: 0 };
    const view = { halfWidth: SCREEN_TO_WORLD, halfHeight: SCREEN_TO_WORLD };
    let lastSeconds = 0;
    const reducedMotion = prefersReducedMotion();
    const slot = canvas.closest('.sticky-reveal') ?? canvas.parentElement;

    const withPointer = (spheres, seconds) => {
      const dt = Math.min(Math.max(seconds - lastSeconds, 0), MAX_STEP_SECONDS);
      lastSeconds = seconds;
      // An underdamped spring: the reach trails the pointer, overshoots a little and settles,
      // the way a liquid neck would, and moves the same on any refresh rate
      const omega = 2 / FOLLOW_SECONDS;
      for (const [axis, velocity] of [
        ['x', 'vx'],
        ['y', 'vy'],
      ]) {
        const offset = reach[axis] - pointer[axis];
        reach[velocity] +=
          (-omega * omega * offset - 2 * FOLLOW_DAMPING * omega * reach[velocity]) * dt;
        reach[axis] += reach[velocity] * dt;
      }
      const fade = 1 - Math.exp(-dt / FADE_SECONDS);
      reach.strength += ((pointer.active ? 1 : 0) - reach.strength) * fade;
      if (reach.strength < 0.001) return spheres;

      const centreX = spheres.reduce((sum, sphere) => sum + sphere[0], 0) / spheres.length;
      const centreY = spheres.reduce((sum, sphere) => sum + sphere[1], 0) / spheres.length;
      const dx = reach.x - centreX;
      const dy = reach.y - centreY;
      const distance = Math.hypot(dx, dy) || 1;
      const pull = reach.strength * Math.max(0, 1 - distance / REACH_RANGE);
      const nx = dx / distance;
      const ny = dy / distance;
      const leaned = spheres.map(([x, y, z, radius]) => [
        x + nx * 0.18 * pull,
        y + ny * 0.18 * pull,
        z,
        radius,
      ]);
      // Two spheres out from the centre melt into a neck that stretches towards the pointer;
      // the neck shortens as the pull weakens, so the tip never breaks off
      const reachLength = Math.min(distance, 1.15) * (0.4 + 0.6 * pull) * reach.strength;
      if (leaned.length + 2 > MAX_BALLS) return leaned;
      // The radii start below zero so a faint reach adds nothing to the melted surface,
      // instead of a small bump that pops away when it is dropped
      leaned.push([
        centreX + nx * reachLength * 0.55,
        centreY + ny * reachLength * 0.55,
        0.15,
        -0.3 + 0.52 * reach.strength,
      ]);
      leaned.push([
        centreX + nx * reachLength,
        centreY + ny * reachLength,
        0.2,
        -0.3 + 0.47 * reach.strength,
      ]);
      return leaned;
    };

    const paint = seconds => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, seconds);
      view.halfWidth = (canvas.width / Math.min(canvas.width, canvas.height)) * SCREEN_TO_WORLD;
      view.halfHeight = (canvas.height / Math.min(canvas.width, canvas.height)) * SCREEN_TO_WORLD;
      let transition = 0;
      if (scrollParallax && !reducedMotion) {
        const rect = slot.getBoundingClientRect();
        const span = window.innerHeight + rect.height;
        if (span > 0) transition = ((window.innerHeight - rect.top) / span) * 2 - 1;
      }
      const shape = balls(seconds, view, transition);
      let spheres;
      if (cursor) {
        const dt = Math.min(Math.max(seconds - lastSeconds, 0), MAX_STEP_SECONDS);
        lastSeconds = seconds;
        // Over the liquid a ball grows under the pointer; once it leaves the body the ball
        // still follows the pointer but shrinks away over a few seconds. The section covers
        // the screen, so this cannot wait for pointerleave.
        const near = shape.some(([x, y, , radius]) => {
          if (radius <= 0) return false;
          const distance = Math.hypot(pointer.x - x, pointer.y - y);
          return distance < radius * (cursorBall.over ? 1.35 : 0.95);
        });
        cursorBall.over = pointer.active && near;
        if (cursorBall.radius < CURSOR_GONE + 0.02) {
          cursorBall.x = pointer.x;
          cursorBall.y = pointer.y;
        }
        if (cursorBall.over) {
          cursorBall.leaving = 0;
          cursorBall.radius +=
            (CURSOR_RADIUS - cursorBall.radius) * (1 - Math.exp(-dt / CURSOR_GROW_SECONDS));
        } else if (cursorBall.radius > CURSOR_GONE) {
          if (cursorBall.leaving === 0) cursorBall.leaveFrom = cursorBall.radius;
          cursorBall.leaving += dt;
          const t = Math.min(1, cursorBall.leaving / CURSOR_SHRINK_SECONDS);
          cursorBall.radius = cursorBall.leaveFrom + (CURSOR_GONE - cursorBall.leaveFrom) * t * t;
        }
        const follow = 1 - Math.exp(-dt / CURSOR_FOLLOW_SECONDS);
        cursorBall.x += (pointer.x - cursorBall.x) * follow;
        cursorBall.y += (pointer.y - cursorBall.y) * follow;
        const tilt = 1 - Math.exp(-dt / TILT_SECONDS);
        camera.x += ((pointer.active ? pointer.across : 0) * TILT - camera.x) * tilt;
        camera.y += ((pointer.active ? pointer.rise : 0) * TILT - camera.y) * tilt;
        gl.uniform2f(cameraUniform, camera.x, camera.y);
        spheres = shape.slice(0, MAX_BALLS - 1);
        // Even a point pulls a bump out of a melted surface, so a spent piece is dropped
        if (cursorBall.radius > CURSOR_GONE) {
          spheres.push([cursorBall.x, cursorBall.y, 0, cursorBall.radius]);
        }
      } else {
        spheres = withPointer(shape, seconds).slice(0, MAX_BALLS);
      }
      spheres.forEach((sphere, i) => packed.set(sphere, i * 4));
      gl.uniform4fv(ballsUniform, packed);
      gl.uniform1f(count, spheres.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let frame = 0;
    let start = 0;
    let visible = false;
    applyMatcapRef.current = image => {
      applyMatcap(image);
      paint(start ? (performance.now() - start) / 1000 : STILL_FRAME_SECONDS);
    };

    const step = now => {
      if (!start) start = now;
      paint((now - start) / 1000);
      frame = requestAnimationFrame(step);
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      if (reducedMotion) paint(STILL_FRAME_SECONDS);
      else if (visible && !document.hidden) frame = requestAnimationFrame(step);
    };

    // Listen on the whole header or section, since the text sits above the canvas
    const area = canvas.closest('header') ?? canvas.parentElement;
    const onPointerMove = event => {
      const rect = canvas.getBoundingClientRect();
      const unit = Math.min(rect.width, rect.height) / 2;
      pointer.x = ((event.clientX - rect.left - rect.width / 2) / unit) * SCREEN_TO_WORLD;
      pointer.y = ((rect.height / 2 - (event.clientY - rect.top)) / unit) * SCREEN_TO_WORLD;
      pointer.across = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.rise = 1 - ((event.clientY - rect.top) / rect.height) * 2;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    area.addEventListener('pointermove', onPointerMove, { passive: true });
    area.addEventListener('pointerleave', onPointerLeave);

    const resize = new ResizeObserver(([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
      canvas.width = Math.round(entry.contentRect.width * dpr);
      canvas.height = Math.round(entry.contentRect.height * dpr);
      paint(start ? (performance.now() - start) / 1000 : STILL_FRAME_SECONDS);
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    resize.observe(canvas);
    intersection.observe(canvas);
    document.addEventListener('visibilitychange', sync);

    return () => {
      applyMatcapRef.current = () => {};
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', sync);
      area.removeEventListener('pointermove', onPointerMove);
      area.removeEventListener('pointerleave', onPointerLeave);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [balls, melt, colour, cursor, scrollParallax, maxPixelRatio]);

  useEffect(() => {
    applyMatcapRef.current(matcap);
  }, [matcap]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
