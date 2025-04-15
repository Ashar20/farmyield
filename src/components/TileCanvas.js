import { useEffect, useRef, useState } from 'react';

const TileCanvas = () => {
  const canvasRef = useRef(null);
  const [mapData, setMapData] = useState(null);
  const [waterTileset, setWaterTileset] = useState(null);
  const [landTileset, setLandTileset] = useState(null);
  const [tilesetData, setTilesetData] = useState({ water: null, land: null });
  const [animationFrames, setAnimationFrames] = useState({});
  const [currentFrameTime, setCurrentFrameTime] = useState({});
  const [waterAnimFrame, setWaterAnimFrame] = useState(0);
  const [bubbleAnimFrame, setBubbleAnimFrame] = useState(0);
  const waterAnimTimeRef = useRef(0);
  const bubbleAnimTimeRef = useRef(0);
  const animationFrameRef = useRef();
  const lastTimeRef = useRef(0);

  const TILE_SIZE = 16;
  const WATER_TILES_PER_ROW = 7; // Water tileset has 7 tiles per row
  const LAND_TILES_PER_ROW = 25; // Land tileset has 25 tiles per row based on tileset data
  const WATER_FRAME_DURATION = 800; // Slow down the water animation to 800ms per frame
  const BUBBLE_FRAME_DURATION = 150; // Bubble animation is faster at 150ms per frame
  
  // Bubble position in tile coordinates
  const BUBBLE_POSITION = { x: 3, y: 3 };

  // Load map data and tilesets
  useEffect(() => {
    const loadMapAndTilesets = async () => {
      try {
        // Load map data from JSON
        const mapResponse = await fetch('/maps/farm-map.json');
        const mapData = await mapResponse.json();
        setMapData(mapData);

        // Extract tileset references from map data
        const waterTilesetRef = mapData.tilesets.find(tileset => tileset.firstgid === 1);
        const landTilesetRef = mapData.tilesets.find(tileset => tileset.firstgid === 8);

        if (!waterTilesetRef || !landTilesetRef) {
          console.error('Could not find tileset references in map data');
          return;
        }

        // Convert TSX paths to JSON paths
        const waterTilesetPath = `/maps/${waterTilesetRef.source.replace('../', '').replace('.tsx', '.json')}`;
        const landTilesetPath = `/maps/${landTilesetRef.source.replace('../', '').replace('.tsx', '.json')}`;

        // Load water tileset data
        const waterTilesetResponse = await fetch(waterTilesetPath);
        const waterTilesetData = await waterTilesetResponse.json();

        // Load land tileset data
        const landTilesetResponse = await fetch(landTilesetPath);
        const landTilesetData = await landTilesetResponse.json();

        setTilesetData({
          water: waterTilesetData,
          land: landTilesetData,
        });

        // Process animation data
        const animations = {};
        
        // Process water animations
        if (waterTilesetData.tiles) {
          waterTilesetData.tiles.forEach(tile => {
            if (tile.animation) {
              animations[tile.id + 1] = { // Add 1 for firstgid
                frames: tile.animation.map(frame => ({
                  tileid: frame.tileid,
                  duration: frame.duration
                })),
                currentFrame: 0,
                elapsedTime: 0
              };
            }
          });
        }
        
        // Process land animations (firstgid = 8)
        if (landTilesetData.tiles) {
          landTilesetData.tiles.forEach(tile => {
            if (tile.animation) {
              animations[tile.id + 8] = { // Add 8 for firstgid
                frames: tile.animation.map(frame => ({
                  tileid: frame.tileid,
                  duration: frame.duration
                })),
                currentFrame: 0,
                elapsedTime: 0
              };
            }
          });
        }
        
        setAnimationFrames(animations);

        // Initialize current frame times
        const frameTimes = {};
        Object.keys(animations).forEach(id => {
          frameTimes[id] = 0;
        });
        setCurrentFrameTime(frameTimes);

        // Load water tileset image
        const waterImg = new Image();
        const waterImagePath = '/tilesets/water.png';
        waterImg.src = waterImagePath;
        await new Promise((resolve, reject) => {
          waterImg.onload = resolve;
          waterImg.onerror = reject;
        });
        setWaterTileset(waterImg);

        // Load land tileset image
        const landImg = new Image();
        const landImagePath = '/tilesets/Tileset Grass Spring.png';
        landImg.src = landImagePath;
        await new Promise((resolve, reject) => {
          landImg.onload = resolve;
          landImg.onerror = reject;
        });
        setLandTileset(landImg);

      } catch (error) {
        console.error('Error loading resources:', error);
      }
    };

    loadMapAndTilesets();
  }, []);

  // Animation loop
  useEffect(() => {
    if (!mapData || !waterTileset || !landTileset) return;

    const animate = (timestamp) => {
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      
      // Update water animation frames
      waterAnimTimeRef.current += deltaTime;
      if (waterAnimTimeRef.current >= WATER_FRAME_DURATION) {
        waterAnimTimeRef.current -= WATER_FRAME_DURATION;
        setWaterAnimFrame(prev => (prev + 1) % WATER_TILES_PER_ROW);
      }
      
      // Update bubble animation frames at a faster rate
      bubbleAnimTimeRef.current += deltaTime;
      if (bubbleAnimTimeRef.current >= BUBBLE_FRAME_DURATION) {
        bubbleAnimTimeRef.current -= BUBBLE_FRAME_DURATION;
        setBubbleAnimFrame(prev => (prev + 1) % WATER_TILES_PER_ROW);
      }

      // Update tileset animations
      if (Object.keys(animationFrames).length > 0) {
        const updatedAnimationFrames = { ...animationFrames };
        const updatedFrameTimes = { ...currentFrameTime };

        Object.keys(updatedAnimationFrames).forEach(tileId => {
          const animation = updatedAnimationFrames[tileId];
          animation.elapsedTime += deltaTime;

          const frameDuration = animation.frames[animation.currentFrame].duration;
          if (animation.elapsedTime >= frameDuration) {
            animation.elapsedTime -= frameDuration;
            animation.currentFrame = (animation.currentFrame + 1) % animation.frames.length;
            updatedFrameTimes[tileId] = animation.currentFrame;
          }
        });

        setAnimationFrames(updatedAnimationFrames);
        setCurrentFrameTime(updatedFrameTimes);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mapData, waterTileset, landTileset, animationFrames, currentFrameTime]);

  // Draw a single tile
  const drawTile = (ctx, tileset, tileId, x, y, isWaterLayer) => {
    if (tileId === 0) return; // Skip empty tiles

    let sourceX, sourceY;
    
    if (isWaterLayer) {
      // Water tiles (1-7) from farm-map.json
      if (tileId === 7) { // Water tile ID 7 (with firstgid=1) corresponds to tile ID 6 in water-2.json
        // This is the animated water tile that cycles through frames 0-6
        sourceX = waterAnimFrame * TILE_SIZE;
        sourceY = 0;
      } else {
        // All other water tiles should use their static appearance
        // Tiles 1-6 correspond to the visual frame of the same index
        const adjustedId = tileId - 1; // Subtract firstgid to get 0-based index
        sourceX = adjustedId * TILE_SIZE;
        sourceY = 0;
      }
    } else {
      // Land tiles (starting at 8)
      // Check if the specific land tile is animated
      if (animationFrames[tileId]) {
        const animation = animationFrames[tileId];
        const currentFrameData = animation.frames[animation.currentFrame];
        const currentTileId = currentFrameData.tileid;
        
        // Land tiles animation
        sourceX = (currentTileId % LAND_TILES_PER_ROW) * TILE_SIZE;
        sourceY = Math.floor(currentTileId / LAND_TILES_PER_ROW) * TILE_SIZE;
      } else {
        // Non-animated land tiles
        const adjustedId = tileId - 8; // Subtract firstgid
        sourceX = (adjustedId % LAND_TILES_PER_ROW) * TILE_SIZE;
        sourceY = Math.floor(adjustedId / LAND_TILES_PER_ROW) * TILE_SIZE;
      }
    }

    ctx.drawImage(
      tileset,
      sourceX,
      sourceY,
      TILE_SIZE,
      TILE_SIZE,
      x * TILE_SIZE,
      y * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE
    );
  };
  
  // Draw the water bubble overlay
  const drawWaterBubble = (ctx) => {
    if (!waterTileset) return;
    
    // Draw a rapidly animating bubble at position (3, 3)
    ctx.drawImage(
      waterTileset,
      bubbleAnimFrame * TILE_SIZE, // Source X (cycle through frames)
      0,                         // Source Y
      TILE_SIZE,                 // Source width
      TILE_SIZE,                 // Source height
      BUBBLE_POSITION.x * TILE_SIZE, // Destination X
      BUBBLE_POSITION.y * TILE_SIZE, // Destination Y
      TILE_SIZE,                 // Destination width
      TILE_SIZE                  // Destination height
    );
  };

  // Render map
  useEffect(() => {
    if (!mapData || !waterTileset || !landTileset || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all layers in order
    mapData.layers.forEach(layer => {
      const isWaterLayer = layer.name === 'water';
      const tileset = isWaterLayer ? waterTileset : landTileset;

      for (let y = 0; y < layer.height; y++) {
        for (let x = 0; x < layer.width; x++) {
          const tileId = layer.data[y * layer.width + x];
          drawTile(ctx, tileset, tileId, x, y, isWaterLayer);
        }
      }
    });
    
    // Draw the water bubble overlay after all map layers
    drawWaterBubble(ctx);
    
  }, [mapData, waterTileset, landTileset, animationFrames, currentFrameTime, waterAnimFrame, bubbleAnimFrame]);

  if (!mapData || !waterTileset || !landTileset) return <div>Loading...</div>;

  return (
    <canvas
      ref={canvasRef}
      width={mapData.width * TILE_SIZE}
      height={mapData.height * TILE_SIZE}
      style={{
        border: '1px solid #ddd',
        imageRendering: 'pixelated'
      }}
    />
  );
};

export default TileCanvas; 