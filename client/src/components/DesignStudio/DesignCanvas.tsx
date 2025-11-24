/**
 * Design Canvas
 * Main canvas area where elements are placed and edited
 */

import { useRef, useState } from 'react';
import { DragEndEvent, DragOverlay, useDndMonitor, useDroppable } from '@dnd-kit/core';
import { Rnd } from 'react-rnd';
import { useDesignStudioStore } from '@/stores/designStudioStore';
import type { VisualElement } from '@/stores/designStudioStore';

export function DesignCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeDragElement, setActiveDragElement] = useState<any>(null);

  const {
    template,
    canvas,
    selectedElementIds,
    hoveredElementId,
    addElement,
    selectElement,
    deselectAll,
    moveElement,
    resizeElement,
    setHoveredElement,
  } = useDesignStudioStore();

  // Make canvas droppable
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
  });

  // Monitor drag events
  useDndMonitor({
    onDragStart(event) {
      setActiveDragElement(event.active.data.current);
    },
    onDragEnd(event) {
      const { active, over } = event;

      if (!over || over.id !== 'canvas') {
        setActiveDragElement(null);
        return;
      }

      // Get canvas bounds
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      // Calculate drop position (accounting for zoom and pan)
      const dropX = (event.activatorEvent as MouseEvent).clientX - canvasRect.left;
      const dropY = (event.activatorEvent as MouseEvent).clientY - canvasRect.top;

      // Adjust for zoom
      const x = dropX / canvas.zoom - (active.data.current.defaultSize.width / 2);
      const y = dropY / canvas.zoom - ((typeof active.data.current.defaultSize.height === 'number' ? active.data.current.defaultSize.height : 50) / 2);

      // Create new element
      const newElement = {
        type: active.data.current.type,
        position: { x: Math.max(0, x), y: Math.max(0, y) },
        size: active.data.current.defaultSize,
        config: active.data.current.defaultConfig,
        style: active.data.current.defaultStyle,
      };

      addElement(newElement);
      setActiveDragElement(null);
    },
    onDragCancel() {
      setActiveDragElement(null);
    },
  });

  // Handle canvas click (deselect)
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      deselectAll();
    }
  };

  return (
    <>
      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        {/* Canvas wrapper with max-width constraint */}
        <div className="max-w-full px-2">
          {/* Canvas Container - centered and scaled */}
          <div
            className="relative mx-auto"
            style={{
              width: `${template.canvas.width * canvas.zoom}px`,
              height: `${template.canvas.height * canvas.zoom}px`,
            }}
          >
            {/* Canvas - maintains internal 1920x1080 coordinate system */}
            <div
              ref={(node) => {
                canvasRef.current = node;
                setNodeRef(node);
              }}
              id="canvas"
              data-canvas="true"
              onClick={handleCanvasClick}
              className={`absolute top-0 left-0 bg-white shadow-2xl ${isOver ? 'ring-4 ring-primary ring-opacity-50' : ''}`}
              style={{
                width: `${template.canvas.width}px`,
                height: `${template.canvas.height}px`,
                backgroundColor: template.canvas.backgroundColor,
                transform: `scale(${canvas.zoom})`,
                transformOrigin: 'top left',
              }}
            >
              {/* Grid Overlay */}
              {canvas.grid.visible && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `
                    linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
                  `,
                    backgroundSize: `${canvas.grid.size}px ${canvas.grid.size}px`,
                  }}
                />
              )}

              {/* Center Guides */}
              {canvas.guides.visible && (
                <>
                  {/* Vertical center */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-blue-400/30 pointer-events-none"
                    style={{ left: `${template.canvas.width / 2}px` }}
                  />
                  {/* Horizontal center */}
                  <div
                    className="absolute left-0 right-0 h-px bg-blue-400/30 pointer-events-none"
                    style={{ top: `${template.canvas.height / 2}px` }}
                  />
                </>
              )}

              {/* Elements */}
              {[...template.elements]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map(element => (
                  <CanvasElement
                    key={element.id}
                    element={element}
                    zoom={canvas.zoom}
                    isSelected={selectedElementIds.includes(element.id)}
                    isHovered={hoveredElementId === element.id}
                    onSelect={() => selectElement(element.id)}
                    onMove={(x, y) => moveElement(element.id, { x, y })}
                    onResize={(width, height) => resizeElement(element.id, { width, height })}
                    onHover={(hover) => setHoveredElement(hover ? element.id : null)}
                  />
                ))}

              {/* Drop Zone Indicator */}
              {isOver && activeDragElement && (
                <div className="absolute inset-0 border-4 border-dashed border-primary bg-primary/5 pointer-events-none flex items-center justify-center">
                  <div className="bg-white px-4 py-2 rounded-lg shadow-lg">
                    <p className="text-sm font-medium">Drop to add element</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragElement && (
          <div className="bg-white border-2 border-primary rounded-lg p-3 shadow-lg opacity-80 flex items-center">
            {activeDragElement.icon}
            <span className="ml-2 text-sm font-medium">{activeDragElement.label}</span>
          </div>
        )}
      </DragOverlay>
    </>
  );
}

interface CanvasElementProps {
  element: VisualElement;
  zoom: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onHover: (hover: boolean) => void;
}

function CanvasElement({
  element,
  zoom,
  isSelected,
  isHovered,
  onSelect,
  onMove,
  onResize,
  onHover,
}: CanvasElementProps) {
  const width = typeof element.size.width === 'number'
    ? element.size.width
    : 'auto';
  const height = typeof element.size.height === 'number'
    ? element.size.height
    : 'auto';

  return (
    <Rnd
      position={{
        x: element.position.x,
        y: element.position.y,
      }}
      size={{
        width,
        height,
      }}
      scale={zoom}
      onDragStop={(e, d) => {
        onMove(d.x, d.y);
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        const newWidth = parseInt(ref.style.width);
        const newHeight = parseInt(ref.style.height);
        onResize(newWidth, newHeight);
        onMove(position.x, position.y);
      }}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      enableResizing={isSelected}
      disableDragging={!isSelected}
      bounds="parent"
      className={`
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isHovered && !isSelected ? 'ring-1 ring-blue-300' : ''}
      `}
      style={{
        cursor: isSelected ? 'move' : 'pointer',
      }}
    >
      <div className="w-full h-full pointer-events-none">
        <ElementContent element={element} />
      </div>
    </Rnd>
  );
}

function ElementContent({ element }: { element: VisualElement }) {
  const style = {
    ...element.style,
    fontSize: element.style.fontSize ? `${parseInt(element.style.fontSize)}px` : undefined,
  };

  switch (element.type) {
    case 'text':
      return (
        <div
          style={style}
          className="w-full h-full flex items-center justify-center p-2"
        >
          {element.config.defaultValue || 'Text'}
        </div>
      );

    case 'image':
      return (
        <div
          style={{
            ...style,
            border: '2px dashed #CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
          }}
          className="w-full h-full"
        >
          <div className="text-center text-sm text-muted-foreground">
            <div className="text-2xl mb-1">
              {element.config.mediaType === 'logo' ? '🏢' : '🖼️'}
            </div>
            {element.config.label || element.config.mediaType}
          </div>
        </div>
      );

    case 'shape':
      if (element.config.shape === 'circle') {
        return (
          <div
            style={{
              backgroundColor: element.config.fill,
              border: `${element.config.strokeWidth}px solid ${element.config.stroke}`,
              borderRadius: '50%',
            }}
            className="w-full h-full"
          />
        );
      } else if (element.config.shape === 'line') {
        return (
          <div
            style={{
              backgroundColor: element.config.stroke,
              height: `${element.config.strokeWidth}px`,
            }}
            className="w-full"
          />
        );
      } else {
        return (
          <div
            style={{
              backgroundColor: element.config.fill,
              border: `${element.config.strokeWidth}px solid ${element.config.stroke}`,
              borderRadius: '0px',
            }}
            className="w-full h-full"
          />
        );
      }

    case 'data':
      return (
        <div
          style={style}
          className="w-full h-full flex items-center justify-center p-2"
        >
          {element.config.prefix || ''}
          {element.config.defaultValue || '--'}
          {element.config.suffix || ''}
        </div>
      );

    default:
      return <div className="w-full h-full bg-gray-100" />;
  }
}
