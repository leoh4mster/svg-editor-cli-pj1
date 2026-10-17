import { EditorError } from "./EditorError.js";

export class SvgDocument {
  private canvasWidth = 800;
  private canvasHeight = 600;

  constructor(width = 800, height = 600) {
    this.resize(width, height);
  }

  get width(): number {
    return this.canvasWidth;
  }

  get height(): number {
    return this.canvasHeight;
  }

  resize(width: number, height: number): void {
    // Validate the entire change before assigning either dimension.
    this.validateDimension(width, "width");
    this.validateDimension(height, "height");
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  private validateDimension(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new EditorError(`canvas ${name} must be a finite positive number`);
    }
  }
}
