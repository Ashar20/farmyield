import { useEffect, useRef, useState, useCallback } from 'react';

const LandMapCanvas = () => {
  const canvasRef = useRef(null);
  const [mapData, setMapData] = useState(null);
  const [tileset, setTileset] = useState(null);
  const [characterIdleSprite, setCharacterIdleSprite] = useState(null);
  const [characterWalkSprite, setCharacterWalkSprite] = useState(null);
  const [animationFrames, setAnimationFrames] = useState({});
  const [currentFrames, setCurrentFrames] = useState({});
  const [characterFrame, setCharacterFrame] = useState(0);
  const [characterPosition, setCharacterPosition] = useState({ x: 35, y: 24 }); // Position on the land area
  const [characterDirection, setCharacterDirection] = useState('down'); // Default facing down
  const [isWalking, setIsWalking] = useState(false);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef();
  const lastTimeRef = useRef(0);
  const characterFrameTimeRef = useRef(0);
  const movementTimeRef = useRef(0);
  const keyPressedRef = useRef({});

  const TILE_SIZE = 16;
  const TILES_PER_ROW = 25; // Tileset Grass Spring.png has 25 tiles per row
  const DEFAULT_FRAME_DURATION = 150;
  const CHARACTER_FRAME_DURATION = 150; // ms per character animation frame
  const MOVEMENT_COOLDOWN = 150; // ms between movements (increased for better control)
  const CHARACTER_FRAMES = 4; // 4 frames in the idle/walk animation
  const CHARACTER_WIDTH = 32; // Character sprite width is 32px
  const CHARACTER_HEIGHT = 32; // Character sprite height is 32px
  const VIEWPORT_WIDTH = 800; // Fixed viewport width
  const VIEWPORT_HEIGHT = 600; // Fixed viewport height

  // Direction row mapping for the Walk.png spritesheet
  const DIRECTION_ROWS = {
    'down': 0,
    'left': 1,
    'right': 2,
    'up': 3
  };

  // Check if a position is valid for movement
  const isValidPosition = useCallback((position) => {
    if (!mapData) return false;
    
    // Check map boundaries
    if (position.x < 0 || position.x >= mapData.width || 
        position.y < 0 || position.y >= mapData.height) {
      console.log("Position out of bounds:", position);
      return false;
    }
    
    // Get the tile index for this position
    const tileIndex = position.y * mapData.width + position.x;
    
    // Find the land layer
    const landLayer = mapData.layers.find(layer => 
      layer.name && layer.name.toLowerCase().includes('land') && layer.visible);
    
    // Find water layers or non-walkable layers
    const waterLayer = mapData.layers.find(layer => 
      layer.name && layer.name.toLowerCase().includes('water') && layer.visible);
    
    // Find building or obstacle layers
    const buildingLayer = mapData.layers.find(layer => 
      layer.name && (layer.name.toLowerCase().includes('farm') || 
       layer.name.toLowerCase().includes('hous') || 
       layer.name.toLowerCase().includes('obstacle')) && layer.visible);
    
    // Check water layer - don't allow walking on water
    if (waterLayer && waterLayer.data[tileIndex] !== 0) {
      // Exception: tile ID 62 is walkable grass
      const tileId = waterLayer.data[tileIndex];
      if (tileId !== 62) {
        console.log("Water detected at position:", position, "Tile ID:", tileId);
        return false;
      }
    }
    
    // Check if there's a blocking object like buildings
    if (buildingLayer && buildingLayer.data[tileIndex] !== 0) {
      console.log("Building detected at position:", position);
      return false;
    }
    
    // If land layer exists, check if position has a valid land tile (ID 62 is walkable grass)
    if (landLayer) {
      const tileId = landLayer.data[tileIndex];
      // Allow walking on grass (tile ID 62) or empty tiles (for layers with partial coverage)
      if (tileId !== 0 && tileId !== 62) {
        // Special case for edges and transitions that are actually walkable
        const walkableTileIds = [62]; // Add other walkable IDs as needed
        if (!walkableTileIds.includes(tileId)) {
          console.log("Non-walkable land at position:", position, "Tile ID:", tileId);
          return false;
        }
      }
    }
    
    // If no problems found, position is valid
    return true;
  }, [mapData]); // Dependency: mapData

  // Draw the map - Define this BEFORE any useEffect that depends on it
  const drawMap = useCallback(() => {
    if (!mapData || !canvasRef.current || !tileset) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = VIEWPORT_WIDTH;
    canvas.height = VIEWPORT_HEIGHT;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const mapWidth = mapData.width;
    const mapHeight = mapData.height;
    const firstGid = mapData.tilesets[0].firstgid || 1;

    const startTileX = Math.floor(viewportOffset.x / TILE_SIZE);
    const startTileY = Math.floor(viewportOffset.y / TILE_SIZE);
    const endTileX = Math.min(startTileX + Math.ceil(VIEWPORT_WIDTH / TILE_SIZE) + 1, mapWidth);
    const endTileY = Math.min(startTileY + Math.ceil(VIEWPORT_HEIGHT / TILE_SIZE) + 1, mapHeight);

    mapData.layers.forEach(layer => {
      if (layer.type === 'tilelayer' && layer.visible) {
        const data = layer.data;
        for (let y = startTileY; y < endTileY; y++) {
          for (let x = startTileX; x < endTileX; x++) {
            const tileIndex = y * mapWidth + x;
            const tileId = data[tileIndex];
            if (tileId === 0) continue;
            let sourceX, sourceY;
            if (animationFrames[tileId] && currentFrames[tileId] !== undefined) {
              const animation = animationFrames[tileId];
              const currentFrameIndex = animation.currentFrame;
              const frameTileId = animation.frames[currentFrameIndex].tileid;
              sourceX = (frameTileId % TILES_PER_ROW) * TILE_SIZE;
              sourceY = Math.floor(frameTileId / TILES_PER_ROW) * TILE_SIZE;
            } else {
              const localTileId = tileId - firstGid;
              sourceX = (localTileId % TILES_PER_ROW) * TILE_SIZE;
              sourceY = Math.floor(localTileId / TILES_PER_ROW) * TILE_SIZE;
            }
            const screenX = (x * TILE_SIZE) - viewportOffset.x;
            const screenY = (y * TILE_SIZE) - viewportOffset.y;
            if (screenX > -TILE_SIZE && screenX < VIEWPORT_WIDTH && screenY > -TILE_SIZE && screenY < VIEWPORT_HEIGHT) {
              ctx.drawImage(tileset, sourceX, sourceY, TILE_SIZE, TILE_SIZE, screenX, screenY, TILE_SIZE, TILE_SIZE);
            }
          }
        }
      }
    });

    if (characterIdleSprite && characterWalkSprite) {
      const sprite = isWalking ? characterWalkSprite : characterIdleSprite;
      let sourceX, sourceY;
      if (isWalking) {
        sourceX = (characterFrame % 6) * CHARACTER_WIDTH;
        sourceY = DIRECTION_ROWS[characterDirection] * CHARACTER_HEIGHT;
      } else {
        sourceX = (characterFrame % 4) * CHARACTER_WIDTH;
        sourceY = 0;
      }
      const characterScreenX = (characterPosition.x * TILE_SIZE) - viewportOffset.x - (CHARACTER_WIDTH - TILE_SIZE) / 2;
      const characterScreenY = (characterPosition.y * TILE_SIZE) - viewportOffset.y - (CHARACTER_HEIGHT - TILE_SIZE);
      ctx.drawImage(sprite, sourceX, sourceY, CHARACTER_WIDTH, CHARACTER_HEIGHT, characterScreenX, characterScreenY, CHARACTER_WIDTH, CHARACTER_HEIGHT);

      // Only check window.location on client-side
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 300, 90);
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.fillText(`Position: (${characterPosition.x}, ${characterPosition.y})`, 20, 30);
        ctx.fillText(`Direction: ${characterDirection}`, 20, 50);
        ctx.fillText(`Viewport: (${viewportOffset.x}, ${viewportOffset.y})`, 20, 70);
        ctx.fillText(`Keys: ${Object.keys(keyPressedRef.current).filter(k => keyPressedRef.current[k]).join(', ')}`, 20, 90);
      }
    }
  }, [mapData, tileset, viewportOffset, animationFrames, currentFrames, characterIdleSprite, characterWalkSprite, isWalking, characterFrame, characterDirection, characterPosition, DIRECTION_ROWS]); // Added DIRECTION_ROWS dependency

  // Handle continuous movement when keys are held down
  const handleContinuousMovement = useCallback(() => {
    if (!mapData) return false;
    
    let newPosition = { ...characterPosition };
    let moving = false;
    let direction = characterDirection;

    // Directly check key states
    if (keyPressedRef.current.ArrowUp || keyPressedRef.current.w) {
      newPosition = { x: characterPosition.x, y: Math.max(0, characterPosition.y - 1) };
      direction = 'up';
      moving = true;
    } 
    else if (keyPressedRef.current.ArrowDown || keyPressedRef.current.s) {
      newPosition = { x: characterPosition.x, y: Math.min(mapData.height - 1, characterPosition.y + 1) };
      direction = 'down';
      moving = true;
    } 
    else if (keyPressedRef.current.ArrowLeft || keyPressedRef.current.a) {
      newPosition = { x: Math.max(0, characterPosition.x - 1), y: characterPosition.y };
      direction = 'left';
      moving = true;
    } 
    else if (keyPressedRef.current.ArrowRight || keyPressedRef.current.d) {
      newPosition = { x: Math.min(mapData.width - 1, characterPosition.x + 1), y: characterPosition.y };
      direction = 'right';
      moving = true;
    }

    if (moving) {
      if (!isWalking) setIsWalking(true);
      if (direction !== characterDirection) setCharacterDirection(direction);
      
      const tileIndex = newPosition.y * mapData.width + newPosition.x;
      const landLayer = mapData.layers.find(layer => layer.name?.toLowerCase().includes('land') && layer.visible);
      let forceAllow = false;
      if (landLayer && landLayer.data[tileIndex] === 62) forceAllow = true;
      
      if (forceAllow || isValidPosition(newPosition)) {
        setCharacterPosition(newPosition);
      } else {
        console.log("Invalid move attempted to:", newPosition);
      }
      return true;
    } else if (isWalking) {
      setIsWalking(false);
    }
    return false;
  }, [mapData, characterPosition, characterDirection, isWalking, isValidPosition]);
  
  // Load map data and tilesets
  useEffect(() => {
    const loadMapAndTilesets = async () => {
      try {
        // Load map data from basemap.json
        const mapResponse = await fetch('/maps/basemap.json');
        const mapData = await mapResponse.json();
        setMapData(mapData);
        console.log("Map data loaded successfully", mapData.width, mapData.height);

        // Load tileset image - using Tileset Grass Spring.png for all tiles
        const tilesetImg = new Image();
        tilesetImg.src = '/tilesets/Tileset Grass Spring.png';
        await new Promise((resolve) => {
          tilesetImg.onload = resolve;
        });
        setTileset(tilesetImg);
        console.log("Tileset loaded successfully");

        // Load character idle sprite
        const idleImg = new Image();
        idleImg.src = '/movements/Idle.png';
        await new Promise((resolve) => {
          idleImg.onload = resolve;
        });
        setCharacterIdleSprite(idleImg);
        console.log("Idle sprite loaded successfully");

        // Load character walk sprite
        const walkImg = new Image();
        walkImg.src = '/movements/Walk.png';
        await new Promise((resolve) => {
          walkImg.onload = resolve;
        });
        setCharacterWalkSprite(walkImg);
        console.log("Walk sprite loaded successfully");

        // Load tileset data for animations
        const tilesetResponse = await fetch('/tilesets/Tileset Grass Spring.json');
        const tilesetData = await tilesetResponse.json();

        // Process animation data
        const animations = {};
        const frames = {};

        // Process animations
        if (tilesetData.tiles) {
          tilesetData.tiles.forEach(tile => {
            if (tile.animation) {
              const tileId = tile.id + 1; // Add firstgid
              animations[tileId] = {
                frames: tile.animation,
                currentFrame: 0,
                elapsed: 0
              };
              frames[tileId] = 0;
            }
          });
        }

        setAnimationFrames(animations);
        setCurrentFrames(frames);
      } catch (error) {
        console.error('Error loading resources:', error);
      }
    };

    loadMapAndTilesets();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update viewport when character position changes
  useEffect(() => {
    if (!mapData) return;

    // Calculate the center of the viewport in pixels
    const viewportCenterX = VIEWPORT_WIDTH / 2;
    const viewportCenterY = VIEWPORT_HEIGHT / 2;

    // Calculate the desired position of the character on screen (center)
    const targetX = characterPosition.x * TILE_SIZE;
    const targetY = characterPosition.y * TILE_SIZE;

    // Calculate the offset needed to center the character
    let offsetX = Math.floor(targetX - viewportCenterX);
    let offsetY = Math.floor(targetY - viewportCenterY);

    // Clamp the offset to prevent showing beyond map edges
    const maxOffsetX = Math.max(0, mapData.width * TILE_SIZE - VIEWPORT_WIDTH);
    const maxOffsetY = Math.max(0, mapData.height * TILE_SIZE - VIEWPORT_HEIGHT);

    offsetX = Math.max(0, Math.min(offsetX, maxOffsetX));
    offsetY = Math.max(0, Math.min(offsetY, maxOffsetY));

    // Update the viewport offset
    setViewportOffset({ x: offsetX, y: offsetY });
  }, [characterPosition, mapData, TILE_SIZE, VIEWPORT_WIDTH, VIEWPORT_HEIGHT]);

  // Animation loop - Now using drawMap and handleContinuousMovement that are defined earlier
  useEffect(() => {
    if (!mapData || !tileset || !characterIdleSprite || !characterWalkSprite) return;

    const animate = (timestamp) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
        characterFrameTimeRef.current = timestamp;
        movementTimeRef.current = timestamp;
      }
      
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      
      // Update character animation
      const characterDeltaTime = timestamp - characterFrameTimeRef.current;
      if (characterDeltaTime >= CHARACTER_FRAME_DURATION) {
        characterFrameTimeRef.current = timestamp;
        setCharacterFrame(prevFrame => (prevFrame + 1) % CHARACTER_FRAMES);
      }

      // Update tile animations
      if (Object.keys(animationFrames).length > 0) {
        const updatedAnimations = { ...animationFrames };
        const updatedFrames = { ...currentFrames };

        Object.keys(updatedAnimations).forEach(tileId => {
          const animation = updatedAnimations[tileId];
          animation.elapsed += deltaTime;

          const frameDuration = animation.frames[animation.currentFrame].duration || DEFAULT_FRAME_DURATION;
          
          if (animation.elapsed >= frameDuration) {
            animation.elapsed -= frameDuration;
            animation.currentFrame = (animation.currentFrame + 1) % animation.frames.length;
            updatedFrames[tileId] = animation.currentFrame;
          }
        });

        setAnimationFrames(updatedAnimations);
        setCurrentFrames(updatedFrames);
      }

      // Check for continuous movement if a key is held down
      const movementDeltaTime = timestamp - movementTimeRef.current;
      if (movementDeltaTime >= MOVEMENT_COOLDOWN) {
        if (handleContinuousMovement()) {
          movementTimeRef.current = timestamp;
        }
      }

      // Draw the map and character
      drawMap();
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mapData, tileset, characterIdleSprite, characterWalkSprite, animationFrames, currentFrames, characterFrame, characterDirection, isWalking, characterPosition, viewportOffset, drawMap, handleContinuousMovement, CHARACTER_FRAME_DURATION, DEFAULT_FRAME_DURATION, MOVEMENT_COOLDOWN, CHARACTER_FRAMES]);

  // Handle keyboard input for character movement
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default behavior for arrow keys to avoid scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault();
      }
      
      // Track which key is pressed
      keyPressedRef.current[e.key] = true;
      console.log("Key down:", e.key, keyPressedRef.current);
      
      // Immediately handle movement on key press (for responsive controls)
      let newPosition = { ...characterPosition };
      let moved = false;
      let direction = characterDirection;
      
      if (e.key === 'ArrowUp' || e.key === 'w') {
        newPosition.y = Math.max(0, characterPosition.y - 1);
        direction = 'up';
        moved = true;
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        newPosition.y = Math.min(mapData ? mapData.height - 1 : 0, characterPosition.y + 1);
        direction = 'down';
        moved = true;
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        newPosition.x = Math.max(0, characterPosition.x - 1);
        direction = 'left';
        moved = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        newPosition.x = Math.min(mapData ? mapData.width - 1 : 0, characterPosition.x + 1);
        direction = 'right';
        moved = true;
      }
      
      if (moved) {
        console.log("Immediate move to:", newPosition);
        
        // Update direction
        setCharacterDirection(direction);
        
        // Set walking animation
        setIsWalking(true);
        
        // Skip validity check if within the grass area (tile ID 62)
        if (mapData && 
            newPosition.x >= 33 && newPosition.x <= 70 && 
            newPosition.y >= 8 && newPosition.y <= 35) {
          console.log("Within grass area, allowing movement");
          setCharacterPosition(newPosition);
          console.log("Character moved to new position:", newPosition);
        } else if (mapData) {
          // Check if new position is valid
          const validPosition = isValidPosition(newPosition);
          console.log("Position valid:", validPosition);
          
          if (validPosition) {
            setCharacterPosition(newPosition);
          }
        }
      }
    };
    
    const handleKeyUp = (e) => {
      // Remove key from pressed keys
      keyPressedRef.current[e.key] = false;
      console.log("Key up:", e.key, keyPressedRef.current);
      
      // Check if all movement keys are released
      const movementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'];
      const isAnyMovementKeyPressed = movementKeys.some(key => keyPressedRef.current[key]);
      
      // If no movement keys are pressed, stop walking animation
      if (!isAnyMovementKeyPressed) {
        setIsWalking(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [characterDirection, characterPosition, mapData, isValidPosition]);

  // Render loading state or canvas
  if (!mapData || !tileset || !characterIdleSprite || !characterWalkSprite) {
    return <div>Loading map and character...</div>;
  }

  return (
    <>
      <canvas 
        ref={canvasRef} 
        style={{ 
          border: '1px solid #ddd',
          imageRendering: 'pixelated',
          width: `${VIEWPORT_WIDTH}px`,
          height: `${VIEWPORT_HEIGHT}px` 
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '8px 15px', 
          borderRadius: '4px',
          fontSize: '14px',
          color: '#444'
        }}>
          Use arrow keys or WASD to move
        </div>
      </div>
    </>
  );
};

export default LandMapCanvas; 