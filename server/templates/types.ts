// TypeScript interfaces for template system

export type TemplateCategory = 'title' | 'content' | 'data' | 'closing';
export type TemplateAccessTier = 'free' | 'premium';
export type LayoutType = 'centered' | 'split' | 'grid' | 'freeform';
export type ElementType = 'text' | 'logo' | 'image' | 'bullets' | 'chart' | 'richText';
export type ColorReference = 'primary' | 'secondary' | 'accent' | 'contrast';

export interface LayoutZone {
  x: number | string; // Can be px or percentage
  y: number | string;
  width: number | string;
  height: number | string;
  alignment?: 'left' | 'center' | 'right';
}

export interface ElementConstraints {
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: string;
  maintainAspectRatio?: boolean;
}

export interface LayoutElement {
  id: string;
  type: ElementType;
  zone: LayoutZone;
  constraints?: ElementConstraints;
  styling?: Record<string, any>;
}

export interface TemplateLayout {
  type: LayoutType;
  elements: LayoutElement[];
}

export interface GradientStop {
  color: string;
  opacity: number;
  position: number;
}

export interface TemplateBackground {
  type: 'solid' | 'gradient' | 'image';
  usesBrandColor?: ColorReference;
  fallback?: string;
  gradientAngle?: number;
  gradientStops?: GradientStop[];
}

export interface ColorMapping {
  usesBrandColor: ColorReference;
  fallback: string;
  opacity?: number;
}

export interface TypographyStyle {
  fontSize: string;
  fontWeight: string;
  lineHeight: number;
}

export interface TemplateStyling {
  background: TemplateBackground;
  colorScheme: {
    titleColor: ColorMapping;
    descriptionColor: ColorMapping;
    accentColor: ColorMapping;
  };
  typography: {
    title: TypographyStyle;
    description: TypographyStyle;
    bullets?: TypographyStyle;
  };
  effects: {
    shadows: boolean;
    borders: boolean;
    overlay: boolean;
  };
}

export interface ContentFieldValidation {
  required?: boolean;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
}

export interface ContentField {
  id: string;
  type: ElementType;
  label: string;
  placeholder?: string;
  defaultValue?: any;
  required: boolean;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  mapTo: string; // e.g., "titles[0]", "description", "bullets"
}

export interface ContentSchema {
  fields: ContentField[];
}

export interface TemplateMetadata {
  author: string;
  createdAt: string;
  updatedAt: string;
  difficulty: 'easy' | 'medium' | 'advanced';
}

export interface TemplateDefinition {
  // Identity
  id: string;
  version: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  thumbnail: string;
  
  // Access control
  accessTier: TemplateAccessTier;
  isDefault: boolean;
  isEnabled: boolean;
  displayOrder: number;
  
  // Structure
  layout: TemplateLayout;
  styling: TemplateStyling;
  contentSchema: ContentSchema;
  
  // Metadata
  metadata: TemplateMetadata;
}

export interface BrandKitColors {
  primary: string;
  secondary: string;
  accent: string;
  contrast?: string;
}

export interface AppliedTemplate {
  id: string;
  type: string;
  title: string;
  content: any;
  styling: any;
  positionedElements: Record<string, { x: number; y: number; width?: number; height?: number }>;
  layout: string;
  templateId: string;
  templateVersion: string;
  order: number;
  backgroundColor?: string;
  textColor?: string;
  // NEW: Full layout elements from design studio for element-by-element rendering
  layoutElements?: LayoutElement[];
}

export interface TemplateValidationError {
  field: string;
  message: string;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: TemplateValidationError[];
}

