// @ts-check

// Simplified Modular Three.js Creative Scene
// This version doesn't use ES6 modules and loads dependencies in order

// Wait for all dependencies to load
function waitForDependencies() {
  return new Promise((resolve) => {
    const checkDependencies = () => {
      if (
        typeof THREE !== "undefined" &&
        typeof CANNON !== "undefined" &&
        typeof dat !== "undefined"
      ) {
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

// Configuration object
const CONFIG = {
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
  water: {
    waterColor: "#2f2ade",
    elevation: 2,
    exposure: 10,
    waterDelta: 2 / 60,
    distortion: 30.5,
    waveSize: 5,
    waterAlpha: 0.9,
  },
  wind: {
    x: 0.3,
    z: 0.1,
    speed: 1.0,
  },
  rain: {
    count: 60000,
    size: 0.4,
    color: 0xaaaaaa,
    enabled: false,
  },
  lava: {
    fireRadius: 11,
    fireHeight: 40,
    particleCount: 30000,
    position: { x: -174, y: 62, z: 88 },
    lightIntensity: 5,
    lightRange: 200,
  },
  lighting: {
    sunOrbitRadius: 350,
    dayColor: 0xf0f8ff,
    nightColor: 0x809fff,
    ambientIntensity: 0.5,
    lightningIntensity: 50,
    lightningRange: 1500,
  },
  camera: {
    fov: 75,
    near: 0.1,
    far: 2500,
    position: { x: 0, y: 160, z: 400 },
  },
  physics: {
    gravity: { x: 0, y: -10, z: 0 },
    planeRestitution: 0.6,
  },
  gui: {
    orbitSpeed: 0.00002,
    showHelpers: true,
  },
};

// Main application class
class CreativeSceneApp {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.world = null;
    this.clock = null;
    this.textureLoader = null;
    this.terrain = null;
    this.heightMap = null;
    this.water = null;
    this.rain = null;
    this.rainCount = CONFIG.rain.count;
    this.rainPositions = new Float32Array(this.rainCount * 3);
    this.rainVelocities = [];
    this.sun = null;
    this.ambient = null;
    this.lightning = null;
    this.lavaLight = null;
    this.lavaCircle = null;
    this.lavaSpheres = [];
    this.gui = null;
    this.windSettings = { ...CONFIG.wind };
    this.guiControls = { ...CONFIG.gui };
    this.treeInstances = [];
    this.helpers = [];
  }

  async initialize() {
    try {
      console.log("Waiting for dependencies...");
      await waitForDependencies();

      console.log("Initializing Creative Scene...");

      this.setupScene();
      this.setupCamera();
      this.setupRenderer();
      this.setupControls();
      this.setupPhysics();
      this.setupSkydome();
      this.setupClouds();

      // Initialize managers
      this.textureLoader = new THREE.TextureLoader();

      // For now, just set up basic scene
      this.setupBasicScene();

      this.clock = new THREE.Clock();
      this.setupEventListeners();

      console.log("Scene initialized successfully!");

      // Start the animation loop
      this.animate();
    } catch (error) {
      console.error("Failed to initialize scene:", error);
    }
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
      console.log("Physics initialized successfully");
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
    const skydome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skydome);
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

  setupBasicScene() {
    // Add some basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);

    // Initialize all features
    this.setupTerrain();
    this.setupWater();
    this.setupRain();
    this.setupLighting();
    this.setupLava();
    this.setupTrees();
    this.setupGUI();
  }

  setupTerrain() {
    this.heightMap = this.textureLoader.load("image6.png", () => {
      this.cacheCanvas(this.heightMap);
      this.buildTerrain();
    });
  }

  cacheCanvas(tex) {
    const img = tex.image;
    const cvs = document.createElement("canvas");
    cvs.width = img.width;
    cvs.height = img.height;
    const ctx = cvs.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      tex.userData = { canvas: cvs, ctx };
    }
  }

  buildTerrain() {
    // Geometry
    const g = new THREE.PlaneGeometry(
      CONFIG.terrain.width,
      CONFIG.terrain.width,
      CONFIG.terrain.vertices,
      CONFIG.terrain.vertices
    );

    // Color buffer
    const colors = new Float32Array(g.attributes.position.count * 3);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Material
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
    });

    // Mesh
    this.terrain = new THREE.Mesh(g, m);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.castShadow = false;
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);

    this.displaceAndColor(g);
    console.log("Terrain built successfully");

    // Load trees after terrain is built
    this.loadAndScatterTrees();
  }

  displaceAndColor(geometry) {
    const img = this.heightMap.image;
    const ctx = this.heightMap.userData.ctx;
    const imgData = ctx.getImageData(0, 0, img.width, img.height).data;

    const posAttr = geometry.attributes.position;
    const uvAttr = geometry.attributes.uv;
    const colAttr = geometry.attributes.color;

    const SCALE = CONFIG.terrain.scale;
    const BIAS = CONFIG.terrain.bias;

    const lowC = new THREE.Color(CONFIG.terrain.colors.low);
    const midC = new THREE.Color(CONFIG.terrain.colors.mid);
    const highC = new THREE.Color(CONFIG.terrain.colors.high);

    for (let i = 0; i < posAttr.count; i++) {
      // Displacement
      const u = uvAttr.getX(i);
      const v = uvAttr.getY(i);
      const xPix = Math.floor(u * (img.width - 1));
      const yPix = Math.floor((1 - v) * (img.height - 1));
      const idx = (yPix * img.width + xPix) * 4;
      const grey = imgData[idx] / 255;

      const zWorld = grey * SCALE + BIAS;
      posAttr.setZ(i, zWorld);

      // Coloring
      let h = THREE.MathUtils.clamp((zWorld - BIAS) / SCALE, 0, 1);
      let r, g, b;
      if (h < CONFIG.terrain.thresholds.mid) {
        ({ r, g, b } = lowC);
      } else if (h < CONFIG.terrain.thresholds.high) {
        ({ r, g, b } = midC);
      } else {
        ({ r, g, b } = highC);
      }
      colAttr.setXYZ(i, r, g, b);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  setupWater() {
    const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
    const waterNormals = this.textureLoader.load("image8.jpg");
    waterNormals.wrapS = THREE.RepeatWrapping;
    waterNormals.wrapT = THREE.RepeatWrapping;

    this.water = new THREE.Water(waterGeometry, {
      waterNormals: waterNormals,
    });

    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = CONFIG.water.elevation;
    this.water.material.transparent = true;

    this.scene.add(this.water);
    this.updateWater();
    console.log("Water initialized successfully");
  }

  updateWater() {
    this.water.material.uniforms["waterColor"].value.setHex(
      parseInt(CONFIG.water.waterColor.replace("#", "0x"))
    );
  }

  setupRain() {
    // Initialize rain positions and velocities
    for (let i = 0; i < this.rainCount; i++) {
      this.rainPositions[i * 3 + 0] = Math.random() * 800 - 400;
      this.rainPositions[i * 3 + 1] = Math.random() * 500 - 300;
      this.rainPositions[i * 3 + 2] = Math.random() * 800 - 400;

      this.rainVelocities.push({
        x: CONFIG.wind.x + (Math.random() - 0.5) * 0.1,
        y: Math.random() * 0.2 + 0.4,
        z: CONFIG.wind.z + (Math.random() - 0.5) * 0.1,
      });
    }

    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.rainPositions, 3)
    );

    const rainMaterial = new THREE.PointsMaterial({
      size: CONFIG.rain.size,
      color: CONFIG.rain.color,
      transparent: true,
    });

    this.rain = new THREE.Points(rainGeo, rainMaterial);
    this.scene.add(this.rain);
    console.log("Rain initialized successfully");
  }

  setupLighting() {
    // Remove basic lighting
    this.scene.children = this.scene.children.filter(
      (child) =>
        !(
          child instanceof THREE.AmbientLight ||
          child instanceof THREE.DirectionalLight
        )
    );

    // Setup sun
    const dayColor = new THREE.Color(CONFIG.lighting.dayColor);
    const nightColor = new THREE.Color(CONFIG.lighting.nightColor);
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

    // Add sun helpers
    const helper3 = new THREE.CameraHelper(this.sun.shadow.camera);
    this.scene.add(helper3);
    this.helpers.push(helper3);

    const helper = new THREE.DirectionalLightHelper(this.sun, 10, 0xff0000);
    this.scene.add(helper);
    this.helpers.push(helper);

    // Setup ambient
    this.ambient = new THREE.AmbientLight(
      0xffffff,
      CONFIG.lighting.ambientIntensity
    );
    this.scene.add(this.ambient);

    // Setup lightning
    this.lightning = new THREE.PointLight(
      CONFIG.lighting.lightningIntensity,
      CONFIG.lighting.lightningRange
    );
    this.lightning.position.set(400, 230, 0);
    this.lightning.castShadow = true;
    this.scene.add(this.lightning);

    // Add lightning helper
    const helper2 = new THREE.PointLightHelper(this.lightning, 10, 0xff0000);
    this.scene.add(helper2);
    this.helpers.push(helper2);

    // Lightning animation
    setInterval(() => {
      this.lightning.intensity = Math.random() > 0.08 ? 0 : 15;
      this.lightning.position.set(
        Math.random() * 800 - 400,
        300 + Math.random() * 30,
        Math.random() * 800 - 400
      );
    }, 200);

    console.log("Lighting initialized successfully");
  }

  setupLava() {
    // Lava circle
    const lavaTexture = this.textureLoader.load("lava.jpg");
    const lavaMaterial = new THREE.MeshStandardMaterial({
      map: lavaTexture,
      emissive: new THREE.Color(0xff4500),
      emissiveIntensity: 0.2,
    });

    this.lavaCircle = new THREE.Mesh(
      new THREE.CircleGeometry(13, 64),
      lavaMaterial
    );
    this.lavaCircle.rotation.x = -Math.PI / 2;
    this.lavaCircle.position.set(
      CONFIG.lava.position.x,
      CONFIG.lava.position.y - 4,
      CONFIG.lava.position.z
    );
    this.scene.add(this.lavaCircle);

    // Lava light
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

    // Click handler
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener("click", (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(this.lavaCircle);

      if (intersects.length > 0) {
        console.log("Lava clicked!");
        this.ejectLava(intersects[0].point);
        this.lavaLight.intensity = 50;
        setTimeout(() => {
          this.lavaLight.intensity = CONFIG.lava.lightIntensity;
        }, 2000);
      }
    });

    console.log("Lava initialized successfully");
  }

  ejectLava(position) {
    const sphereGeo = new THREE.SphereGeometry(3, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xff4500,
      emissive: 0xff2200,
    });

    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;
    this.scene.add(sphereMesh);

    if (typeof CANNON !== "undefined" && this.world) {
      const sphereShape = new CANNON.Sphere(1.5);
      const sphereBody = new CANNON.Body({
        mass: 3,
        shape: sphereShape,
        position: new CANNON.Vec3(position.x, position.y + 5, position.z),
      });

      const upwardForce = 10 + Math.random() * 20;
      const sideForce = 27;
      sphereBody.velocity.set(
        (Math.random() - 0.5) * sideForce,
        upwardForce,
        (Math.random() - 0.5) * sideForce
      );

      this.world.addBody(sphereBody);
      this.lavaSpheres.push({ mesh: sphereMesh, body: sphereBody });
    } else {
      this.lavaSpheres.push({ mesh: sphereMesh, body: null });
    }
  }

  setupGUI() {
    this.gui = new dat.GUI();
    this.gui.close();

    // Wind controls
    const windFolder = this.gui.addFolder("Wind");
    windFolder.add(this.windSettings, "x", -1, 1, 0.01).name("Wind X");
    windFolder.add(this.windSettings, "z", -1, 1, 0.01).name("Wind Z");
    windFolder.add(this.windSettings, "speed", 0, 5, 0.1).name("Wind Speed");
    windFolder.close();

    // Rain controls
    this.gui
      .add({ enabled: false }, "enabled")
      .name("Rain On/Off")
      .onChange((value) => {
        if (value) {
          this.scene.add(this.rain);
        } else {
          this.scene.remove(this.rain);
        }
      });

    // Helper controls
    this.gui
      .add(this.guiControls, "showHelpers")
      .name("Toggle Helpers")
      .onChange((value) => {
        this.helpers.forEach((helper) => {
          helper.visible = value;
        });
      });

    // Sun orbit controls
    this.gui
      .add(this.guiControls, "orbitSpeed", 0.00005, 0.001)
      .step(0.00001)
      .name("Sun Orbit Speed");

    // Water controls
    const folderWater = this.gui.addFolder("Water Settings");
    this.gui.add({ on: true }, "on").name("Lightning");

    folderWater
      .addColor({ waterColor: CONFIG.water.waterColor }, "waterColor")
      .name("Water Color")
      .onChange((value) => this.updateWaterColor(value));

    folderWater
      .add(this.water.material.uniforms["distortionScale"], "value", 0, 10)
      .name("Distortion")
      .onChange(
        (value) =>
          (this.water.material.uniforms["distortionScale"].value = value)
      );

    folderWater
      .add(this.water.material.uniforms["size"], "value", 0.1, 10)
      .name("Wave Size")
      .onChange(
        (value) => (this.water.material.uniforms["size"].value = value)
      );

    folderWater
      .add({ waterAlpha: CONFIG.water.waterAlpha }, "waterAlpha", 0, 1)
      .name("Opacity")
      .onChange(
        (value) => (this.water.material.uniforms["alpha"].value = value)
      );

    folderWater
      .add(this.water.material.uniforms["time"], "value", 0, 1000)
      .name("Time");

    folderWater
      .add({ speed: CONFIG.water.waterDelta }, "speed", 0, 1)
      .onChange((value) => (CONFIG.water.waterDelta = value))
      .name("Animation Speed");

    // Terrain shape controls
    const fShape = this.gui.addFolder("Shape");
    fShape
      .add(CONFIG.terrain, "vertices", 64, 1024, 64)
      .name("Verts/edge")
      .onFinishChange(() => this.rebuildTerrain());

    fShape
      .add(CONFIG.terrain, "width", 100, 1024, 1)
      .name("Width")
      .onFinishChange(() => this.rebuildTerrain());

    fShape
      .add(CONFIG.terrain, "scale", 0, 200, 1)
      .name("Height scale")
      .onChange(() => this.rebuildTerrain());

    fShape
      .add(CONFIG.terrain, "bias", -150, 150, 1)
      .name("Height bias")
      .onChange(() => this.rebuildTerrain());

    // Terrain color controls
    const fCol = this.gui.addFolder("Colours");
    fCol
      .addColor(CONFIG.terrain.colors, "low")
      .name("Low (sand)")
      .onChange(() => this.rebuildTerrain());

    fCol
      .addColor(CONFIG.terrain.colors, "mid")
      .name("Mid (grass)")
      .onChange(() => this.rebuildTerrain());

    fCol
      .addColor(CONFIG.terrain.colors, "high")
      .name("High (rock)")
      .onChange(() => this.rebuildTerrain());

    fCol
      .add(CONFIG.terrain.thresholds, "mid", 0, 1, 0.01)
      .name("Sand → Grass")
      .onChange(() => this.rebuildTerrain());

    fCol
      .add(CONFIG.terrain.thresholds, "high", 0, 1, 0.01)
      .name("Grass → Rock")
      .onChange(() => this.rebuildTerrain());

    console.log("GUI initialized successfully");
  }

  updateWaterColor(color) {
    this.water.material.uniforms["waterColor"].value.setHex(
      parseInt(color.replace("#", "0x"))
    );
  }

  rebuildTerrain() {
    // Clear existing trees
    this.treeInstances.forEach((tree) => this.scene.remove(tree));
    this.treeInstances = [];

    // Rebuild terrain
    this.buildTerrain();
  }

  setupTrees() {
    // Trees will be loaded after terrain is built
    console.log("Tree system ready");
  }

  loadAndScatterTrees() {
    const loader = new THREE.FBXLoader();
    loader.load("Tree2.fbx", (tree) => {
      tree.scale.set(10, 10, 10);
      tree.castShadow = true;
      tree.receiveShadow = true;
      tree.children.forEach((c) => (c.castShadow = c.receiveShadow = true));

      const greenPositions = this.getGreenVertexPositions(
        this.terrain.geometry,
        CONFIG.terrain.colors.mid
      );

      console.log("Green positions found:", greenPositions.length);
      this.scatterModels(tree, greenPositions, 300);
    });
  }

  getGreenVertexPositions(geometry, targetColorHex) {
    const posAttr = geometry.attributes.position;
    const colAttr = geometry.attributes.color;

    const target = new THREE.Color(targetColorHex);
    const threshold = 0.03;
    const positions = [];

    for (let i = 0; i < posAttr.count; i++) {
      const r = colAttr.getX(i);
      const g = colAttr.getY(i);
      const b = colAttr.getZ(i);

      const colorDist = Math.sqrt(
        (r - target.r) ** 2 + (g - target.g) ** 2 + (b - target.b) ** 2
      );

      if (colorDist < threshold) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);
        positions.push(new THREE.Vector3(x, y, z));
      }
    }

    return positions;
  }

  scatterModels(model, positions, count = 50) {
    const chosen = new Set();

    for (let i = 0; i < count; i++) {
      let idx = -1;
      for (let tries = 0; tries < 50; tries++) {
        const candidate = Math.floor(Math.random() * positions.length);
        if (!chosen.has(candidate)) {
          idx = candidate;
          break;
        }
      }
      if (idx === -1) continue;
      chosen.add(idx);

      const worldPos = positions[idx].clone();
      this.terrain.localToWorld(worldPos);
      worldPos.y += 0.2;

      const tree = model.clone(true);
      tree.position.copy(worldPos);
      tree.rotation.y = Math.random() * Math.PI * 2;
      tree.scale.setScalar(5 + Math.random() * 0.5);

      tree.userData.swayOffset = Math.random() * Math.PI * 2;
      tree.userData.swayAmplitude = 0.6 + Math.random() * 0.6;

      this.treeInstances.push(tree);
      this.scene.add(tree);
    }
    console.log("Trees scattered successfully");
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

    // Update water animation
    if (this.water) {
      this.water.material.uniforms["time"].value += CONFIG.water.waterDelta;
    }

    // Update rain animation
    if (this.rain) {
      const pos = this.rain.geometry.attributes.position.array;

      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 3;

        pos[idx + 0] += CONFIG.wind.x * CONFIG.wind.speed;
        pos[idx + 1] -= this.rainVelocities[i].y;
        pos[idx + 2] += CONFIG.wind.z * CONFIG.wind.speed;

        if (pos[idx + 1] < -50) {
          pos[idx + 0] = Math.random() * 800 - 400;
          pos[idx + 1] = Math.random() * 500 + 100;
          pos[idx + 2] = Math.random() * 800 - 400;

          this.rainVelocities[i].x =
            CONFIG.wind.x + (Math.random() - 0.5) * 0.1;
          this.rainVelocities[i].y = Math.random() * 0.2 + 0.4;
          this.rainVelocities[i].z =
            CONFIG.wind.z + (Math.random() - 0.5) * 0.1;
        }
      }

      this.rain.geometry.attributes.position.needsUpdate = true;
    }

    // Update sun orbit
    if (this.sun) {
      const elapsedTime = performance.now() * this.guiControls.orbitSpeed;
      const sunX = Math.cos(elapsedTime) * CONFIG.lighting.sunOrbitRadius;
      const sunZ = Math.sin(elapsedTime) * CONFIG.lighting.sunOrbitRadius;
      const sunY = Math.sin(elapsedTime) * CONFIG.lighting.sunOrbitRadius;

      this.sun.position.set(sunX, sunY, sunZ);
      this.sun.target.position.set(0, 0, 0);
      this.sun.target.updateMatrixWorld();

      const heightRatio = Math.max(
        0,
        sunY / (CONFIG.lighting.sunOrbitRadius * 0.5)
      );
      this.sun.intensity = THREE.MathUtils.lerp(0.2, 1.2, heightRatio);
      this.ambient.intensity = THREE.MathUtils.lerp(0.2, 0.35, heightRatio);

      // Update helpers
      this.helpers.forEach((helper) => {
        if (helper.update) helper.update();
      });
    }

    // Update tree sway
    this.treeInstances.forEach((tree) => {
      const phase = this.clock.getElapsedTime() * 3 + tree.userData.swayOffset;
      const tilt =
        Math.sin(phase) *
        0.15 *
        this.windSettings.speed *
        tree.userData.swayAmplitude;

      tree.rotation.x = tilt * this.windSettings.z;
      tree.rotation.z = tilt * this.windSettings.x;
    });

    // Update lava spheres
    this.lavaSpheres.forEach(({ mesh, body }) => {
      if (body) {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => this.animate());
  }
}

// Initialize the application when the page loads
let appInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  appInstance = new CreativeSceneApp();
  appInstance.initialize();
});

// Handle window resize
window.addEventListener("resize", () => {
  if (appInstance && appInstance.camera && appInstance.renderer) {
    appInstance.camera.aspect = window.innerWidth / window.innerHeight;
    appInstance.camera.updateProjectionMatrix();
    appInstance.renderer.setSize(window.innerWidth, window.innerHeight);
  }
});
