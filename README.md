# Tiled Map Renderer

A JavaScript library for loading and rendering Tiled maps with animated tiles using HTML Canvas 2D.

## Features

- Load Tiled maps in JSON format
- Render tile layers with proper ordering
- Support for animated tiles
- Smooth animations using requestAnimationFrame
- Support for layer opacity
- Optimized for performance

## Usage

### Basic Usage

```javascript
// Create a canvas element
const canvas = document.getElementById('mapCanvas');

// Initialize the renderer
const renderer = new TiledMapRenderer(canvas);

// Load a map
await renderer.loadMap('/maps/land-map.json');

// Start the animation loop
renderer.startAnimationLoop();

// Stop the animation when needed
renderer.stopAnimationLoop();
```

### Demo

For a complete example, see the `TiledMapDemo.js` file and the `tiled-map-demo.html` page.

### Tileset Requirements

- Tilesets should be in JSON format with proper animation data
- Example structure:

```json
{
  "columns": 25,
  "image": "Tileset Grass Spring.png",
  "imageheight": 432,
  "imagewidth": 400,
  "margin": 0,
  "name": "Tileset Grass Spring",
  "spacing": 0,
  "tilecount": 675,
  "tileheight": 16,
  "tiles": [
    {
      "animation": [
        { "duration": 150, "tileid": 150 },
        { "duration": 150, "tileid": 152 },
        { "duration": 150, "tileid": 154 },
        { "duration": 150, "tileid": 156 }
      ],
      "id": 150
    }
  ],
  "tilewidth": 16
}
```

## Project Structure

- `src/TiledMapRenderer.js` - Main renderer class
- `src/TiledMapDemo.js` - Demo implementation
- `public/tilesets/` - Tileset images and JSON files
- `public/maps/` - Map JSON files
- `public/tiled-map-demo.html` - Demo page

## Getting Started

1. Clone this repository
2. Open `public/tiled-map-demo.html` in a browser
3. Click "Load Map" to see the animated map

## Creating Your Own Maps

You can create your own maps using Tiled Map Editor (https://www.mapeditor.org/):

1. Create your tileset(s) with animations
2. Export them as JSON
3. Create a map using your tilesets
4. Export the map as JSON
5. Place the files in the appropriate directories
6. Update the paths in your code to point to your map and tilesets

## License

MIT
