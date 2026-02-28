import Phaser from 'phaser';

// Fragment shader for CRT (old TV/monitor) effect
// This is a POST-PROCESSING shader - it runs on the entire rendered frame
const fragShader = `
precision mediump float;

// === UNIFORMS ===
uniform float uTime;            // Time for animations
uniform vec2 uResolution;       // Screen size in pixels (800, 600)
uniform sampler2D uMainSampler; // The rendered game frame as a texture

varying vec2 outTexCoord;       // UV coordinates (0-1 range)

// === SCREEN CURVATURE FUNCTION ===
// Simulates the curved glass of old CRT monitors
vec2 curve(vec2 uv) {
  // Convert UV from 0-1 range to -1 to +1 range (center becomes 0,0)
  uv = (uv - 0.5) * 2.0;

  // Scale up slightly (1.1x) so edges get pushed out more
  uv *= 1.1;

  // Apply barrel distortion:
  // The further from center (higher abs(uv.y)), the more we stretch X
  // pow(..., 2.0) makes it exponential - subtle near center, strong at edges
  uv.x *= 1.0 + pow(abs(uv.y) / 5.0, 2.0);
  uv.y *= 1.0 + pow(abs(uv.x) / 4.0, 2.0);

  // Convert back to 0-1 range
  uv = (uv / 2.0) + 0.5;
  return uv;
}

void main() {
  // Apply screen curvature to UV coordinates
  vec2 uv = curve(outTexCoord);

  // === OUT OF BOUNDS CHECK ===
  // After curving, some UVs will be outside 0-1 range (the corners)
  // Draw these as black (the bezel/frame of the CRT)
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);  // Black, fully opaque
    return;  // Exit early, skip the rest
  }

  // === CHROMATIC ABERRATION ===
  // Old CRTs had imperfect color alignment - RGB channels slightly offset
  // We sample R, G, B from slightly different positions
  float aberration = 0.003;  // How far apart the channels are

  // Red channel: sample slightly to the RIGHT
  float r = texture2D(uMainSampler, vec2(uv.x + aberration, uv.y)).r;

  // Green channel: sample from exact position (our "anchor")
  float g = texture2D(uMainSampler, uv).g;

  // Blue channel: sample slightly to the LEFT
  float b = texture2D(uMainSampler, vec2(uv.x - aberration, uv.y)).b;

  // Combine into final color
  vec3 color = vec3(r, g, b);

  // === SCANLINES ===
  // CRT monitors drew images line by line, creating visible horizontal lines
  // sin() creates a wave pattern based on vertical position
  // uResolution.y * 1.5 = number of scanlines (more = thinner lines)
  // * 0.08 = intensity (how dark the lines are)
  float scanline = sin(uv.y * uResolution.y * 1.5) * 0.08;
  color -= scanline;  // Subtract to darken at wave peaks

  // === HORIZONTAL SYNC WOBBLE ===
  // Simulates slight timing instability in old CRTs
  // Creates subtle horizontal shimmer that varies over time
  float wobble = sin(uTime * 2.0 + uv.y * 20.0) * 0.001;
  color *= 1.0 + wobble;  // Multiply for subtle brightness variation

  // === VIGNETTE ===
  // Darkens the edges/corners of the screen
  // uv.x * (1-uv.x) is 0 at edges, max at center (parabola)
  // Multiply X and Y parabolas together = dark corners
  float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);

  // Scale up (16x) and apply power curve for softer falloff
  // clamp() keeps value between 0 and 1
  vignette = clamp(pow(16.0 * vignette, 0.3), 0.0, 1.0);
  color *= vignette;  // Multiply to darken edges

  // === DESATURATION ===
  // Mute the colors slightly for a more retro feel
  // dot() with these weights converts RGB to perceived brightness (luminance)
  // These weights (0.299, 0.587, 0.114) are standard for human eye perception
  float gray = dot(color, vec3(0.299, 0.587, 0.114));

  // mix() blends between color and gray
  // 0.3 = 30% gray, 70% original color
  color = mix(color, vec3(gray), 0.3);

  // === COLOR TINT ===
  // Multiply by slightly reduced G and B for warm (yellowish) tint
  // vec3(1.0, 0.95, 0.9) = full red, 95% green, 90% blue
  color *= vec3(1.0, 0.95, 0.9);

  // === BRIGHTNESS ===
  // Boost overall brightness to compensate for darkening effects
  color *= 1.2;

  // === OUTPUT ===
  gl_FragColor = vec4(color, 1.0);  // RGB color, fully opaque
}
`;

// === PHASER PIPELINE CLASS ===
// PostFXPipeline is for full-screen effects applied to a camera
export default class CRTPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      fragShader
    });
  }

  // Called automatically before each frame renders
  // This is where we update our uniform values
  onPreRender() {
    // set1f = set 1 float value
    // Convert milliseconds to seconds for smoother math
    this.set1f('uTime', this.game.loop.time / 1000);

    // set2f = set 2 float values (a vec2)
    this.set2f('uResolution', this.game.config.width, this.game.config.height);
  }
}
