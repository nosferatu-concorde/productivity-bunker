import Phaser from 'phaser';

const DEFAULT_GLITCH_INTENSITY = 0.7;
const GLITCH_TICKS_PER_SECOND = 2.0;
const GLITCH_PROBABILITY_SCALAR = 0.15;

// Fullscreen glitch post-processing shader
const fragShader = `
precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uMainSampler;
uniform float uGlitchIntensity;
uniform float uGlitchFlag;      // 1.0 when glitching, 0.0 otherwise (computed in JS)
uniform float uGlitchSeed;      // Seed to decorrelate patterns per glitch burst

varying vec2 outTexCoord;

// Pseudo-random function
float random(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
}

// Seeded variant so CPU + GPU share the same glitch timing/state
float seededRandom(vec2 st) {
  return random(st + vec2(uGlitchSeed));
}

void main() {
  vec2 uv = outTexCoord;

  // === GLITCH TIMING ===
  float glitchTime = floor(uTime * 2.0);  // Slower: changes 2 times per second
  bool isGlitching = (uGlitchFlag > 0.5);

  // === SCREEN TEAR / JUMP ===
  // Occasionally shift the whole screen vertically
  if (isGlitching && seededRandom(vec2(glitchTime, 5.0)) > 0.7) {
    float jumpAmount = (seededRandom(vec2(glitchTime, 6.0)) - 0.5) * 0.05 * uGlitchIntensity;
    uv.y = fract(uv.y + jumpAmount);
  }

  // === HORIZONTAL LINE DISPLACEMENT ===
  if (isGlitching) {
    float lineNoise = seededRandom(vec2(floor(uv.y * 50.0), glitchTime));
    if (lineNoise > 0.8) {
      uv.x += (seededRandom(vec2(glitchTime, floor(uv.y * 80.0))) - 0.5) * 0.1 * uGlitchIntensity;
    }
  }

  // === BLOCK DISPLACEMENT ===
  if (isGlitching) {
    vec2 blockCoord = floor(uv * vec2(10.0, 8.0));
    float blockNoise = seededRandom(blockCoord + glitchTime);
    if (blockNoise > 0.9) {
      uv.x += (seededRandom(blockCoord + glitchTime * 2.0) - 0.5) * 0.15 * uGlitchIntensity;
      uv.y += (seededRandom(blockCoord + glitchTime * 3.0) - 0.5) * 0.08 * uGlitchIntensity;
    }
  }

  // Clamp UV to valid range
  uv = clamp(uv, 0.0, 1.0);

  // === RGB SPLIT ===
  vec4 color;
  if (isGlitching && seededRandom(vec2(glitchTime, 1.0)) > 0.4) {
    float rgbShift = 0.015 * uGlitchIntensity * (0.5 + seededRandom(vec2(glitchTime, 2.0)));

    // Randomly choose split direction
    float angle = seededRandom(vec2(glitchTime, 7.0)) * 3.14159 * 2.0;
    vec2 offset = vec2(cos(angle), sin(angle)) * rgbShift;

    color.r = texture2D(uMainSampler, clamp(uv + offset, 0.0, 1.0)).r;
    color.g = texture2D(uMainSampler, uv).g;
    color.b = texture2D(uMainSampler, clamp(uv - offset, 0.0, 1.0)).b;
    color.a = texture2D(uMainSampler, uv).a;
  } else {
    color = texture2D(uMainSampler, uv);
  }

  // === SCANLINE NOISE ===
  if (isGlitching) {
    float scanline = seededRandom(vec2(floor(uv.y * 200.0), glitchTime));
    if (scanline > 0.97) {
      float noiseVal = seededRandom(vec2(glitchTime + uv.x * 100.0, uv.y));
      color.rgb = mix(color.rgb, vec3(noiseVal), 0.8 * uGlitchIntensity);
    }
  }

  // === COLOR CORRUPTION ===
  if (isGlitching && seededRandom(vec2(glitchTime, 8.0)) > 0.85) {
    vec2 corruptBlock = floor(uv * 6.0);
    if (seededRandom(corruptBlock + glitchTime) > 0.9) {
      // Swap or corrupt color channels
      float swapType = seededRandom(corruptBlock + glitchTime * 4.0);
      if (swapType > 0.66) {
        color.rgb = color.gbr;
      } else if (swapType > 0.33) {
        color.rgb = color.brg;
      }
    }
  }

  // === STATIC NOISE OVERLAY ===
  if (isGlitching) {
    float staticNoise = seededRandom(uv * uResolution + uTime * 1000.0);
    color.rgb = mix(color.rgb, vec3(staticNoise), 0.05 * uGlitchIntensity);
  }

  // === MONOCHROME GLITCH ===
  if (isGlitching) {
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = vec3(lum);
  }

  gl_FragColor = color;
}
`;

export default class GlitchPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({
      game,
      fragShader
    });

    this._glitchIntensity = DEFAULT_GLITCH_INTENSITY;
    this._isGlitching = false;
    this._glitchSeed = Math.random();
    this._glitchJustStartedFlag = false;
    this._lastCheckedGlitchTime = -1;
    this._lastGlitchState = false;
  }

  _random(x, y) {
    const val = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return val - Math.floor(val);
  }

  _calculateGlitchState(time) {
    const glitchTime = Math.floor(time * GLITCH_TICKS_PER_SECOND);
    const glitchRand = this._random(glitchTime, 0);
    return glitchRand > (1.0 - this._glitchIntensity * GLITCH_PROBABILITY_SCALAR);
  }

  updateGlitchState(time) {
    const glitchTime = Math.floor(time * GLITCH_TICKS_PER_SECOND);
    if (glitchTime === this._lastCheckedGlitchTime) {
      return;
    }

    this._lastCheckedGlitchTime = glitchTime;
    const wasGlitching = this._lastGlitchState;
    this._isGlitching = this._calculateGlitchState(time);

    if (this._isGlitching && !wasGlitching) {
      this._glitchJustStartedFlag = true;
      this._glitchSeed = Math.random();
    } else {
      this._glitchJustStartedFlag = false;
    }

    this._lastGlitchState = this._isGlitching;
  }

  onPreRender() {
    const time = this.game.loop.time / 1000;
    // Keep the shader uniforms in sync with the CPU-side glitch state
    this.set1f('uTime', time);
    this.set2f('uResolution', this.game.config.width, this.game.config.height);
    this.set1f('uGlitchIntensity', this._glitchIntensity);
    this.set1f('uGlitchFlag', this._isGlitching ? 1.0 : 0.0);
    this.set1f('uGlitchSeed', this._glitchSeed);
  }

  isGlitching() {
    return this._isGlitching;
  }

  glitchJustStarted() {
    const started = this._glitchJustStartedFlag;
    this._glitchJustStartedFlag = false;
    return started;
  }

  setGlitchIntensity(intensity) {
    this._glitchIntensity = Math.max(0.0, Math.min(1.0, intensity));
  }
}
