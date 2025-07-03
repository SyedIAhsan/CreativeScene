import { CONFIG } from "./config.js";

export class LightingManager {
  constructor(scene) {
    this.scene = scene;
    this.sun = null;
    this.ambient = null;
    this.lightning = null;
    this.lavaLight = null;
    this.helpers = [];
    this.lightningProps = { on: true };
    this.settings = { ...CONFIG.lighting };
  }

  initialize() {
    this.setupSun();
    this.setupAmbient();
    this.setupLightning();
    this.setupLavaLight();
  }

  setupSun() {
    const dayColor = new THREE.Color(this.settings.dayColor);
    const nightColor = new THREE.Color(this.settings.nightColor);

    this.sun = new THREE.DirectionalLight(dayColor, 2);
    this.sun.position.set(5, 350, 350);
    this.sun.castShadow = true;

    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;

    const d = 800;
    this.sun.shadow.camera.left = -d;
    this.sun.shadow.camera.right = d;
    this.sun.shadow.camera.top = d;
    this.sun.shadow.camera.bottom = -d;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 1000;

    this.scene.add(this.sun);

    // Helpers
    const helper3 = new THREE.CameraHelper(this.sun.shadow.camera);
    this.scene.add(helper3);
    this.helpers.push(helper3);

    const helper = new THREE.DirectionalLightHelper(this.sun, 10, 0xff0000);
    this.scene.add(helper);
    this.helpers.push(helper);
  }

  setupAmbient() {
    this.ambient = new THREE.AmbientLight(
      0xffffff,
      this.settings.ambientIntensity
    );
    this.scene.add(this.ambient);
  }

  setupLightning() {
    this.lightning = new THREE.PointLight(
      this.settings.lightningIntensity,
      this.settings.lightningRange
    );
    this.lightning.position.set(400, 230, 0);
    this.lightning.castShadow = true;
    this.scene.add(this.lightning);

    const helper2 = new THREE.PointLightHelper(this.lightning, 10, 0xff0000);
    this.scene.add(helper2);
    this.helpers.push(helper2);

    this.setupLightningAnimation();
  }

  setupLavaLight() {
    this.lavaLight = new THREE.PointLight(
      0xff4500,
      CONFIG.lava.lightIntensity,
      CONFIG.lava.lightRange
    );
    this.lavaLight.position.set(
      CONFIG.lava.position.x,
      CONFIG.lava.position.y - 4,
      CONFIG.lava.position.z
    );
    this.lavaLight.castShadow = true;
    this.scene.add(this.lavaLight);
  }

  setupLightningAnimation() {
    const lightningArea = {
      minX: -400,
      maxX: 400,
      minZ: -400,
      maxZ: 400,
    };

    setInterval(() => {
      if (this.lightningProps.on) {
        this.lightning.intensity = Math.random() > 0.08 ? 0 : 15;
        this.lightning.position.set(
          Math.random() * (lightningArea.maxX - lightningArea.minX) +
            lightningArea.minX,
          300 + Math.random() * 30,
          Math.random() * (lightningArea.maxZ - lightningArea.minZ) +
            lightningArea.minZ
        );
      } else {
        this.lightning.intensity = 0;
      }
    }, 200);
  }

  updateSunOrbit(elapsedTime) {
    const sunX = Math.cos(elapsedTime) * this.settings.sunOrbitRadius;
    const sunZ = Math.sin(elapsedTime) * this.settings.sunOrbitRadius;
    const sunY = Math.sin(elapsedTime) * this.settings.sunOrbitRadius;

    this.sun.position.set(sunX, sunY, sunZ);
    this.sun.target.position.set(0, 0, 0);
    this.sun.target.updateMatrixWorld();

    const heightRatio = Math.max(
      0,
      sunY / (this.settings.sunOrbitRadius * 0.5)
    );

    this.sun.intensity = THREE.MathUtils.lerp(0.2, 1.2, heightRatio);
    this.ambient.intensity = THREE.MathUtils.lerp(0.2, 0.35, heightRatio);

    const dayColor = new THREE.Color(this.settings.dayColor);
    const nightColor = new THREE.Color(this.settings.nightColor);
    this.sun.color.copy(nightColor).lerp(dayColor, heightRatio);

    // Update helpers
    this.helpers.forEach((helper) => {
      if (helper.update) helper.update();
    });
  }

  setLightningEnabled(enabled) {
    this.lightningProps.on = enabled;
  }

  setLavaLightIntensity(intensity) {
    if (this.lavaLight) {
      this.lavaLight.intensity = intensity;
    }
  }

  setHelpersVisible(visible) {
    this.helpers.forEach((helper) => {
      helper.visible = visible;
    });
  }

  getSun() {
    return this.sun;
  }

  getAmbient() {
    return this.ambient;
  }

  getLightning() {
    return this.lightning;
  }

  getLavaLight() {
    return this.lavaLight;
  }
}
