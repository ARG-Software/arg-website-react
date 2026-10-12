// Shaders for the hero water ripple (useWaterRipple).

export const WATER_VERTEX_SHADER = /* glsl */ `
  varying vec2 v_uv;
  void main() {
    v_uv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Height-field wave simulation; the pointer adds an impulse.
export const WATER_SIMULATION_SHADER = /* glsl */ `
  precision highp float;
  uniform sampler2D u_prev;
  uniform vec2      u_res;
  uniform vec2      u_mouse;
  uniform float     u_radius;
  uniform float     u_strength;
  uniform int       u_addImpulse;
  varying vec2 v_uv;

  void main() {
    vec2 texel = 1.0 / u_res;
    float center = texture2D(u_prev, v_uv).r;
    float left   = texture2D(u_prev, v_uv + vec2(-texel.x, 0.0)).r;
    float right  = texture2D(u_prev, v_uv + vec2( texel.x, 0.0)).r;
    float up     = texture2D(u_prev, v_uv + vec2(0.0,  texel.y)).r;
    float down   = texture2D(u_prev, v_uv + vec2(0.0, -texel.y)).r;
    float old    = texture2D(u_prev, v_uv).g;

    float damping = 0.96;
    float next = ((left + right + up + down) / 2.0 - old) * damping;

    if (u_addImpulse == 1) {
      float dist = length(v_uv - u_mouse);
      next += u_strength * smoothstep(u_radius, 0.0, dist);
    }
    // r = new height, g = current height (becomes old next frame)
    gl_FragColor = vec4(next, center, 0.0, 1.0);
  }
`;

// Final image: the video refracted through the water, plus a specular highlight.
export const WATER_DISPLAY_SHADER = /* glsl */ `
  precision highp float;
  uniform sampler2D u_heightMap;
  uniform sampler2D u_video;
  uniform vec2      u_res;
  uniform vec3      u_baseColor;
  uniform float     u_refractionScale;
  uniform float     u_videoOpacity;
  uniform vec2      u_coverScale;
  uniform vec2      u_coverOffset;
  varying vec2 v_uv;

  void main() {
    vec2 texel = 1.0 / u_res;
    float hL = texture2D(u_heightMap, v_uv + vec2(-texel.x, 0.0)).r;
    float hR = texture2D(u_heightMap, v_uv + vec2( texel.x, 0.0)).r;
    float hD = texture2D(u_heightMap, v_uv + vec2(0.0, -texel.y)).r;
    float hU = texture2D(u_heightMap, v_uv + vec2(0.0,  texel.y)).r;

    vec2 normal = vec2(hL - hR, hD - hU);
    float height = texture2D(u_heightMap, v_uv).r;

    // Apply object-fit:cover transform then displace by water normals
    vec2 coverUV = v_uv * u_coverScale + u_coverOffset;
    vec2 distortedUV = clamp(coverUV + normal * u_refractionScale, 0.0, 1.0);

    vec3 videoColor = texture2D(u_video, distortedUV).rgb;
    vec3 color = mix(u_baseColor, videoColor, u_videoOpacity);

    float spec = pow(max(0.0, dot(normalize(vec3(normal, 0.8)),
                                  normalize(vec3(0.3, 0.5, 1.0)))), 24.0);
    color += spec * vec3(0.18, 0.12, 0.35) * 0.25;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Water normals as colours, for the SVG filter that bends the hero heading.
export const WATER_NORMAL_SHADER = /* glsl */ `
  precision highp float;
  uniform sampler2D u_heightMap;
  uniform vec2      u_res;
  varying vec2 v_uv;

  void main() {
    vec2 texel = 1.0 / u_res;
    float hL = texture2D(u_heightMap, v_uv + vec2(-texel.x, 0.0)).r;
    float hR = texture2D(u_heightMap, v_uv + vec2( texel.x, 0.0)).r;
    float hD = texture2D(u_heightMap, v_uv + vec2(0.0, -texel.y)).r;
    float hU = texture2D(u_heightMap, v_uv + vec2(0.0,  texel.y)).r;
    vec2 normal = vec2(hL - hR, hD - hU);
    // Map normals to 0–1: 0.5 = neutral (no displacement)
    gl_FragColor = vec4(clamp(normal.x * 1.5 + 0.5, 0.0, 1.0),
                        clamp(normal.y * 1.5 + 0.5, 0.0, 1.0),
                        0.5, 1.0);
  }
`;
