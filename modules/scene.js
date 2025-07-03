import { CONFIG } from "./config.js";
import { TerrainManager } from "./terrain.js";
import { WaterManager } from "./water.js";
import { ParticleManager } from "./particles.js";
import { LightingManager } from "./lighting.js";
import { LavaManager } from "./lava.js";
import { GUIManager } from "./gui.js";

export class SceneManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.world = null;
    this.clock = null;

    // Managers
    this.terrainManager = null;
    this.waterManager = null;
    this.particleManager = null;
    this.lightingManager = null;
    this.lavaManager = null;
    this.guiManager = null;

    this.textureLoader = null;
    this.skydome = null;
  }

  async initialize() {
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupControls();

    // Wait for dependencies to load
    await this.waitForDependencies();

    this.setupPhysics();
    this.setupSkydome();
    this.setupClouds();

    // Initialize managers
    this.textureLoader = new THREE.TextureLoader();

    this.terrainManager = new TerrainManager(this.scene, this.textureLoader);
    this.waterManager = new WaterManager(this.scene, this.textureLoader);
    this.particleManager = new ParticleManager(this.scene);
    this.lightingManager = new LightingManager(this.scene);
    this.lavaManager = new LavaManager(
      this.scene,
      this.textureLoader,
      this.world,
      this.camera
    );

    // Initialize managers
    await this.terrainManager.initialize();
    this.waterManager.initialize();
    this.particleManager.initialize();
    this.lightingManager.initialize();
    await this.lavaManager.initialize();

    // Setup GUI after all managers are initialized
    this.guiManager = new GUIManager(
      this.terrainManager,
      this.waterManager,
      this.particleManager,
      this.lightingManager,
      this.lavaManager
    );
    this.guiManager.initialize();

    this.clock = new THREE.Clock();
    this.setupEventListeners();
  }

  setupScene() {
    this.scene = new THREE.Scene();
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      CONFIG.camera.fov,
      window.innerWidth / window.innerHeight,
      CONFIG.camera.near,
      CONFIG.camera.far
    );
    this.camera.position.set(
      CONFIG.camera.position.x,
      CONFIG.camera.position.y,
      CONFIG.camera.position.z
    );
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);
  }

  setupControls() {
    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI / 1.5;

    this.controls.keys = {
      LEFT: "KeyA",
      UP: "KeyW",
      RIGHT: "KeyD",
      DOWN: "KeyS",
    };
    this.controls.listenToKeyEvents(window);
  }

  setupPhysics() {
    if (typeof CANNON === "undefined") {
      console.error(
        "CANNON.js physics library not loaded. Physics features will be disabled."
      );
      this.world = null;
      return;
    }

    try {
      this.world = new CANNON.World();
      this.world.gravity.set(
        CONFIG.physics.gravity.x,
        CONFIG.physics.gravity.y,
        CONFIG.physics.gravity.z
      );

      const planeShape = new CANNON.Plane();
      const planeBody = new CANNON.Body({ mass: 0 });
      planeBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
      planeBody.addShape(planeShape);
      planeBody.material = new CANNON.Material();
      planeBody.material.restitution = CONFIG.physics.planeRestitution;
      this.world.addBody(planeBody);
    } catch (error) {
      console.error("Failed to initialize physics:", error);
      this.world = null;
    }
  }

  setupSkydome() {
    const skyGeo = new THREE.SphereGeometry(900, 64, 64);
    const skyMat = new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load("image12.png"),
      side: THREE.BackSide,
    });
    this.skydome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skydome);
  }

  setupClouds() {
    const loader = new THREE.FBXLoader();
    loader.load("3dCloud.fbx", (object) => {
      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          const mat = child.material;
          mat.transparent = true;
          mat.opacity = 0.5;
        }
      });

      for (let i = 0; i < 13; i++) {
        let cloud = object.clone();
        cloud.position.set(
          Math.random() * 800 - 250,
          200 + (Math.random() * 20 - 20),
          Math.random() * 800 - 250
        );
        const scale = 1 + Math.random() * 0.8;
        cloud.scale.set(scale, scale, scale);
        cloud.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(cloud);
      }
    });
  }

  waitForDependencies() {
    return new Promise((resolve) => {
      const checkDependencies = () => {
        if (typeof THREE !== "undefined" && typeof CANNON !== "undefined") {
          console.log("All dependencies loaded successfully");
          resolve();
        } else {
          console.log("Waiting for dependencies...");
          setTimeout(checkDependencies, 100);
        }
      };
      checkDependencies();
    });
  }

  setupEventListeners() {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate() {
    const delta = this.clock.getDelta();
    if (this.world) {
      this.world.step(1 / 60, delta);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    // Update managers
    this.waterManager.update(delta);
    this.particleManager.update(this.guiManager.getWindSettings());
    this.lavaManager.update(delta);

    // Update tree sway
    this.terrainManager.updateTreeSway(
      this.guiManager.getWindSettings(),
      this.clock.getElapsedTime()
    );

    // Update sun orbit
    const elapsedTime =
      performance.now() * this.guiManager.getControls().orbitSpeed;
    this.lightingManager.updateSunOrbit(elapsedTime);

    // Update GUI camera info
    this.guiManager.updateCameraInfo(this.camera, this.controls);

    requestAnimationFrame(() => this.animate());
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  getControls() {
    return this.controls;
  }

  getWorld() {
    return this.world;
  }
}
