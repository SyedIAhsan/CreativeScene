// @ts-check

// Modular Three.js Creative Scene
// This is the refactored version of the original script.js
// All functionality has been organized into separate modules for better maintainability

import { SceneManager } from "./modules/scene.js";

// Main application class
class CreativeSceneApp {
  constructor() {
    this.sceneManager = null;
  }

  async initialize() {
    try {
      console.log("Initializing Creative Scene...");

      // Create and initialize the scene manager
      this.sceneManager = new SceneManager();
      await this.sceneManager.initialize();

      console.log("Scene initialized successfully!");

      // Start the animation loop
      this.sceneManager.animate();
    } catch (error) {
      console.error("Failed to initialize scene:", error);
    }
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
  if (appInstance && appInstance.sceneManager) {
    const camera = appInstance.sceneManager.getCamera();
    const renderer = appInstance.sceneManager.getRenderer();

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});
