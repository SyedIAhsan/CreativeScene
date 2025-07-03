import { CONFIG } from "./config.js";

export class TerrainManager {
  constructor(scene, textureLoader) {
    this.scene = scene;
    this.textureLoader = textureLoader;
    this.terrain = null;
    this.treeInstances = [];
    this.heightMap = null;
  }

  async initialize() {
    return new Promise((resolve) => {
      this.heightMap = this.textureLoader.load("image6.png", () => {
        this.cacheCanvas(this.heightMap);
        this.buildTerrain();
        resolve();
      });
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
    if (this.terrain) {
      this.terrain.geometry.dispose();
      this.terrain.material.dispose();
      this.scene.remove(this.terrain);
    }

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
  }

  updateTreeSway(windSettings, elapsedTime) {
    this.treeInstances.forEach((tree) => {
      const phase = elapsedTime * 3 + tree.userData.swayOffset;
      const tilt =
        Math.sin(phase) *
        0.15 *
        windSettings.speed *
        tree.userData.swayAmplitude;

      tree.rotation.x = tilt * windSettings.z;
      tree.rotation.z = tilt * windSettings.x;
    });
  }

  getTerrain() {
    return this.terrain;
  }

  getTreeInstances() {
    return this.treeInstances;
  }
}
