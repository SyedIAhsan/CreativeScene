import { CONFIG } from "./config.js";

export class LavaManager {
  constructor(scene, textureLoader, world, camera) {
    this.scene = scene;
    this.textureLoader = textureLoader;
    this.world = world;
    this.camera = camera;
    this.fireMesh = null;
    this.fireMat = null;
    this.lavaCircle = null;
    this.lavaSpheres = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  async initialize() {
    await this.setupFire();
    this.setupLavaCircle();
    this.setupClickHandler();
  }

  async setupFire() {
    try {
      const particleFire = await import("https://esm.sh/three-particle-fire");
      particleFire.install({ THREE: THREE });

      const fireGeo = new particleFire.Geometry(
        CONFIG.lava.fireRadius,
        CONFIG.lava.fireHeight,
        CONFIG.lava.particleCount
      );

      this.fireMat = new particleFire.Material({ color: 0xff4500 });
      this.fireMat.setPerspective(this.camera.fov, window.innerHeight);

      this.fireMesh = new THREE.Points(fireGeo, this.fireMat);
      this.fireMesh.position.set(
        CONFIG.lava.position.x,
        CONFIG.lava.position.y,
        CONFIG.lava.position.z
      );
      this.scene.add(this.fireMesh);
    } catch (error) {
      console.error("Failed to load fire particles:", error);
    }
  }

  setupLavaCircle() {
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
  }

  setupClickHandler() {
    window.addEventListener("click", (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.lavaCircle);

      if (intersects.length > 0 && intersects[0].object === this.lavaCircle) {
        console.log("Lava clicked");
        this.ejectLava(intersects[0].point);
        this.intensifyLavaLight();
      }
    });
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

    // Only add physics if CANNON is available
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
      // Fallback: just add the visual mesh without physics
      this.lavaSpheres.push({ mesh: sphereMesh, body: null });
    }
  }

  intensifyLavaLight() {
    // This will be called by the lighting manager
    // The actual intensity change is handled in the lighting module
  }

  update(deltaTime) {
    if (this.fireMat) {
      this.fireMat.update(deltaTime / 2);
    }

    this.lavaSpheres.forEach(({ mesh, body }) => {
      if (body) {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      }
    });
  }

  getLavaCircle() {
    return this.lavaCircle;
  }

  getLavaSpheres() {
    return this.lavaSpheres;
  }
}
