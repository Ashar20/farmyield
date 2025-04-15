/**
 * Index file that exports the TiledMapRenderer components
 */

import TiledMapRenderer from './TiledMapRenderer';
import TiledMapDemo from './TiledMapDemo';

// Export the classes
export {
  TiledMapRenderer,
  TiledMapDemo
};

// If running directly in a browser context, set up global access
if (typeof window !== 'undefined') {
  window.TiledMapRenderer = TiledMapRenderer;
  window.TiledMapDemo = TiledMapDemo;
}

// Log a message when the module is loaded
console.log('TiledMapRenderer module loaded'); 