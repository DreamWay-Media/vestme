import { 
  TemplateDefinition, 
  TemplateValidationResult, 
  TemplateValidationError 
} from './types';

export class TemplateValidator {
  
  /**
   * Validate a template definition
   */
  validate(template: any): TemplateValidationResult {
    const errors: TemplateValidationError[] = [];
    
    // Check required top-level fields
    this.validateRequiredFields(template, errors);
    
    // Validate specific sections
    if (template.layout) {
      this.validateLayout(template.layout, errors);
    }
    
    if (template.styling) {
      this.validateStyling(template.styling, errors);
    }
    
    if (template.contentSchema) {
      this.validateContentSchema(template.contentSchema, errors);
    }
    
    // Validate access control
    this.validateAccessControl(template, errors);
    
    // Validate metadata
    this.validateMetadata(template, errors);
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate required top-level fields
   */
  private validateRequiredFields(template: any, errors: TemplateValidationError[]) {
    const required = [
      'id',
      'name',
      'category',
      'layout',
      'styling',
      'contentSchema',
      'version'
    ];
    
    for (const field of required) {
      if (!template[field]) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`
        });
      }
    }
    
    // Validate category
    if (template.category) {
      const validCategories = ['title', 'content', 'data', 'closing'];
      if (!validCategories.includes(template.category)) {
        errors.push({
          field: 'category',
          message: `Invalid category '${template.category}'. Must be one of: ${validCategories.join(', ')}`
        });
      }
    }
    
    // Validate ID format
    if (template.id && typeof template.id !== 'string') {
      errors.push({
        field: 'id',
        message: 'ID must be a string'
      });
    }
  }
  
  /**
   * Validate layout structure
   */
  private validateLayout(layout: any, errors: TemplateValidationError[]) {
    if (!layout.type) {
      errors.push({
        field: 'layout.type',
        message: 'Layout type is required'
      });
    } else {
      const validTypes = ['centered', 'split', 'grid', 'freeform'];
      if (!validTypes.includes(layout.type)) {
        errors.push({
          field: 'layout.type',
          message: `Invalid layout type '${layout.type}'. Must be one of: ${validTypes.join(', ')}`
        });
      }
    }
    
    if (!Array.isArray(layout.elements)) {
      errors.push({
        field: 'layout.elements',
        message: 'Layout must have an elements array'
      });
    } else {
      // Validate each element
      layout.elements.forEach((element: any, index: number) => {
        this.validateLayoutElement(element, index, errors);
      });
    }
  }
  
  /**
   * Validate a single layout element
   */
  private validateLayoutElement(element: any, index: number, errors: TemplateValidationError[]) {
    const prefix = `layout.elements[${index}]`;
    
    if (!element.id) {
      errors.push({
        field: `${prefix}.id`,
        message: 'Element ID is required'
      });
    }
    
    if (!element.type) {
      errors.push({
        field: `${prefix}.type`,
        message: 'Element type is required'
      });
    } else {
      const validTypes = ['text', 'logo', 'image', 'bullets', 'chart', 'richText'];
      if (!validTypes.includes(element.type)) {
        errors.push({
          field: `${prefix}.type`,
          message: `Invalid element type '${element.type}'`
        });
      }
    }
    
    if (!element.zone) {
      errors.push({
        field: `${prefix}.zone`,
        message: 'Element zone is required'
      });
    } else {
      // Validate zone properties
      const requiredZoneProps = ['x', 'y', 'width', 'height'];
      for (const prop of requiredZoneProps) {
        if (element.zone[prop] === undefined) {
          errors.push({
            field: `${prefix}.zone.${prop}`,
            message: `Zone ${prop} is required`
          });
        }
      }
    }
  }
  
  /**
   * Validate styling structure
   */
  private validateStyling(styling: any, errors: TemplateValidationError[]) {
    if (!styling.background) {
      errors.push({
        field: 'styling.background',
        message: 'Background styling is required'
      });
    } else {
      if (!styling.background.type) {
        errors.push({
          field: 'styling.background.type',
          message: 'Background type is required'
        });
      } else {
        const validTypes = ['solid', 'gradient', 'image'];
        if (!validTypes.includes(styling.background.type)) {
          errors.push({
            field: 'styling.background.type',
            message: `Invalid background type '${styling.background.type}'`
          });
        }
      }
    }
    
    if (!styling.colorScheme) {
      errors.push({
        field: 'styling.colorScheme',
        message: 'Color scheme is required'
      });
    } else {
      const requiredColors = ['titleColor', 'descriptionColor', 'accentColor'];
      for (const color of requiredColors) {
        if (!styling.colorScheme[color]) {
          errors.push({
            field: `styling.colorScheme.${color}`,
            message: `Color scheme ${color} is required`
          });
        }
      }
    }
    
    if (!styling.typography) {
      errors.push({
        field: 'styling.typography',
        message: 'Typography is required'
      });
    } else {
      if (!styling.typography.title) {
        errors.push({
          field: 'styling.typography.title',
          message: 'Title typography is required'
        });
      }
      if (!styling.typography.description) {
        errors.push({
          field: 'styling.typography.description',
          message: 'Description typography is required'
        });
      }
    }
    
    if (!styling.effects) {
      errors.push({
        field: 'styling.effects',
        message: 'Effects configuration is required'
      });
    }
  }
  
  /**
   * Validate content schema
   */
  private validateContentSchema(schema: any, errors: TemplateValidationError[]) {
    if (!Array.isArray(schema.fields)) {
      errors.push({
        field: 'contentSchema.fields',
        message: 'Content schema must have a fields array'
      });
      return;
    }
    
    if (schema.fields.length === 0) {
      errors.push({
        field: 'contentSchema.fields',
        message: 'Content schema must have at least one field'
      });
    }
    
    // Validate each field
    schema.fields.forEach((field: any, index: number) => {
      this.validateContentField(field, index, errors);
    });
  }
  
  /**
   * Validate a single content field
   */
  private validateContentField(field: any, index: number, errors: TemplateValidationError[]) {
    const prefix = `contentSchema.fields[${index}]`;
    
    const required = ['id', 'type', 'label', 'mapTo'];
    for (const prop of required) {
      if (!field[prop]) {
        errors.push({
          field: `${prefix}.${prop}`,
          message: `Field ${prop} is required`
        });
      }
    }
    
    if (field.type) {
      const validTypes = ['text', 'richText', 'bullets', 'image', 'logo', 'number', 'chart'];
      if (!validTypes.includes(field.type)) {
        errors.push({
          field: `${prefix}.type`,
          message: `Invalid field type '${field.type}'`
        });
      }
    }
    
    if (field.required !== undefined && typeof field.required !== 'boolean') {
      errors.push({
        field: `${prefix}.required`,
        message: 'Field required must be a boolean'
      });
    }
  }
  
  /**
   * Validate access control settings
   */
  private validateAccessControl(template: any, errors: TemplateValidationError[]) {
    if (template.accessTier) {
      const validTiers = ['free', 'premium'];
      if (!validTiers.includes(template.accessTier)) {
        errors.push({
          field: 'accessTier',
          message: `Invalid access tier '${template.accessTier}'. Must be 'free' or 'premium'`
        });
      }
    }
    
    if (template.isDefault !== undefined && typeof template.isDefault !== 'boolean') {
      errors.push({
        field: 'isDefault',
        message: 'isDefault must be a boolean'
      });
    }
    
    if (template.isEnabled !== undefined && typeof template.isEnabled !== 'boolean') {
      errors.push({
        field: 'isEnabled',
        message: 'isEnabled must be a boolean'
      });
    }
    
    if (template.displayOrder !== undefined && typeof template.displayOrder !== 'number') {
      errors.push({
        field: 'displayOrder',
        message: 'displayOrder must be a number'
      });
    }
  }
  
  /**
   * Validate metadata
   */
  private validateMetadata(template: any, errors: TemplateValidationError[]) {
    if (template.metadata) {
      if (template.metadata.difficulty) {
        const validDifficulties = ['easy', 'medium', 'advanced'];
        if (!validDifficulties.includes(template.metadata.difficulty)) {
          errors.push({
            field: 'metadata.difficulty',
            message: `Invalid difficulty '${template.metadata.difficulty}'`
          });
        }
      }
    }
  }
  
  /**
   * Quick validation - just check if template is valid, don't return errors
   */
  isValid(template: any): boolean {
    return this.validate(template).valid;
  }
}

// Singleton instance
export const templateValidator = new TemplateValidator();

