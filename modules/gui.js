import { CONFIG } from "./config.js";

export class GUIManager {
  constructor(
    terrainManager,
    waterManager,
    particleManager,
    lightingManager,
    lavaManager
  ) {
    this.terrainManager = terrainManager;
    this.waterManager = waterManager;
    this.particleManager = particleManager;
    this.lightingManager = lightingManager;
    this.lavaManager = lavaManager;

    this.gui = null;
    this.controls = { ...CONFIG.gui };
    this.windSettings = { ...CONFIG.wind };
  }

  initialize() {
    this.gui = new dat.GUI();
    this.gui.close();
    this.setupControls();
  }

  setupControls() {
    // Wind controls
    const windFolder = this.gui.addFolder("Wind");
    windFolder.add(this.windSettings, "x", -1, 1, 0.01).name("Wind X");
    windFolder.add(this.windSettings, "z", -1, 1, 0.01).name("Wind Z");
    windFolder.add(this.windSettings, "speed", 0, 5, 0.1).name("Wind Speed");
    windFolder.close();

    // Rain controls
    this.gui
      .add(this.particleManager.properties, "enabled")
      .name("Rain On/Off")
      .onChange((value) => {
        this.particleManager.setEnabled(value);
      });

    // Helper controls
    this.gui
      .add(this.controls, "showHelpers")
      .name("Toggle Helpers")
      .onChange((value) => {
        this.lightingManager.setHelpersVisible(value);
      });

    // Sun orbit controls
    this.gui
      .add(this.controls, "orbitSpeed", 0.00005, 0.001)
      .step(0.00001)
      .name("Sun Orbit Speed");

    // Camera info
    const cameraInfo = { status: "" };
    this.gui.add(cameraInfo, "status").name("Camera").listen();

    // Water controls
    const folderWater = this.gui.addFolder("Water Settings");
    this.gui.add(this.lightingManager.lightningProps, "on").name("Lightning");

    folderWater
      .addColor(this.waterManager.properties, "waterColor")
      .name("Water Color")
      .onChange((value) => this.waterManager.setWaterColor(value));

    folderWater
      .add(
        this.waterManager.water.material.uniforms["distortionScale"],
        "value",
        0,
        10
      )
      .name("Distortion")
      .onChange((value) => this.waterManager.setDistortion(value));

    folderWater
      .add(this.waterManager.water.material.uniforms["size"], "value", 0.1, 10)
      .name("Wave Size")
      .onChange((value) => this.waterManager.setWaveSize(value));

    folderWater
      .add(this.waterManager.properties, "waterAlpha", 0, 1)
      .name("Opacity")
      .onChange((value) => this.waterManager.setOpacity(value));

    folderWater
      .add(this.waterManager.water.material.uniforms["time"], "value", 0, 1000)
      .name("Time");

    folderWater
      .add({ speed: this.waterManager.properties.waterDelta }, "speed", 0, 1)
      .onChange((value) => this.waterManager.setAnimationSpeed(value))
      .name("Animation Speed");

    // Terrain shape controls
    const fShape = this.gui.addFolder("Shape");
    fShape
      .add(CONFIG.terrain, "vertices", 64, 1024, 64)
      .name("Verts/edge")
      .onFinishChange(() => this.terrainManager.buildTerrain());

    fShape
      .add(CONFIG.terrain, "width", 100, 1024, 1)
      .name("Width")
      .onFinishChange(() => this.terrainManager.buildTerrain());

    fShape
      .add(CONFIG.terrain, "scale", 0, 200, 1)
      .name("Height scale")
      .onChange(() => this.terrainManager.buildTerrain());

    fShape
      .add(CONFIG.terrain, "bias", -150, 150, 1)
      .name("Height bias")
      .onChange(() => this.terrainManager.buildTerrain());

    // Terrain color controls
    const fCol = this.gui.addFolder("Colours");
    fCol
      .addColor(CONFIG.terrain.colors, "low")
      .name("Low (sand)")
      .onChange(() => this.terrainManager.buildTerrain());

    fCol
      .addColor(CONFIG.terrain.colors, "mid")
      .name("Mid (grass)")
      .onChange(() => this.terrainManager.buildTerrain());

    fCol
      .addColor(CONFIG.terrain.colors, "high")
      .name("High (rock)")
      .onChange(() => this.terrainManager.buildTerrain());

    fCol
      .add(CONFIG.terrain.thresholds, "mid", 0, 1, 0.01)
      .name("Sand → Grass")
      .onChange(() => this.terrainManager.buildTerrain());

    fCol
      .add(CONFIG.terrain.thresholds, "high", 0, 1, 0.01)
      .name("Grass → Rock")
      .onChange(() => this.terrainManager.buildTerrain());
  }

  updateCameraInfo(camera, controls) {
    const cameraInfo = this.gui.getFolder("Camera");
    if (cameraInfo) {
      cameraInfo.controllers[0].setValue(
        `pos(${camera.position.x.toFixed(2)},${camera.position.y.toFixed(
          2
        )},${camera.position.z.toFixed(2)}) ` +
          `ang(${THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()).toFixed(
            1
          )},${THREE.MathUtils.radToDeg(controls.getPolarAngle()).toFixed(1)})`
      );
    }
  }

  getWindSettings() {
    return this.windSettings;
  }

  getControls() {
    return this.controls;
  }
}
