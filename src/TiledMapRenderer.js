/**
 * TiledMapRenderer.js
 * A module for loading and rendering Tiled maps with animated tiles
 */

class TiledMapRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.map = null;
    this.tilesets = [];
    this.tilesetImages = {};
    this.animationFrames = {};
    this.animationTimers = {};
    this.loaded = false;
    this.lastFrameTime = 0;
    
    // Constants for animation
    this.WATER_TILES_PER_ROW = 7;
    this.LAND_TILES_PER_ROW = 25;
    this.DEFAULT_FRAME_DURATION = 150;
  }

  /**
   * Load a Tiled map and all its associated tilesets
   * @param {string} mapPath - Path to the map JSON file
   * @returns {Promise} - Resolves when all assets are loaded
   */
  async loadMap(mapPath) {
    try {
      // Load the map JSON
      const mapResponse = await fetch(mapPath);
      this.map = await mapResponse.json();
      
      // Resize the canvas to match the map dimensions
      this.canvas.width = this.map.width * this.map.tilewidth;
      this.canvas.height = this.map.height * this.map.tileheight;
      
      // Load each tileset
      const tilesetPromises = this.map.tilesets.map(async (tilesetRef) => {
        // If the tileset has a source attribute, load the external tileset
        if (tilesetRef.source) {
          const tilesetPath = this.resolvePath(mapPath, tilesetRef.source);
          const tilesetResponse = await fetch(tilesetPath);
          const tileset = await tilesetResponse.json();
          
          // Combine the external tileset data with the firstgid from the map
          tileset.firstgid = tilesetRef.firstgid;
          
          // Store the tileset
          this.tilesets.push(tileset);
          
          // Load the tileset image
          await this.loadTilesetImage(mapPath, tileset);
          
          // Process any animated tiles in this tileset
          this.processAnimatedTiles(tileset);
        } else {
          // The tileset is embedded in the map
          this.tilesets.push(tilesetRef);
          
          // Load the tileset image
          await this.loadTilesetImage(mapPath, tilesetRef);
          
          // Process any animated tiles in this tileset
          this.processAnimatedTiles(tilesetRef);
        }
      });
      
      // Wait for all tilesets to load
      await Promise.all(tilesetPromises);
      
      // Setup specific animations after tilesets are loaded
      this.setupSpecificAnimations();
      
      this.loaded = true;
      console.log('Map loaded:', this.map.width, 'x', this.map.height);
      console.log('Tilesets loaded:', this.tilesets.length);
      console.log('Animated tiles:', Object.keys(this.animationFrames).length);
      
      // Initialize animation timers
      Object.keys(this.animationFrames).forEach(tileId => {
        this.animationTimers[tileId] = {
          currentFrame: 0,
          elapsed: 0
        };
      });
      
      return true;
    } catch (error) {
      console.error('Error loading map:', error);
      return false;
    }
  }
  
  /**
   * Setup specific animations based on the tilesets we have
   */
  setupSpecificAnimations() {
    // Find the water tileset
    const waterTileset = this.tilesets.find(tileset => 
      tileset.name === 'water-2' || 
      (tileset.image && tileset.image.includes('water.png'))
    );
    
    // Find the land tileset
    const landTileset = this.tilesets.find(tileset => 
      tileset.name === 'Tileset Grass Spring' || 
      (tileset.image && tileset.image.includes('Tileset Grass Spring.png'))
    );
    
    if (waterTileset) {
      // Water animation - 7 frames, horizontal strip
      const waterFirstGid = waterTileset.firstgid;
      
      // Animate all water tiles
      for (let i = 0; i < waterTileset.tilecount; i++) {
        const globalId = waterFirstGid + i;
        
        // Create animation for this tile if it doesn't already have one
        if (!this.animationFrames[globalId]) {
          this.animationFrames[globalId] = [];
          
          // Add all frames in sequence (7 frames for water animation)
          for (let frame = 0; frame < this.WATER_TILES_PER_ROW; frame++) {
            this.animationFrames[globalId].push({
              tileId: waterFirstGid + frame,
              duration: this.DEFAULT_FRAME_DURATION
            });
          }
        }
      }
      
      console.log('Water animations set up');
    }
    
    if (landTileset) {
      // Land animations - based on Tileset Grass Spring
      const landFirstGid = landTileset.firstgid;
      
      // Water-related tile animations from the land tileset
      // Based on the provided JSON, these are around 150, 175, 182, 204, 227, 277
      
      // Animation for water base (ID 150-156)
      this.setupAnimationSequence(landFirstGid + 150, [0, 2, 4, 6], this.DEFAULT_FRAME_DURATION);
      
      // Animation for flowing water (ID 175-182)
      this.setupAnimationSequence(landFirstGid + 175, [0, 2, 4, 6], this.DEFAULT_FRAME_DURATION);
      this.setupAnimationSequence(landFirstGid + 176, [0, 2, 4, 6], this.DEFAULT_FRAME_DURATION);
      
      // Animation for deep water (ID 200-210)
      this.setupAnimationSequence(landFirstGid + 204, [0, 3, 6], this.DEFAULT_FRAME_DURATION);
      
      // Animation for water edges (ID 225-236)
      this.setupAnimationSequence(landFirstGid + 227, [0, 3, 6], this.DEFAULT_FRAME_DURATION);
      
      // Extra animation on ID 277
      this.setupAnimationSequence(landFirstGid + 277, [0, 3, 6, 9], this.DEFAULT_FRAME_DURATION);
      
      console.log('Land animations set up');
    }
  }
  
  /**
   * Setup an animation sequence with offsets
   */
  setupAnimationSequence(baseId, frameOffsets, duration) {
    this.animationFrames[baseId] = frameOffsets.map(offset => ({
      tileId: baseId + offset,
      duration: duration
    }));
  }
  
  /**
   * Resolve a relative path based on a base path
   */
  resolvePath(basePath, relativePath) {
    const baseDir = basePath.substring(0, basePath.lastIndexOf('/') + 1);
    return baseDir + relativePath;
  }
  
  /**
   * Load a tileset image
   */
  async loadTilesetImage(mapPath, tileset) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.tilesetImages[tileset.name] = img;
        resolve();
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load tileset image: ${tileset.image}`));
      };
      
      // If the image path is relative, resolve it against the map path
      if (tileset.image && !tileset.image.startsWith('http') && !tileset.image.startsWith('/')) {
        img.src = this.resolvePath(mapPath, tileset.image);
      } else {
        img.src = tileset.image;
      }
    });
  }
  
  /**
   * Process animated tiles in a tileset
   */
  processAnimatedTiles(tileset) {
    if (!tileset.tiles) return;
    
    tileset.tiles.forEach(tile => {
      if (tile.animation) {
        // Calculate the global ID for this tile
        const globalId = tileset.firstgid + tile.id;
        
        // Store the animation frames
        this.animationFrames[globalId] = tile.animation.map(frame => ({
          tileId: tileset.firstgid + frame.tileid,
          duration: frame.duration
        }));
      }
    });
  }
  
  /**
   * Get the tileset that contains a specific tile ID
   */
  getTilesetForTile(tileId) {
    // Find the tileset that contains this tile ID
    for (let i = this.tilesets.length - 1; i >= 0; i--) {
      const tileset = this.tilesets[i];
      if (tileId >= tileset.firstgid) {
        return tileset;
      }
    }
    return null;
  }
  
  /**
   * Render a single frame of the map
   */
  render(timestamp) {
    if (!this.loaded) return;
    
    // Calculate time delta
    const delta = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    
    // Update animation timers
    this.updateAnimations(delta);
    
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render each layer
    this.map.layers.forEach(layer => {
      if (layer.type === 'tilelayer' && layer.visible) {
        this.renderTileLayer(layer);
      }
    });
  }
  
  /**
   * Update all animation states
   */
  updateAnimations(delta) {
    Object.keys(this.animationTimers).forEach(tileId => {
      const animation = this.animationFrames[tileId];
      const timer = this.animationTimers[tileId];
      
      timer.elapsed += delta;
      
      // Check if it's time to advance to the next frame
      const currentFrameDuration = animation[timer.currentFrame].duration;
      if (timer.elapsed >= currentFrameDuration) {
        timer.elapsed -= currentFrameDuration;
        timer.currentFrame = (timer.currentFrame + 1) % animation.length;
      }
    });
  }
  
  /**
   * Render a single tile layer
   */
  renderTileLayer(layer) {
    const { width, height, tilewidth, tileheight } = this.map;
    
    // Calculate the layer opacity
    const opacity = layer.opacity !== undefined ? layer.opacity : 1;
    this.ctx.globalAlpha = opacity;
    
    // Iterate through each tile in the layer
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Get the tile index
        const index = y * width + x;
        
        // Get the tile ID at this position
        let tileId = layer.data[index];
        
        // Skip empty tiles (0 means no tile)
        if (tileId === 0) continue;
        
        // Check if this tile is animated
        if (this.animationFrames[tileId]) {
          const animation = this.animationFrames[tileId];
          const timer = this.animationTimers[tileId];
          
          // Use the current frame's tile ID instead
          tileId = animation[timer.currentFrame].tileId;
        }
        
        // Draw the tile
        this.drawTile(tileId, x * tilewidth, y * tileheight);
      }
    }
    
    // Reset opacity
    this.ctx.globalAlpha = 1;
  }
  
  /**
   * Draw a single tile at the specified position
   */
  drawTile(tileId, x, y) {
    // Get the tileset that contains this tile
    const tileset = this.getTilesetForTile(tileId);
    if (!tileset) return;
    
    // Get the tileset image
    const image = this.tilesetImages[tileset.name];
    if (!image) return;
    
    // Calculate the local ID within the tileset
    const localId = tileId - tileset.firstgid;
    
    // Determine the correct number of tiles per row
    let tilesPerRow = tileset.columns;
    if (tileset.name === 'water-2' || (tileset.image && tileset.image.includes('water.png'))) {
      tilesPerRow = this.WATER_TILES_PER_ROW;
    } else if (tileset.name === 'Tileset Grass Spring' || (tileset.image && tileset.image.includes('Tileset Grass Spring.png'))) {
      tilesPerRow = this.LAND_TILES_PER_ROW;
    }
    
    // Calculate the tile's position in the tileset image
    const sourceX = (localId % tilesPerRow) * tileset.tilewidth;
    const sourceY = Math.floor(localId / tilesPerRow) * tileset.tileheight;
    
    // Draw the tile
    this.ctx.drawImage(
      image,
      sourceX, sourceY,
      tileset.tilewidth, tileset.tileheight,
      x, y,
      tileset.tilewidth, tileset.tileheight
    );
  }
  
  /**
   * Start the animation loop
   */
  startAnimationLoop() {
    const animate = (timestamp) => {
      this.render(timestamp);
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }
  
  /**
   * Stop the animation loop
   */
  stopAnimationLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

export default TiledMapRenderer; 