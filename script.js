// @ts-check

// Plan: Wind and rain swept terrain forest
// Models: Trees mountains terrains clouds
// Lights and shading: Orbiting sun and moon, lighting on off, refractive lake perhaps
// Cameras: Orbit controls,
// Materials: Stone, grass, water?,
// Import models: cabin? animals?
// Particle effects: Fire, campfire, maybe lava, rain, smoke,
// UI: Customizable lights, intensity color, show helpers, control orbit, maybe control rain level,
// Animation: sway of trees controlled by customizable wind speed
// Physics: maybe hail storm based physics... each piece would be an object dk how that will render out
/*

/*
 paragraphs: When making the terrain I initially used a displacement map along with the black and white noise map however I 
 learned this doesn't actually change the Y values of the plane only gives the appearance of that change, this made coloring based on 
 height difficult so i had to go with a much more tedious solution of doing the displacement on the CPU beforehand.
*/

// Scene setup
const scene = new THREE.Scene();
const textureLoader = new THREE.TextureLoader();
scene.background = new THREE.Color(0x325aa1); // Light gray background

const TERRA = {
  vertices: 1024,
  width: 800,
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
};

let terrain = null;

/*





*/
// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 160, 400);
/*





*/
// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/*





*/
// Orbit Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 1;
controls.maxDistance = 500;
controls.maxPolarAngle = Math.PI / 1.5;

controls.keys = {
  LEFT: "KeyA",
  UP: "KeyW",
  RIGHT: "KeyD",
  DOWN: "KeyS",
};
controls.listenToKeyEvents(window);
/*





*/
// Terrain
const heightMap = textureLoader.load("image6.png", () => {
  cacheCanvas(heightMap);
  buildTerrain();
});

function cacheCanvas(tex) {
  const img = tex.image;
  const cvs = document.createElement("canvas");
  cvs.width = img.width;
  cvs.height = img.height;
  const ctx = cvs.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  tex.userData = { canvas: cvs, ctx };
}

function buildTerrain() {
  if (terrain) {
    terrain.geometry.dispose();
    terrain.material.dispose();
    scene.remove(terrain);
  }

  //geometry
  const g = new THREE.PlaneGeometry(
    TERRA.width,
    TERRA.width,
    TERRA.vertices,
    TERRA.vertices
  );

  // blank colour buffer
  const colors = new Float32Array(g.attributes.position.count * 3);
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  //material
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
  });

  //mesh
  terrain = new THREE.Mesh(g, m);
  terrain.rotation.x = -Math.PI / 2;
  terrain.castShadow = terrain.receiveShadow = true;
  scene.add(terrain);

  //---------------------------------------- CPU-displace & colour
  displaceAndColor(g); // helper
}

function displaceAndColor(geometry) {
  const img = heightMap.image;
  const ctx = heightMap.userData.ctx;
  const imgData = ctx.getImageData(0, 0, img.width, img.height).data;

  const posAttr = geometry.attributes.position;
  const uvAttr = geometry.attributes.uv;
  const colAttr = geometry.attributes.color;

  const SCALE = TERRA.scale;
  const BIAS = TERRA.bias;

  const lowC = new THREE.Color(TERRA.colors.low);
  const midC = new THREE.Color(TERRA.colors.mid);
  const highC = new THREE.Color(TERRA.colors.high);

  for (let i = 0; i < posAttr.count; i++) {
    // --- displacement -----------------------------------------------------
    const u = uvAttr.getX(i);
    const v = uvAttr.getY(i);
    const xPix = Math.floor(u * (img.width - 1));
    const yPix = Math.floor((1 - v) * (img.height - 1));
    const idx = (yPix * img.width + xPix) * 4;
    const grey = imgData[idx] / 255;

    const zWorld = grey * SCALE + BIAS;
    posAttr.setZ(i, zWorld);

    // --- colouring --------------------------------------------------------
    let h = THREE.MathUtils.clamp((zWorld - BIAS) / SCALE, 0, 1);
    let r, g, b;
    if (h < TERRA.thresholds.mid) {
      ({ r, g, b } = lowC);
    } else if (h < TERRA.thresholds.high) {
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

scene.add(terrain);
/*





*/
// Lighting
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(5, 280, 350);
sun.castShadow = true;
scene.add(sun);

const helper = new THREE.DirectionalLightHelper(sun, 10, 0xff0000);
scene.add(helper);

const ambient = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambient);
/*





*/
// GUI
const gui = new dat.GUI();
gui.close();

const cameraInfo = { status: "" };
gui.add(cameraInfo, "status").name("Camera").listen();

const fShape = gui.addFolder("Shape");
fShape
  .add(TERRA, "vertices", 64, 1024, 64)
  .name("Verts/edge")
  .onFinishChange(buildTerrain);

fShape
  .add(TERRA, "width", 100, 1024, 1)
  .name("Width")
  .onFinishChange(buildTerrain);

fShape
  .add(TERRA, "scale", 0, 200, 1)
  .name("Height scale")
  .onChange(buildTerrain);

fShape
  .add(TERRA, "bias", -150, 150, 1)
  .name("Height bias")
  .onChange(buildTerrain);

const fCol = gui.addFolder("Colours");

fCol.addColor(TERRA.colors, "low").name("Low (sand)").onChange(buildTerrain);

fCol.addColor(TERRA.colors, "mid").name("Mid (grass)").onChange(buildTerrain);

fCol.addColor(TERRA.colors, "high").name("High (rock)").onChange(buildTerrain);

fCol
  .add(TERRA.thresholds, "mid", 0, 1, 0.01)
  .name("Sand → Grass")
  .onChange(buildTerrain);

fCol
  .add(TERRA.thresholds, "high", 0, 1, 0.01)
  .name("Grass → Rock")
  .onChange(buildTerrain);
/*





*/
// Animation loop
const clock = new THREE.Clock();
function animate() {
  const delta = clock.getDelta(); // for future animation use
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);

  cameraInfo.status =
    `pos(${camera.position.x.toFixed(2)},${camera.position.y.toFixed(
      2
    )},${camera.position.z.toFixed(2)}) ` +
    `ang(${THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()).toFixed(
      1
    )},${THREE.MathUtils.radToDeg(controls.getPolarAngle()).toFixed(1)})`;
}

animate();
