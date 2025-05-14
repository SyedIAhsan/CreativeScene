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





*/
// Scene setup
const scene = new THREE.Scene();
const textureLoader = new THREE.TextureLoader();
scene.background = new THREE.Color(0xdddddd); // Light gray background
/*





*/
// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 5);
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
controls.maxDistance = 50;
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
// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
/*





*/
// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
light.castShadow = true;
scene.add(light);

const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);
/*





*/
// GUI
/*





*/
// Animation loop
const clock = new THREE.Clock();
function animate() {
  const delta = clock.getDelta(); // for future animation use
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
