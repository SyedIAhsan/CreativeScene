// Centralized configuration for the 3D scene
export const CONFIG = {
  // Terrain settings
  terrain: {
    vertices: 1024,
    width: 1000,
    scale: 75,
    bias: -10,
    colors: {
      low: "#c8b37a",
      mid: "#1b4910",
      high: "#2d2b2b",
    },
    thresholds: {
      mid: 0.25,
      high: 0.5,
    },
  },

  // Water settings
  water: {
    waterColor: "#2f2ade",
    elevation: 2,
    exposure: 10,
    waterDelta: 2 / 60,
    distortion: 30.5,
    waveSize: 5,
    waterAlpha: 0.9,
  },

  // Wind settings
  wind: {
    x: 0.3,
    z: 0.1,
    speed: 1.0,
  },

  // Rain settings
  rain: {
    count: 60000,
    size: 0.4,
    color: 0xaaaaaa,
    enabled: false,
  },

  // Lava settings
  lava: {
    fireRadius: 11,
    fireHeight: 40,
    particleCount: 30000,
    position: { x: -174, y: 62, z: 88 },
    lightIntensity: 5,
    lightRange: 200,
  },

  // Lighting settings
  lighting: {
    sunOrbitRadius: 350,
    dayColor: 0xf0f8ff,
    nightColor: 0x809fff,
    ambientIntensity: 0.5,
    lightningIntensity: 50,
    lightningRange: 1500,
  },

  // Camera settings
  camera: {
    fov: 75,
    near: 0.1,
    far: 2500,
    position: { x: 0, y: 160, z: 400 },
  },

  // Physics settings
  physics: {
    gravity: { x: 0, y: -10, z: 0 },
    planeRestitution: 0.6,
  },

  // GUI settings
  gui: {
    orbitSpeed: 0.00002,
    showHelpers: true,
  },
};
