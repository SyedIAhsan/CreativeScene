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

 I wanted to go with a cubemap skybox approach for the background but it wasnt working well with the scene so I swapped
 to a skydome instead which better covered everything
*/

// Scene setup

const scene = new THREE.Scene();
const textureLoader = new THREE.TextureLoader();
const loader = new THREE.FBXLoader();
// scene.background = new THREE.Color(0x325aa1);

const TERRA = {
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
};

const waterProperties = {
  waterColor: "#2f2ade",
  elevation: 2,
  exposure: 10,
  waterDelta: 2 / 60,
  distortion: 30.5,
  wavseSize: 5,
  waterAlpha: 0.9,
};

const wind = new THREE.Vector3(0.3, 0, 0.1);
const windSettings = {
  x: 0.3,
  z: 0.1,
  speed: 1.0,
};

let terrain = null;

//Physics set up

const world = new CANNON.World();
world.gravity.set(0, -10, 0);

const planeShape = new CANNON.Plane();
const planeBody = new CANNON.Body({ mass: 0 });

planeBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

planeBody.addShape(planeShape);

planeBody.material = new CANNON.Material();
planeBody.material.restitution = 0.6;
world.addBody(planeBody);
/*







*/
// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2500
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
//Cubemap
/*
const cubeTextureLoader = new THREE.CubeTextureLoader();
const cubemap = cubeTextureLoader.load([
  "https://raw.githubusercontent.com/amaraauguste/amaraauguste.github.io/refs/heads/master/courses/CISC3620/textures/Daylight%20Box_Pieces/Daylight%20Box_PosX.bmp",
  "https://raw.githubusercontent.com/amaraauguste/amaraauguste.github.io/refs/heads/master/courses/CISC3620/textures/Daylight%20Box_Pieces/Daylight%20Box_NegX.bmp",
  "https://raw.githubusercontent.com/amaraauguste/amaraauguste.github.io/refs/heads/master/courses/CISC3620/textures/Daylight%20Box_Pieces/Daylight%20Box_PosY.bmp",
  "https://raw.githubusercontent.com/amaraauguste/amaraauguste.github.io/refs/heads/master/courses/CISC3620/textures/Daylight%20Box_Pieces/Daylight%20Box_NegY.bmp",
  "https://raw.githubusercontent.com/amaraauguste/amaraauguste.github.io/refs/heads/master/courses/CISC3620/textures/Daylight%20Box_Pieces/Daylight%20Box_PosZ.bmp",
  "https://raw.githubusercontent.com/amaraauguste/amaraauguste.github.io/refs/heads/master/courses/CISC3620/textures/Daylight%20Box_Pieces/Daylight%20Box_NegZ.bmp",
]);


scene.background = cubemap;
scene.environment = cubemap;
*/
// Skydome
const skyGeo = new THREE.SphereGeometry(900, 64, 64);
const skyMat = new THREE.MeshBasicMaterial({
  map: new THREE.TextureLoader().load("image12.png"),
  side: THREE.BackSide,
});
const skydome = new THREE.Mesh(skyGeo, skyMat);
scene.add(skydome);

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
  terrain.castShadow = false;
  terrain.receiveShadow = true;
  scene.add(terrain);

  //------ CPU-displace & colour
  displaceAndColor(g); // helper
  loadAndScatterTrees();
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
    // --- displacement -----
    const u = uvAttr.getX(i);
    const v = uvAttr.getY(i);
    const xPix = Math.floor(u * (img.width - 1));
    const yPix = Math.floor((1 - v) * (img.height - 1));
    const idx = (yPix * img.width + xPix) * 4;
    const grey = imgData[idx] / 255;

    const zWorld = grey * SCALE + BIAS;
    posAttr.setZ(i, zWorld);

    // --- colouring -----
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

function getGreenVertexPositions(geometry, targetColorHex) {
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

scene.add(terrain);
/*





*/
// //testing
// const shadowPlane = new THREE.Mesh(
//   new THREE.PlaneGeometry(5000, 5000),
//   new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide })
// );

// shadowPlane.rotation.x = -Math.PI / 2;
// shadowPlane.position.y = 100;
// shadowPlane.receiveShadow = true;
// shadowPlane.castShadow = true;

// // scene.add(shadowPlane);

// const testGeometry = new THREE.BoxGeometry(20, 20, 20);
// const testMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
// const testCube = new THREE.Mesh(testGeometry, testMaterial);

// testCube.position.set(0, 150, 0);
// testCube.castShadow = true;

// // scene.add(testCube);

// Water
const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
const waterNormals = new THREE.TextureLoader().load("image8.jpg");
waterNormals.wrapS = THREE.RepeatWrapping;
waterNormals.wrapT = THREE.RepeatWrapping;

const water = new THREE.Water(waterGeometry, {
  waterNormals: waterNormals,
});

water.rotation.x = -Math.PI / 2;
water.position.y = 2;
water.material.transparent = true;

scene.add(water);

function updateWater() {
  water.material.uniforms["waterColor"].value.setHex(
    parseInt(waterProperties.waterColor.replace("#", "0x"))
  );
}
updateWater();
/*










*/
// Clouds
loader.load("3dCloud.fbx", function (object) {
  object.traverse(function (child) {
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

    scene.add(cloud);
  }
});

// Rain attempt 1
// const RAIN_COUNT = 8000;
// const RAIN_RADIUS = 1000; // horizontal spread around orig
// const RAIN_CEILING = 240; // spawn height
// const RAIN_FLOOR = -5;

// const rainGeo = new THREE.BufferGeometry();
// const rainPos = new Float32Array(RAIN_COUNT * 3); // x,y,z
// const rainVel = new Float32Array(RAIN_COUNT);

// for (let i = 0; i < RAIN_COUNT; i++) {
//   rainVel[i] = THREE.MathUtils.randFloat(2500, 3500); // each is different
// }

// for (let i = 0; i < RAIN_COUNT; i++) {
//   const angle = Math.random() * Math.PI * 2;
//   const rad = Math.sqrt(Math.random()) * RAIN_RADIUS;
//   rainPos[i * 3] = Math.cos(angle) * rad;
//   rainPos[i * 3 + 1] = Math.random() * RAIN_CEILING;
//   rainPos[i * 3 + 2] = Math.sin(angle) * rad;
// }

// rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));

// const rainMat = new THREE.PointsMaterial({
//   color: 0xffffff,
//   size: 1, // px on screen
//   sizeAttenuation: true, // shrink with distance
//   transparent: true,
//   opacity: 0.5,
// });

// const rain = new THREE.Points(rainGeo, rainMat);
// scene.add(rain);

// function updateRain(dt) {
//   const pos = rainGeo.attributes.position.array;

//   for (let i = 0; i < RAIN_COUNT; i++) {
//     const idx = i * 3 + 1;
//     pos[idx] -= rainVel[i] * dt;

//     if (pos[idx] < RAIN_FLOOR) {
//       pos[idx] = RAIN_CEILING;
//     }
//   }
//   rainGeo.attributes.position.needsUpdate = true;
// }

// Rain attempt 2
let rain,
  rainDrop,
  rainCount = 60000;
const positions = new Float32Array(rainCount * 3);
const velocities = [];

for (let i = 0; i < rainCount; i++) {
  positions[i * 3 + 0] = Math.random() * 800 - 400;
  positions[i * 3 + 1] = Math.random() * 500 - 300;
  positions[i * 3 + 2] = Math.random() * 800 - 400;

  velocities.push({
    x: wind.x + (Math.random() - 0.5) * 0.1,
    y: Math.random() * 0.2 + 0.4,
    z: wind.z + (Math.random() - 0.5) * 0.1,
  });
}

const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const rainMaterial = new THREE.PointsMaterial({
  size: 0.4,
  color: 0xaaaaaa,
  transparent: true,
});

rain = new THREE.Points(rainGeo, rainMaterial);

const rainProps = {
  enabled: false,
};

/*















*/
// Trees
const treeInstances = [];

function loadAndScatterTrees() {
  loader.load("Tree2.fbx", function (tree) {
    tree.scale.set(10, 10, 10);
    tree.castShadow = true;
    tree.receiveShadow = true;
    tree.children.forEach((c) => (c.castShadow = c.receiveShadow = true));

    const greenPositions = getGreenVertexPositions(
      terrain.geometry,
      TERRA.colors.mid
    );

    console.log("Green positions found:", greenPositions.length);
    scatterModels(tree, greenPositions, 300);
  });
}

function scatterModels(model, positions, count = 50) {
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
    terrain.localToWorld(worldPos);
    worldPos.y += 0.2;

    const tree = model.clone(true);
    tree.position.copy(worldPos);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.scale.setScalar(5 + Math.random() * 0.5);

    tree.userData.swayOffset = Math.random() * Math.PI * 2;
    tree.userData.swayAmplitude = 0.6 + Math.random() * 0.6;

    treeInstances.push(tree);
    scene.add(tree);
  }
}

/*



*/
//Lava
const fireRadius = 11;
const fireHeight = 40;
const particleCount = 30000;
import particleFire from "https://esm.sh/three-particle-fire";

particleFire.install({ THREE: THREE });

const fireGeo = new particleFire.Geometry(
  fireRadius,
  fireHeight,
  particleCount
);
const fireMat = new particleFire.Material({ color: 0xff4500 });

fireMat.setPerspective(camera.fov, window.innerHeight);

const fireMesh = new THREE.Points(fireGeo, fireMat);
fireMesh.position.set(-174, 62, 88);
scene.add(fireMesh);

const lavaTexture = textureLoader.load("lava.jpg");
const lavaMaterial = new THREE.MeshStandardMaterial({
  map: lavaTexture,
  emissive: new THREE.Color(0xff4500),
  emissiveIntensity: 0.2,
});

const lavaCircle = new THREE.Mesh(
  new THREE.CircleGeometry(13, 64),
  lavaMaterial
);

lavaCircle.rotation.x = -Math.PI / 2;
lavaCircle.position.set(-174, 58, 88);
scene.add(lavaCircle);

const lavaLight = new THREE.PointLight(0xff4500, 5, 200);
lavaLight.position.set(-174, 58, 88);
lavaLight.castShadow = true;
scene.add(lavaLight);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(lavaCircle);

  if (intersects.length > 0 && intersects[0].object === lavaCircle) {
    console.log("Lava clicked");
    ejectLava(intersects[0].point);
    lavaLight.intensity = 50;
    setTimeout(() => {
      lavaLight.intensity = 5;
    }, 2000);
  }
});

const lavaSpheres = [];

function ejectLava(position) {
  const sphereGeo = new THREE.SphereGeometry(3, 16, 16);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0xff4500,
    emissive: 0xff2200,
  });

  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  sphereMesh.castShadow = true;
  sphereMesh.receiveShadow = true;
  scene.add(sphereMesh);

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

  world.addBody(sphereBody);
  lavaSpheres.push({ mesh: sphereMesh, body: sphereBody });
}

// Lighting

const lightningProps = { on: true };

// sun orbit
const sunOrbitRadius = 350;
const sunCenter = new THREE.Vector3(0, 0, 0);
const dayColor = new THREE.Color(0xf0f8ff);
const nightColor = new THREE.Color(0x809fff);

const sun = new THREE.DirectionalLight(dayColor, 2);
sun.position.set(5, 350, 350);
sun.castShadow = true;

sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;

const d = 800;
sun.shadow.camera.left = -d;
sun.shadow.camera.right = d;
sun.shadow.camera.top = d;
sun.shadow.camera.bottom = -d;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 1000;

scene.add(sun);

const helper3 = new THREE.CameraHelper(sun.shadow.camera);
scene.add(helper3);

const helper = new THREE.DirectionalLightHelper(sun, 10, 0xff0000);
scene.add(helper);

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const lightning = new THREE.PointLight(0x271fa0, 50, 1500);
lightning.position.set(400, 230, 0);
lightning.castShadow = true;
scene.add(lightning);

const helper2 = new THREE.PointLightHelper(lightning, 10, 0xff0000);
scene.add(helper2);

const lightningArea = {
  minX: -400,
  maxX: 400,
  minZ: -400,
  maxZ: 400,
};

setInterval(() => {
  if (lightningProps.on) {
    lightning.intensity = Math.random() > 0.08 ? 0 : 15;
    lightning.position.set(
      Math.random() * (lightningArea.maxX - lightningArea.minX) +
        lightningArea.minX,
      300 + Math.random() * 30,
      Math.random() * (lightningArea.maxZ - lightningArea.minZ) +
        lightningArea.minZ
    );
  } else {
    lightning.intensity = 0;
  }
}, 200);

/*





*/
// GUI
const gui = new dat.GUI();
gui.close();

const guiControls = {
  orbitSpeed: 0.00002,
  showHelpers: true,
};

const windFolder = gui.addFolder("Wind");

windFolder.add(windSettings, "x", -1, 1, 0.01).name("Wind X");
windFolder.add(windSettings, "z", -1, 1, 0.01).name("Wind Z");
windFolder.add(windSettings, "speed", 0, 5, 0.1).name("Wind Speed");
windFolder.close();

gui
  .add(rainProps, "enabled")
  .name("Rain On/Off")
  .onChange((value) => {
    if (value) {
      scene.add(rain);
    } else {
      scene.remove(rain);
    }
  });

gui
  .add(guiControls, "showHelpers")
  .name("Toggle Helpers")
  .onChange((value) => {
    helper.visible = value;
    helper2.visible = value;
    helper3.visible = value;
  });

gui
  .add(guiControls, "orbitSpeed", 0.00005, 0.001)
  .step(0.00001)
  .name("Sun Orbit Speed");

const cameraInfo = { status: "" };
gui.add(cameraInfo, "status").name("Camera").listen();

const folderWater = gui.addFolder("Water Settings");
gui.add(lightningProps, "on").name("Lightning");

folderWater
  .addColor(waterProperties, "waterColor")
  .name("Water Color")
  .onChange(updateWater);
folderWater
  .add(water.material.uniforms["distortionScale"], "value", 0, 10)
  .name("Distortion");
folderWater
  .add(water.material.uniforms["size"], "value", 0.1, 10)
  .name("Wave Size");
folderWater
  .add(waterProperties, "waterAlpha", 0, 1)
  .name("Opacity")
  .onChange((v) => {
    water.material.uniforms["alpha"].value = v;
  });

folderWater.add(water.material.uniforms["time"], "value", 0, 1000).name("Time");
folderWater
  .add({ speed: waterProperties.waterDelta }, "speed", 0, 1)
  .onChange((v) => (waterProperties.waterDelta = v))
  .name("Animation Speed");

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
  const delta = clock.getDelta();
  world.step(1 / 60, delta);

  controls.update();
  renderer.render(scene, camera);
  water.material.uniforms["time"].value += waterProperties.waterDelta;
  water.material.uniforms["distortionScale"].value = waterProperties.distortion;
  water.material.uniforms["size"].value = waterProperties.wavseSize;
  water.material.uniforms["alpha"].value = waterProperties.waterAlpha;

  // const dt = clock.getDelta();
  // updateRain(dt);

  requestAnimationFrame(animate);

  fireMat.update(delta / 2);

  lavaSpheres.forEach(({ mesh, body }) => {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  });

  const pos = rain.geometry.attributes.position.array;

  for (let i = 0; i < rainCount; i++) {
    const idx = i * 3;

    pos[idx + 0] += windSettings.x * windSettings.speed;
    pos[idx + 1] -= velocities[i].y;
    pos[idx + 2] += windSettings.z * windSettings.speed;

    if (pos[idx + 1] < -50) {
      pos[idx + 0] = Math.random() * 800 - 400;
      pos[idx + 1] = Math.random() * 500 + 100;
      pos[idx + 2] = Math.random() * 800 - 400;

      velocities[i].x = wind.x + (Math.random() - 0.5) * 0.1;
      velocities[i].y = Math.random() * 0.2 + 0.4;
      velocities[i].z = wind.z + (Math.random() - 0.5) * 0.1;
    }
  }

  rain.geometry.attributes.position.needsUpdate = true;

  const elapsedTime = performance.now() * guiControls.orbitSpeed;

  const t = clock.getElapsedTime(); // seconds since start

  treeInstances.forEach((tree) => {
    const phase = t * 3 + tree.userData.swayOffset;
    const tilt =
      Math.sin(phase) * 0.15 * windSettings.speed * tree.userData.swayAmplitude;

    tree.rotation.x = tilt * windSettings.z;
    tree.rotation.z = tilt * windSettings.x;
  });

  const sunX = Math.cos(elapsedTime) * sunOrbitRadius;
  const sunZ = Math.sin(elapsedTime) * sunOrbitRadius;
  const sunY = Math.sin(elapsedTime) * sunOrbitRadius;

  sun.position.set(sunX, sunY, sunZ);

  sun.target.position.set(0, 0, 0);
  sun.target.updateMatrixWorld();

  const heightRatio = Math.max(0, sunY / (sunOrbitRadius * 0.5)); // 0 to 1

  sun.intensity = THREE.MathUtils.lerp(0.2, 1.2, heightRatio);
  ambient.intensity = THREE.MathUtils.lerp(0.2, 0.35, heightRatio);

  sun.color.copy(nightColor).lerp(dayColor, heightRatio);

  helper3.update();
  helper.update();

  cameraInfo.status =
    `pos(${camera.position.x.toFixed(2)},${camera.position.y.toFixed(
      2
    )},${camera.position.z.toFixed(2)}) ` +
    `ang(${THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()).toFixed(
      1
    )},${THREE.MathUtils.radToDeg(controls.getPolarAngle()).toFixed(1)})`;
}

animate();
