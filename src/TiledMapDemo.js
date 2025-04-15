/**
 * TiledMapDemo.js
 * A demo implementation of the TiledMapRenderer
 */

import TiledMapRenderer from './TiledMapRenderer';

class TiledMapDemo {
  constructor(canvasId) {
    // Get the canvas element
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error('Canvas element not found:', canvasId);
      return;
    }
    
    // Create the renderer
    this.renderer = new TiledMapRenderer(this.canvas);
    
    // Add a border to the canvas
    this.canvas.style.border = '1px solid #ccc';
  }
  
  /**
   * Initialize the demo
   * @param {string} mapPath - Path to the map JSON file
   */
  async init(mapPath) {
    try {
      console.log('Loading map:', mapPath);
      
      // Load the map
      const success = await this.renderer.loadMap(mapPath);
      
      if (success) {
        console.log('Map loaded successfully');
        
        // Start the animation loop
        this.renderer.startAnimationLoop();
        
        return true;
      } else {
        console.error('Failed to load the map');
        return false;
      }
    } catch (error) {
      console.error('Error initializing the demo:', error);
      return false;
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this.renderer) {
      this.renderer.stopAnimationLoop();
    }
  }
}

export default TiledMapDemo; 