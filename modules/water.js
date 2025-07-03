import { CONFIG } from "./config.js";

export class WaterManager {
  constructor(scene, textureLoader) {
    this.scene = scene;
    this.textureLoader = textureLoader;
    this.water = null;
    this.properties = { ...CONFIG.water };
  }

  initialize() {
    const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
    const waterNormals = this.textureLoader.load("image8.jpg");
    waterNormals.wrapS = THREE.RepeatWrapping;
    waterNormals.wrapT = THREE.RepeatWrapping;

    this.water = new THREE.Water(waterGeometry, {
      waterNormals: waterNormals,
    });

    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = this.properties.elevation;
    this.water.material.transparent = true;

    this.scene.add(this.water);
    this.updateWater();
  }

  updateWater() {
    this.water.material.uniforms["waterColor"].value.setHex(
      parseInt(this.properties.waterColor.replace("#", "0x"))
    );
  }

  update(deltaTime) {
    if (this.water) {
      this.water.material.uniforms["time"].value += this.properties.waterDelta;
      this.water.material.uniforms["distortionScale"].value =
        this.properties.distortion;
      this.water.material.uniforms["size"].value = this.properties.waveSize;
      this.water.material.uniforms["alpha"].value = this.properties.waterAlpha;
    }
  }

  setWaterColor(color) {
    this.properties.waterColor = color;
    this.updateWater();
  }

  setDistortion(value) {
    this.properties.distortion = value;
  }

  setWaveSize(value) {
    this.properties.waveSize = value;
  }

  setOpacity(value) {
    this.properties.waterAlpha = value;
  }

  setAnimationSpeed(value) {
    this.properties.waterDelta = value;
  }

  getWater() {
    return this.water;
  }

  getProperties() {
    return this.properties;
  }
}
