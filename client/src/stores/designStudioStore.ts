/**
 * Design Studio Store
 * State management for the visual template design studio
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';

// Element Types
export type ElementType = 'text' | 'image' | 'shape' | 'data';
export type ShapeType = 'rectangle' | 'circle' | 'line';
export type MediaType = 'logo' | 'product' | 'team' | 'office' | 'hero' | 'icon' | 'screenshot' | 'graphic';

// Core Interfaces
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number | 'auto';
  height: number | 'auto';
}

export interface TextConfig {
  fieldId: string;
  label: string;
  placeholder: string;
  defaultValue: string;
  maxLength: number;
  required: boolean;
  multiline: boolean;
  richText: boolean;
}

export interface ImageConfig {
  fieldId: string;
  mediaType: MediaType;
  tags: string[];
  fallbackUrl?: string;
  objectFit: 'cover' | 'contain' | 'fill';
  aspectRatio?: string;
}

export interface ShapeConfig {
  shape: ShapeType;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface DataConfig {
  fieldId: string;
  dataPath: string;
  format: 'currency' | 'percentage' | 'number' | 'text';
  prefix?: string;
  suffix?: string;
}

export interface AIPromptConfig {
  enabled: boolean;
  prompt: string;
  context: ('businessProfile' | 'brandKit' | 'slidePosition' | 'previousSlides')[];
  fallback?: any;
  maxTokens?: number;
}

export interface VisualElement {
  id: string;
  type: ElementType;
  position: Position;
  size: Size;
  zIndex: number;
  config: TextConfig | ImageConfig | ShapeConfig | DataConfig;
  style: Record<string, any>;
  constraints?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    aspectRatio?: number;
    locked?: boolean;
  };
  aiPrompt?: AIPromptConfig;
}

export interface CanvasState {
  zoom: number;
  pan: Position;
  grid: {
    visible: boolean;
    snap: boolean;
    size: number;
  };
  guides: {
    visible: boolean;
    positions: number[];
  };
}

export interface VisualTemplate {
  id?: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  accessTier: 'free' | 'premium';
  isEnabled: boolean;
  displayOrder: number;
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
    backgroundImage?: string;
  };
  elements: VisualElement[];
  thumbnail?: string;
}

interface HistoryState {
  past: VisualTemplate[];
  future: VisualTemplate[];
}

interface DesignStudioState {
  // Template data
  template: VisualTemplate;
  
  // Canvas state
  canvas: CanvasState;
  
  // Selection
  selectedElementIds: string[];
  hoveredElementId: string | null;
  
  // History for undo/redo
  history: HistoryState;
  
  // Clipboard
  clipboard: VisualElement[];
  
  // UI state
  isDirty: boolean; // Has unsaved changes
  isSaving: boolean;
  
  // Actions - Template
  setTemplate: (template: VisualTemplate) => void;
  updateTemplateInfo: (info: Partial<VisualTemplate>) => void;
  
  // Actions - Elements
  addElement: (element: Omit<VisualElement, 'id' | 'zIndex'>) => string;
  updateElement: (id: string, updates: Partial<VisualElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  moveElement: (id: string, position: Position) => void;
  resizeElement: (id: string, size: Size) => void;
  updateElementStyle: (id: string, style: Record<string, any>) => void;
  updateElementConfig: (id: string, config: Partial<TextConfig | ImageConfig | ShapeConfig | DataConfig>) => void;
  updateElementAIPrompt: (id: string, aiPrompt: AIPromptConfig) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
  // Actions - Selection
  selectElement: (id: string, addToSelection?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  deselectAll: () => void;
  setHoveredElement: (id: string | null) => void;
  
  // Actions - Canvas
  setZoom: (zoom: number) => void;
  setPan: (pan: Position) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleGuides: () => void;
  
  // Actions - History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  
  // Actions - Clipboard
  copy: () => void;
  paste: () => void;
  cut: () => void;
  
  // Actions - Persistence
  markDirty: () => void;
  markClean: () => void;
  setSaving: (saving: boolean) => void;
  
  // Utility
  reset: () => void;
  getElementById: (id: string) => VisualElement | undefined;
}

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const GRID_SIZE = 8;
const MAX_HISTORY = 50;

const initialTemplate: VisualTemplate = {
  name: 'Untitled Template',
  description: '',
  category: 'content',
  tags: [],
  accessTier: 'free',
  isEnabled: true,
  displayOrder: 0,
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#FFFFFF',
  },
  elements: [],
};

const initialCanvas: CanvasState = {
  zoom: 1,
  pan: { x: 0, y: 0 },
  grid: {
    visible: true,
    snap: true,
    size: GRID_SIZE,
  },
  guides: {
    visible: true,
    positions: [],
  },
};

export const useDesignStudioStore = create<DesignStudioState>()(
  immer((set, get) => ({
    // Initial state
    template: initialTemplate,
    canvas: initialCanvas,
    selectedElementIds: [],
    hoveredElementId: null,
    history: {
      past: [],
      future: [],
    },
    clipboard: [],
    isDirty: false,
    isSaving: false,
    
    // Template actions
    setTemplate: (template) => {
      set((state) => {
        state.template = template;
        state.isDirty = false;
        state.history = { past: [], future: [] };
      });
    },
    
    updateTemplateInfo: (info) => {
      set((state) => {
        Object.assign(state.template, info);
        state.isDirty = true;
      });
    },
    
    // Element actions
    addElement: (element) => {
      const id = uuidv4();
      const maxZIndex = Math.max(0, ...get().template.elements.map(e => e.zIndex));
      
      set((state) => {
        state.template.elements.push({
          ...element,
          id,
          zIndex: maxZIndex + 1,
        } as VisualElement);
        state.selectedElementIds = [id];
        state.isDirty = true;
      });
      
      get().pushHistory();
      return id;
    },
    
    updateElement: (id, updates) => {
      set((state) => {
        const element = state.template.elements.find(e => e.id === id);
        if (element) {
          Object.assign(element, updates);
          state.isDirty = true;
        }
      });
      get().pushHistory();
    },
    
    deleteElement: (id) => {
      set((state) => {
        state.template.elements = state.template.elements.filter(e => e.id !== id);
        state.selectedElementIds = state.selectedElementIds.filter(sid => sid !== id);
        state.isDirty = true;
      });
      get().pushHistory();
    },
    
    duplicateElement: (id) => {
      const element = get().getElementById(id);
      if (element) {
        const newId = uuidv4();
        const newElement = {
          ...element,
          id: newId,
          position: {
            x: element.position.x + 20,
            y: element.position.y + 20,
          },
          zIndex: Math.max(...get().template.elements.map(e => e.zIndex)) + 1,
        };
        
        set((state) => {
          state.template.elements.push(newElement);
          state.selectedElementIds = [newId];
          state.isDirty = true;
        });
        
        get().pushHistory();
      }
    },
    
    moveElement: (id, position) => {
      // Apply grid snapping if enabled
      const { grid } = get().canvas;
      let { x, y } = position;
      
      if (grid.snap) {
        x = Math.round(x / grid.size) * grid.size;
        y = Math.round(y / grid.size) * grid.size;
      }
      
      set((state) => {
        const element = state.template.elements.find(e => e.id === id);
        if (element) {
          element.position = { x, y };
          state.isDirty = true;
        }
      });
    },
    
    resizeElement: (id, size) => {
      set((state) => {
        const element = state.template.elements.find(e => e.id === id);
        if (element) {
          element.size = size;
          state.isDirty = true;
        }
      });
    },
    
    updateElementStyle: (id, style) => {
      set((state) => {
        const element = state.template.elements.find(e => e.id === id);
        if (element) {
          element.style = { ...element.style, ...style };
          state.isDirty = true;
        }
      });
    },
    
    updateElementConfig: (id, config) => {
      set((state) => {
        const element = state.template.elements.find(e => e.id === id);
        if (element) {
          element.config = { ...element.config, ...config } as any;
          state.isDirty = true;
        }
      });
    },
    
    updateElementAIPrompt: (id, aiPrompt) => {
      set((state) => {
        const element = state.template.elements.find(e => e.id === id);
        if (element) {
          element.aiPrompt = aiPrompt;
          state.isDirty = true;
        }
      });
      get().pushHistory();
    },
    
    bringForward: (id) => {
      const elements = get().template.elements;
      const index = elements.findIndex(e => e.id === id);
      if (index < elements.length - 1) {
        const nextElement = elements[index + 1];
        set((state) => {
          const element = state.template.elements[index];
          const temp = element.zIndex;
          element.zIndex = nextElement.zIndex;
          nextElement.zIndex = temp;
          state.isDirty = true;
        });
      }
    },
    
    sendBackward: (id) => {
      const elements = get().template.elements;
      const index = elements.findIndex(e => e.id === id);
      if (index > 0) {
        const prevElement = elements[index - 1];
        set((state) => {
          const element = state.template.elements[index];
          const temp = element.zIndex;
          element.zIndex = prevElement.zIndex;
          prevElement.zIndex = temp;
          state.isDirty = true;
        });
      }
    },
    
    bringToFront: (id) => {
      const maxZIndex = Math.max(...get().template.elements.map(e => e.zIndex));
      set((state) => {
        const element = state.template.elements.find(e => e.id === id);
        if (element) {
          element.zIndex = maxZIndex + 1;
          state.isDirty = true;
        }
      });
    },
    
    sendToBack: (id) => {
      const minZIndex = Math.min(...get().template.elements.map(e => e.zIndex));
      set((state) => {
        const element = state.template.elements.find(e => e.id === id);
        if (element) {
          element.zIndex = minZIndex - 1;
          state.isDirty = true;
        }
      });
    },
    
    // Selection actions
    selectElement: (id, addToSelection = false) => {
      set((state) => {
        if (addToSelection) {
          if (!state.selectedElementIds.includes(id)) {
            state.selectedElementIds.push(id);
          }
        } else {
          state.selectedElementIds = [id];
        }
      });
    },
    
    selectMultiple: (ids) => {
      set((state) => {
        state.selectedElementIds = ids;
      });
    },
    
    deselectAll: () => {
      set((state) => {
        state.selectedElementIds = [];
      });
    },
    
    setHoveredElement: (id) => {
      set((state) => {
        state.hoveredElementId = id;
      });
    },
    
    // Canvas actions
    setZoom: (zoom) => {
      set((state) => {
        state.canvas.zoom = Math.max(0.1, Math.min(4, zoom));
      });
    },
    
    setPan: (pan) => {
      set((state) => {
        state.canvas.pan = pan;
      });
    },
    
    toggleGrid: () => {
      set((state) => {
        state.canvas.grid.visible = !state.canvas.grid.visible;
      });
    },
    
    toggleSnap: () => {
      set((state) => {
        state.canvas.grid.snap = !state.canvas.grid.snap;
      });
    },
    
    toggleGuides: () => {
      set((state) => {
        state.canvas.guides.visible = !state.canvas.guides.visible;
      });
    },
    
    // History actions
    pushHistory: () => {
      set((state) => {
        state.history.past.push(JSON.parse(JSON.stringify(state.template)));
        if (state.history.past.length > MAX_HISTORY) {
          state.history.past.shift();
        }
        state.history.future = [];
      });
    },
    
    undo: () => {
      const { past, future } = get().history;
      if (past.length > 0) {
        const previous = past[past.length - 1];
        set((state) => {
          state.history.future.push(JSON.parse(JSON.stringify(state.template)));
          state.template = previous;
          state.history.past.pop();
          state.isDirty = true;
        });
      }
    },
    
    redo: () => {
      const { future } = get().history;
      if (future.length > 0) {
        const next = future[future.length - 1];
        set((state) => {
          state.history.past.push(JSON.parse(JSON.stringify(state.template)));
          state.template = next;
          state.history.future.pop();
          state.isDirty = true;
        });
      }
    },
    
    // Clipboard actions
    copy: () => {
      const { selectedElementIds, template } = get();
      const elements = template.elements.filter(e => selectedElementIds.includes(e.id));
      set((state) => {
        state.clipboard = JSON.parse(JSON.stringify(elements));
      });
    },
    
    paste: () => {
      const { clipboard } = get();
      if (clipboard.length > 0) {
        const newIds: string[] = [];
        set((state) => {
          clipboard.forEach(element => {
            const newId = uuidv4();
            newIds.push(newId);
            state.template.elements.push({
              ...element,
              id: newId,
              position: {
                x: element.position.x + 20,
                y: element.position.y + 20,
              },
              zIndex: Math.max(...state.template.elements.map(e => e.zIndex)) + 1,
            });
          });
          state.selectedElementIds = newIds;
          state.isDirty = true;
        });
        get().pushHistory();
      }
    },
    
    cut: () => {
      get().copy();
      const { selectedElementIds } = get();
      set((state) => {
        state.template.elements = state.template.elements.filter(
          e => !selectedElementIds.includes(e.id)
        );
        state.selectedElementIds = [];
        state.isDirty = true;
      });
      get().pushHistory();
    },
    
    // Persistence actions
    markDirty: () => {
      set((state) => {
        state.isDirty = true;
      });
    },
    
    markClean: () => {
      set((state) => {
        state.isDirty = false;
      });
    },
    
    setSaving: (saving) => {
      set((state) => {
        state.isSaving = saving;
      });
    },
    
    // Utility
    reset: () => {
      set({
        template: initialTemplate,
        canvas: initialCanvas,
        selectedElementIds: [],
        hoveredElementId: null,
        history: { past: [], future: [] },
        clipboard: [],
        isDirty: false,
        isSaving: false,
      });
    },
    
    getElementById: (id) => {
      return get().template.elements.find(e => e.id === id);
    },
  }))
);

