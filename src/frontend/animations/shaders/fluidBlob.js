// Glossy white-grey liquid blob, in the look of the intro video: spheres melted together
// with a smooth union, raymarched, lit with a soft key light, two sharp highlights and a
// fresnel rim. The background stays transparent so the page colour shows through.
export const MAX_BALLS = 8;

export const FLUID_VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const FLUID_FRAGMENT_SHADER = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec4 uBalls[${MAX_BALLS}];
uniform float uCount;
uniform float uMelt;

float smoothUnion(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float field(vec3 p) {
  float d = 100.0;
  for (int i = 0; i < ${MAX_BALLS}; i++) {
    if (float(i) >= uCount) break;
    vec4 ball = uBalls[i];
    d = smoothUnion(d, length(p - ball.xyz) - ball.w, uMelt);
  }
  // A slow ripple over the surface so it never looks rigid
  d += 0.012 * sin(p.x * 7.0 + uTime * 1.3) * sin(p.y * 6.0 - uTime) * sin(p.z * 5.0 + uTime * 0.7);
  return d;
}

vec3 surfaceNormal(vec3 p) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    field(p + e.xyy) - field(p - e.xyy),
    field(p + e.yxy) - field(p - e.yxy),
    field(p + e.yyx) - field(p - e.yyx)
  ));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
  vec3 origin = vec3(0.0, 0.0, 3.2);
  vec3 ray = normalize(vec3(uv, -2.2));

  float travelled = 0.0;
  bool hit = false;
  for (int i = 0; i < 80; i++) {
    float d = field(origin + ray * travelled);
    if (d < 0.001) {
      hit = true;
      break;
    }
    travelled += d;
    if (travelled > 6.0) break;
  }
  if (!hit) {
    gl_FragColor = vec4(0.0);
    return;
  }

  vec3 p = origin + ray * travelled;
  vec3 n = surfaceNormal(p);
  vec3 view = -ray;
  vec3 key = normalize(vec3(-0.5, 0.8, 0.6));
  vec3 fill = normalize(vec3(0.7, -0.2, 0.5));
  float facing = max(dot(n, view), 0.0);
  float fresnel = pow(1.0 - facing, 3.0);

  // One soft white-grey for every piece, so they sit quietly on the navy header
  vec3 colour = vec3(0.8, 0.8, 0.85) * (0.55 + 0.45 * dot(n, key));
  // Reflected surroundings: the navy page below, soft light above
  vec3 reflected = reflect(-view, n);
  vec3 surroundings = mix(vec3(0.05, 0.0, 0.18), vec3(1.0), smoothstep(-0.2, 0.9, reflected.y));
  colour = mix(colour, surroundings, fresnel * 0.6);
  colour += pow(max(dot(reflect(-key, n), view), 0.0), 60.0) * 1.1;
  colour += pow(max(dot(reflect(-fill, n), view), 0.0), 24.0) * 0.35;

  gl_FragColor = vec4(colour, 1.0);
}
`;
