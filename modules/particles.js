import { CONFIG } from "./config.js";

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.rain = null;
    this.rainCount = CONFIG.rain.count;
    this.positions = new Float32Array(this.rainCount * 3);
    this.velocities = [];
    this.properties = { ...CONFIG.rain };
    this.wind = { x: CONFIG.wind.x, z: CONFIG.wind.z };
  }

  initialize() {
    this.setupRain();
  }

  setupRain() {
    // Initialize rain positions and velocities
    for (let i = 0; i < this.rainCount; i++) {
      this.positions[i * 3 + 0] = Math.random() * 800 - 400;
      this.positions[i * 3 + 1] = Math.random() * 500 - 300;
      this.positions[i * 3 + 2] = Math.random() * 800 - 400;

      this.velocities.push({
        x: this.wind.x + (Math.random() - 0.5) * 0.1,
        y: Math.random() * 0.2 + 0.4,
        z: this.wind.z + (Math.random() - 0.5) * 0.1,
      });
    }

    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );

    const rainMaterial = new THREE.PointsMaterial({
      size: this.properties.size,
      color: this.properties.color,
      transparent: true,
    });

    this.rain = new THREE.Points(rainGeo, rainMaterial);
  }

  update(windSettings) {
    if (!this.rain || !this.properties.enabled) return;

    const pos = this.rain.geometry.attributes.position.array;

    for (let i = 0; i < this.rainCount; i++) {
      const idx = i * 3;

      pos[idx + 0] += windSettings.x * windSettings.speed;
      pos[idx + 1] -= this.velocities[i].y;
      pos[idx + 2] += windSettings.z * windSettings.speed;

      if (pos[idx + 1] < -50) {
        pos[idx + 0] = Math.random() * 800 - 400;
        pos[idx + 1] = Math.random() * 500 + 100;
        pos[idx + 2] = Math.random() * 800 - 400;

        this.velocities[i].x = windSettings.x + (Math.random() - 0.5) * 0.1;
        this.velocities[i].y = Math.random() * 0.2 + 0.4;
        this.velocities[i].z = windSettings.z + (Math.random() - 0.5) * 0.1;
      }
    }

    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  setEnabled(enabled) {
    this.properties.enabled = enabled;
    if (enabled) {
      this.scene.add(this.rain);
    } else {
      this.scene.remove(this.rain);
    }
  }

  isEnabled() {
    return this.properties.enabled;
  }

  getRain() {
    return this.rain;
  }
}
