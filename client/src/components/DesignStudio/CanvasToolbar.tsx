/**
 * Canvas Toolbar
 * Controls for zoom, grid, guides, etc.
 */

import { ZoomIn, ZoomOut, Grid3x3, Maximize2, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { useDesignStudioStore } from '@/stores/designStudioStore';

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export function CanvasToolbar() {
  const {
    canvas,
    setZoom,
    toggleGrid,
    toggleSnap,
    toggleGuides,
  } = useDesignStudioStore();
  
  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= canvas.zoom);
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
    setZoom(ZOOM_LEVELS[nextIndex]);
  };
  
  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= canvas.zoom);
    const prevIndex = Math.max(currentIndex - 1, 0);
    setZoom(ZOOM_LEVELS[prevIndex]);
  };
  
  const handleFitToScreen = () => {
    setZoom(1);
  };
  
  return (
    <div className="h-12 border-b bg-background flex items-center justify-between px-4 shrink-0">
      {/* Left - Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          disabled={canvas.zoom <= ZOOM_LEVELS[0]}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        
        <Select
          value={String(canvas.zoom)}
          onValueChange={(value) => setZoom(parseFloat(value))}
        >
          <SelectTrigger className="w-28 h-8">
            <SelectValue>{Math.round(canvas.zoom * 100)}%</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ZOOM_LEVELS.map(zoom => (
              <SelectItem key={zoom} value={String(zoom)}>
                {Math.round(zoom * 100)}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          disabled={canvas.zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFitToScreen}
          title="Fit to Screen (100%)"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Right - View Controls */}
      <div className="flex items-center gap-2">
        <Toggle
          pressed={canvas.grid.visible}
          onPressedChange={toggleGrid}
          size="sm"
          title="Toggle Grid"
        >
          <Grid3x3 className="w-4 h-4 mr-1" />
          Grid
        </Toggle>
        
        <Toggle
          pressed={canvas.grid.snap}
          onPressedChange={toggleSnap}
          size="sm"
          title="Snap to Grid"
          disabled={!canvas.grid.visible}
        >
          <Grid3x3 className="w-4 h-4 mr-1" />
          Snap
        </Toggle>
        
        <Toggle
          pressed={canvas.guides.visible}
          onPressedChange={toggleGuides}
          size="sm"
          title="Toggle Guides"
        >
          <Ruler className="w-4 h-4 mr-1" />
          Guides
        </Toggle>
        
        <div className="text-xs text-muted-foreground ml-4">
          1920 × 1080 px
        </div>
      </div>
    </div>
  );
}

