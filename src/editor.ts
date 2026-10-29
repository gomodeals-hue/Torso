import { 
  type TshirtStyle, 
  PRINT_ZONES 
} from './tshirt';
import { TOY_STICKERS, PRESET_GRAPHICS } from './stickers';
import { ThreeScene, type CameraPreset } from './three_scene';

export type StickerFinish = 'screenprint' | 'vinyl' | 'embroidery' | 'vintage' | 'rubber' | 'diecut';
export type TextStylePreset = 'puff' | 'screenprint' | 'varsity' | 'vintage' | 'embroidery' | 'neon' | 'clean' | 'cracked' | 'goldfoil' | 'gothic' | 'brush' | 'rubber';

export interface CanvasElement {
  id: string;
  type: 'sticker' | 'image' | 'graphic' | 'text';
  content: string; // SVG string, image data URL, or text string
  name: string;
  x: number; // 0 to 600 coordinate space
  y: number; // 0 to 680 coordinate space
  width: number;
  height: number;
  rotation: number; // degrees
  zIndex: number;
  
  // Natural Finishes for Stickers & Artwork
  finishStyle?: StickerFinish;

  // Rich Typography Properties
  fontSize?: number;
  fontFamily?: string;
  fillColor?: string;
  textStyle?: TextStylePreset;
  letterSpacing?: number;
  strokeColor?: string;
  strokeWidth?: number;
  isCurved?: boolean;
  curveRadius?: number;
}

export type TshirtSide = 'front' | 'back';

export interface EditorState {
  currentSide: TshirtSide;
  shirtColor: string;
  shirtStyle: TshirtStyle;
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
  selectedId: string | null;
  zoom: number;
  defaultStickerFinish: StickerFinish;
  cameraPreset: CameraPreset;
  isTurntable: boolean;
  angles: { pitch: number; yaw: number; roll: number };
}

export class TshirtEditor {
  private state: EditorState = {
    currentSide: 'front',
    shirtColor: '#ffffff', // default crisp white
    shirtStyle: 'crewneck',
    frontElements: [],
    backElements: [],
    selectedId: null,
    zoom: 1,
    defaultStickerFinish: 'screenprint',
    cameraPreset: 'front',
    isTurntable: false,
    angles: { pitch: 0, yaw: 0, roll: 0 }
  };

  private history: string[] = [];
  private historyIndex: number = -1;

  // DOM references
  private containerEl: HTMLElement;
  private threeContainerEl!: HTMLElement;
  private overlayEl!: HTMLElement;
  private printGuideEl!: HTMLElement;
  private orbitAngleTextEl!: HTMLElement;

  // 3D Engine instance
  private threeScene!: ThreeScene;

  // Offscreen high-res artwork canvases for 3D decal projection
  private canvasFrontEl!: HTMLCanvasElement;
  private canvasBackEl!: HTMLCanvasElement;
  private imageCache: Map<string, HTMLImageElement> = new Map();

  // Interaction tracking for stickers/elements
  private activeTransform: {
    type: 'move' | 'resize' | 'rotate';
    elementId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origRot: number;
    handle?: string;
    centerX?: number;
    centerY?: number;
  } | null = null;

  // Listeners
  private onStateChangeCallbacks: Array<(state: EditorState) => void> = [];

  constructor(container: HTMLElement) {
    this.containerEl = container;
    this.initArtworkCanvases();
    this.initDOM();
    this.initThreeScene();
    this.initEventListeners();
    this.recordHistory();
    this.render();
  }

  private initArtworkCanvases() {
    this.canvasFrontEl = document.createElement('canvas');
    this.canvasFrontEl.width = 1200;
    this.canvasFrontEl.height = 1360;

    this.canvasBackEl = document.createElement('canvas');
    this.canvasBackEl.width = 1200;
    this.canvasBackEl.height = 1360;
  }

  public onStateChange(cb: (state: EditorState) => void) {
    this.onStateChangeCallbacks.push(cb);
    cb(this.state);
  }

  private triggerStateChange() {
    this.onStateChangeCallbacks.forEach(cb => cb(this.state));
  }

  private initDOM() {
    this.containerEl.innerHTML = `
      <div class="studio-viewport-3d" id="studio-viewport-3d">
        <!-- 3D Three.js WebGL Mount Container -->
        <div class="three-scene-container" id="three-scene-container"></div>

        <!-- 2D Design Interaction Overlay (aligned over Front/Back perspective) -->
        <div class="studio-design-stage" id="studio-design-stage">
          <div class="print-guide-boundary" id="print-guide-boundary">
            <span class="guide-tag">PRINT ZONE</span>
          </div>
          <div class="elements-overlay" id="elements-overlay"></div>
        </div>

        <!-- 3D Orbit Drag Floating Angle Badge -->
        <div class="orbit-angle-badge" id="orbit-angle-badge">
          <span class="orbit-icon">🔄</span>
          <span id="orbit-angle-text">3D Orbit: 0°</span>
        </div>
      </div>
    `;

    this.threeContainerEl = this.containerEl.querySelector('#three-scene-container')!;
    this.overlayEl = this.containerEl.querySelector('#elements-overlay')!;
    this.printGuideEl = this.containerEl.querySelector('#print-guide-boundary')!;
    this.orbitAngleTextEl = this.containerEl.querySelector('#orbit-angle-text')!;

    this.updatePrintGuidePosition();
  }

  private initThreeScene() {
    this.threeScene = new ThreeScene({
      container: this.threeContainerEl,
      initialColor: this.state.shirtColor,
      onAngleChange: (pitch, yaw, roll) => {
        this.state.angles = { pitch, yaw, roll };
        if (this.orbitAngleTextEl) {
          this.orbitAngleTextEl.textContent = `X: ${pitch}° | Y: ${yaw}° | Z: ${roll}°`;
        }

        // Hide 2D interactive overlay if rotated away from front/back perspective
        const isNearFront = Math.abs(yaw) < 22 && Math.abs(pitch) < 18;
        const isNearBack = Math.abs(Math.abs(yaw) - 180) < 22 && Math.abs(pitch) < 18;

        const stage = this.containerEl.querySelector('#studio-design-stage') as HTMLElement;
        if (stage) {
          if (isNearFront || isNearBack) {
            stage.style.opacity = '1';
            const side = isNearFront ? 'front' : 'back';
            if (this.state.currentSide !== side) {
              this.state.currentSide = side;
              this.renderElements();
              this.triggerStateChange();
            }
          } else {
            // Rotating freely in 3D: auto-confirm any selected sticker so it bakes to the 3D shirt cleanly!
            if (this.state.selectedId) {
              this.selectElement(null);
            }
            stage.style.opacity = '0';
          }
        }

        this.triggerStateChange();
      },
      onModelLoaded: () => {
        this.syncArtworkToDecals();
      }
    });
  }

  private updatePrintGuidePosition() {
    const zone = PRINT_ZONES[this.state.shirtStyle] || PRINT_ZONES.crewneck;
    if (this.printGuideEl) {
      this.printGuideEl.style.left = `${(zone.x / 600) * 100}%`;
      this.printGuideEl.style.top = `${(zone.y / 680) * 100}%`;
      this.printGuideEl.style.width = `${(zone.width / 600) * 100}%`;
      this.printGuideEl.style.height = `${(zone.height / 680) * 100}%`;
      const tag = this.printGuideEl.querySelector('.guide-tag');
      if (tag) {
        tag.textContent = this.state.currentSide === 'front' ? 'PRINT ZONE (FRONT)' : 'PRINT ZONE (BACK)';
      }
    }
  }

  public getState(): EditorState {
    return this.state;
  }

  public getThreeScene(): ThreeScene {
    return this.threeScene;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.state.currentSide === 'front' ? this.canvasFrontEl : this.canvasBackEl;
  }

  // ============================================================================
  // 3D PERSPECTIVE & CAMERA CONTROLS
  // ============================================================================

  public setSide(side: TshirtSide) {
    this.state.currentSide = side;
    this.state.selectedId = null;
    this.state.cameraPreset = side === 'front' ? 'front' : 'back';

    this.threeScene.setCameraPreset(this.state.cameraPreset);
    this.updatePrintGuidePosition();
    this.renderElements();
    this.triggerStateChange();
  }

  public toggleSide() {
    this.setSide(this.state.currentSide === 'front' ? 'back' : 'front');
  }

  public setCameraPreset(preset: CameraPreset) {
    this.state.cameraPreset = preset;
    this.threeScene.setCameraPreset(preset);
    if (preset === 'front') this.state.currentSide = 'front';
    if (preset === 'back') this.state.currentSide = 'back';
    this.updatePrintGuidePosition();
    this.renderElements();
    this.triggerStateChange();
  }

  public setRotationXYZ(x: number, y: number, z: number) {
    this.threeScene.setRotationXYZ(x, y, z);
    this.state.angles = { pitch: x, yaw: y, roll: z };
    this.triggerStateChange();
  }

  public rotateBy(pitchDeg: number, yawDeg: number, rollDeg: number) {
    this.threeScene.rotateBy(pitchDeg, yawDeg, rollDeg);
    this.state.angles = this.threeScene.getRotationXYZ();
    this.triggerStateChange();
  }

  public toggleTurntable(): boolean {
    const active = this.threeScene.toggleTurntable();
    this.state.isTurntable = active;
    this.triggerStateChange();
    return active;
  }

  public reset3DView() {
    this.threeScene.resetView();
    this.state.currentSide = 'front';
    this.state.cameraPreset = 'front';
    this.state.isTurntable = false;
    this.updatePrintGuidePosition();
    this.renderElements();
    this.triggerStateChange();
  }

  // ============================================================================
  // SHIRT COLOR & STYLE CONFIGURATION
  // ============================================================================

  public setShirtColor(hex: string) {
    this.state.shirtColor = hex;
    this.threeScene.setShirtColor(hex);
    this.recordHistory();
    this.triggerStateChange();
  }

  public setShirtStyle(style: TshirtStyle) {
    if (this.state.shirtStyle === style) return;
    this.state.shirtStyle = style;
    this.updatePrintGuidePosition();
    this.render();
    this.recordHistory();
    this.triggerStateChange();
  }

  public setWithCollar(hasCollar: boolean) {
    if (hasCollar) {
      this.setShirtStyle('polo');
    } else {
      if (this.state.shirtStyle === 'polo') {
        this.setShirtStyle('crewneck');
      }
    }
  }

  public toggleCollar() {
    const isPolo = this.state.shirtStyle === 'polo';
    this.setShirtStyle(isPolo ? 'crewneck' : 'polo');
  }

  public setZoom(zoomFactor: number) {
    this.state.zoom = Math.max(0.6, Math.min(2.0, zoomFactor));
    this.triggerStateChange();
  }

  public zoomIn() {
    this.threeScene.zoomIn();
  }

  public zoomOut() {
    this.threeScene.zoomOut();
  }

  public resetZoom() {
    this.threeScene.setCameraPreset(this.state.cameraPreset);
  }

  public setDefaultStickerFinish(finish: StickerFinish) {
    this.state.defaultStickerFinish = finish;
  }

  private getCurrentElements(): CanvasElement[] {
    return this.state.currentSide === 'front' ? this.state.frontElements : this.state.backElements;
  }

  private setCurrentElements(elements: CanvasElement[]) {
    if (this.state.currentSide === 'front') {
      this.state.frontElements = elements;
    } else {
      this.state.backElements = elements;
    }
  }

  // ============================================================================
  // ELEMENT MANAGEMENT (STICKERS, GRAPHICS, IMAGES, TYPOGRAPHY)
  // ============================================================================

  public addSticker(stickerId: string, customX?: number, customY?: number, finish?: StickerFinish) {
    const stickerDef = TOY_STICKERS.find(s => s.id === stickerId);
    if (!stickerDef) return;

    const zone = PRINT_ZONES[this.state.shirtStyle] || PRINT_ZONES.crewneck;
    const size = 135;
    const x = customX !== undefined ? customX - size / 2 : zone.x + (zone.width - size) / 2;
    const y = customY !== undefined ? customY - size / 2 : zone.y + (zone.height - size) / 2;

    const newElement: CanvasElement = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: 'sticker',
      content: stickerDef.imgUrl,
      name: stickerDef.name,
      x: Math.round(x),
      y: Math.round(y),
      width: size,
      height: size,
      rotation: 0,
      zIndex: this.getCurrentElements().length + 1,
      finishStyle: finish || this.state.defaultStickerFinish
    };

    const currentList = [...this.getCurrentElements(), newElement];
    this.setCurrentElements(currentList);
    this.state.selectedId = newElement.id;
    this.recordHistory();
    this.render();
    this.triggerStateChange();
  }

  public addPresetGraphic(graphicId: string, customX?: number, customY?: number, finish?: StickerFinish) {
    const preset = PRESET_GRAPHICS.find(g => g.id === graphicId);
    if (!preset) return;

    const zone = PRINT_ZONES[this.state.shirtStyle] || PRINT_ZONES.crewneck;
    const size = 130;
    const x = customX !== undefined ? customX - size / 2 : zone.x + (zone.width - size) / 2;
    const y = customY !== undefined ? customY - size / 2 : zone.y + (zone.height - size) / 2;

    const newElement: CanvasElement = {
      id: 'graphic_' + Date.now(),
      type: 'graphic',
      content: preset.svg,
      name: preset.title,
      x: Math.round(x),
      y: Math.round(y),
      width: size,
      height: size,
      rotation: 0,
      zIndex: this.getCurrentElements().length + 1,
      finishStyle: finish || this.state.defaultStickerFinish
    };

    this.setCurrentElements([...this.getCurrentElements(), newElement]);
    this.state.selectedId = newElement.id;
    this.recordHistory();
    this.render();
    this.triggerStateChange();
  }

  public addImage(dataUrl: string, name: string = 'Uploaded Artwork', customX?: number, customY?: number, finish?: StickerFinish) {
    const img = new Image();
    img.onload = () => {
      let w = 140;
      let h = (w / img.width) * img.height;
      if (h > 200) {
        h = 200;
        w = (h / img.height) * img.width;
      }

      const zone = PRINT_ZONES[this.state.shirtStyle] || PRINT_ZONES.crewneck;
      const x = customX !== undefined ? customX - w / 2 : zone.x + (zone.width - w) / 2;
      const y = customY !== undefined ? customY - h / 2 : zone.y + (zone.height - h) / 2;

      const newElement: CanvasElement = {
        id: 'img_' + Date.now(),
        type: 'image',
        content: dataUrl,
        name: name,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
        rotation: 0,
        zIndex: this.getCurrentElements().length + 1,
        finishStyle: finish || this.state.defaultStickerFinish
      };

      this.setCurrentElements([...this.getCurrentElements(), newElement]);
      this.state.selectedId = newElement.id;
      this.recordHistory();
      this.render();
      this.triggerStateChange();
    };
    img.src = dataUrl;
  }

  public addCustomText(
    text: string,
    font: string = "'Bebas Neue', sans-serif",
    color: string = '#ffffff',
    options?: {
      style?: TextStylePreset;
      fontSize?: number;
      letterSpacing?: number;
      strokeColor?: string;
      strokeWidth?: number;
      isCurved?: boolean;
    },
    customX?: number,
    customY?: number
  ) {
    const zone = PRINT_ZONES[this.state.shirtStyle] || PRINT_ZONES.crewneck;
    const fontSize = options?.fontSize || 34;
    const isCurved = options?.isCurved || false;
    
    const textLen = Math.max(4, text.length);
    const approxW = Math.min(260, Math.max(160, textLen * (fontSize * 0.55)));
    const approxH = isCurved ? Math.round(fontSize * 2.4) : Math.round(fontSize * 1.5);

    const x = customX !== undefined ? customX - approxW / 2 : zone.x + (zone.width - approxW) / 2;
    const y = customY !== undefined ? customY - approxH / 2 : zone.y + (zone.height - approxH) / 2;

    const newElement: CanvasElement = {
      id: 'text_' + Date.now(),
      type: 'text',
      content: text,
      name: `Text "${text.slice(0, 12)}"`,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(approxW),
      height: Math.round(approxH),
      rotation: 0,
      zIndex: this.getCurrentElements().length + 1,
      fontSize: fontSize,
      fontFamily: font,
      fillColor: color,
      textStyle: options?.style || 'puff',
      letterSpacing: options?.letterSpacing !== undefined ? options.letterSpacing : 2,
      strokeColor: options?.strokeColor || '#000000',
      strokeWidth: options?.strokeWidth || 0,
      isCurved: isCurved,
      curveRadius: 160
    };

    this.setCurrentElements([...this.getCurrentElements(), newElement]);
    this.state.selectedId = newElement.id;
    this.recordHistory();
    this.render();
    this.triggerStateChange();
  }

  public cycleElementFinish(id: string) {
    const items = [...this.getCurrentElements()];
    const el = items.find(item => item.id === id);
    if (!el) return;

    const finishes: StickerFinish[] = ['screenprint', 'vinyl', 'embroidery', 'vintage', 'rubber', 'diecut'];
    const currentIdx = finishes.indexOf(el.finishStyle || 'screenprint');
    const nextIdx = (currentIdx + 1) % finishes.length;
    el.finishStyle = finishes[nextIdx];

    this.setCurrentElements(items);
    this.render();
    this.recordHistory();
    this.triggerStateChange();
  }

  public setElementFinish(id: string, finish: StickerFinish) {
    const items = [...this.getCurrentElements()];
    const el = items.find(item => item.id === id);
    if (!el) return;
    el.finishStyle = finish;
    this.setCurrentElements(items);
    this.render();
    this.recordHistory();
    this.triggerStateChange();
  }

  public updateSelectedText(options: {
    text?: string;
    fontFamily?: string;
    fillColor?: string;
    textStyle?: TextStylePreset;
    fontSize?: number;
    letterSpacing?: number;
    strokeColor?: string;
    strokeWidth?: number;
    isCurved?: boolean;
  }) {
    if (!this.state.selectedId) return;
    const items = [...this.getCurrentElements()];
    const el = items.find(item => item.id === this.state.selectedId);
    if (!el || el.type !== 'text') return;

    if (options.text !== undefined) {
      el.content = options.text;
      el.name = `Text "${options.text.slice(0, 12)}"`;
    }
    if (options.fontFamily !== undefined) el.fontFamily = options.fontFamily;
    if (options.fillColor !== undefined) el.fillColor = options.fillColor;
    if (options.textStyle !== undefined) el.textStyle = options.textStyle;
    if (options.fontSize !== undefined) el.fontSize = options.fontSize;
    if (options.letterSpacing !== undefined) el.letterSpacing = options.letterSpacing;
    if (options.strokeColor !== undefined) el.strokeColor = options.strokeColor;
    if (options.strokeWidth !== undefined) el.strokeWidth = options.strokeWidth;
    if (options.isCurved !== undefined) el.isCurved = options.isCurved;

    const textLen = Math.max(4, el.content.length);
    const fs = el.fontSize || 34;
    el.width = Math.round(Math.min(320, Math.max(160, textLen * (fs * 0.55))));
    el.height = el.isCurved ? Math.round(fs * 2.4) : Math.round(fs * 1.5);

    this.setCurrentElements(items);
    this.render();
    this.recordHistory();
    this.triggerStateChange();
  }

  public selectElement(id: string | null) {
    if (this.state.selectedId === id) return;
    this.state.selectedId = id;
    this.updateSelectionOverlay();
    this.syncArtworkToDecals();
    this.triggerStateChange();
  }

  public deleteSelected() {
    if (!this.state.selectedId) return;
    const filtered = this.getCurrentElements().filter(el => el.id !== this.state.selectedId);
    this.setCurrentElements(filtered);
    this.state.selectedId = null;
    this.recordHistory();
    this.render();
    this.triggerStateChange();
  }

  public duplicateSelected() {
    const selected = this.getCurrentElements().find(el => el.id === this.state.selectedId);
    if (!selected) return;

    const duplicated: CanvasElement = {
      ...selected,
      id: selected.type + '_' + Date.now(),
      x: Math.min(500, selected.x + 25),
      y: Math.min(550, selected.y + 25),
      zIndex: this.getCurrentElements().length + 1
    };

    this.setCurrentElements([...this.getCurrentElements(), duplicated]);
    this.state.selectedId = duplicated.id;
    this.recordHistory();
    this.render();
    this.triggerStateChange();
  }

  public clearCurrentSide() {
    this.setCurrentElements([]);
    this.state.selectedId = null;
    this.recordHistory();
    this.render();
    this.triggerStateChange();
  }

  public bringForward(id: string) {
    const list = [...this.getCurrentElements()];
    const idx = list.findIndex(e => e.id === id);
    if (idx >= 0 && idx < list.length - 1) {
      const temp = list[idx];
      list[idx] = list[idx + 1];
      list[idx + 1] = temp;
      list.forEach((item, i) => item.zIndex = i + 1);
      this.setCurrentElements(list);
      this.recordHistory();
      this.render();
      this.triggerStateChange();
    }
  }

  public sendBackward(id: string) {
    const list = [...this.getCurrentElements()];
    const idx = list.findIndex(e => e.id === id);
    if (idx > 0) {
      const temp = list[idx];
      list[idx] = list[idx - 1];
      list[idx - 1] = temp;
      list.forEach((item, i) => item.zIndex = i + 1);
      this.setCurrentElements(list);
      this.recordHistory();
      this.render();
      this.triggerStateChange();
    }
  }

  public deleteElement(id: string) {
    const filtered = this.getCurrentElements().filter(el => el.id !== id);
    this.setCurrentElements(filtered);
    if (this.state.selectedId === id) this.state.selectedId = null;
    this.recordHistory();
    this.render();
    this.triggerStateChange();
  }

  public duplicateElement(id: string) {
    const el = this.getCurrentElements().find(item => item.id === id);
    if (!el) return;

    const dup: CanvasElement = {
      ...el,
      id: el.type + '_' + Date.now(),
      x: Math.min(500, el.x + 25),
      y: Math.min(550, el.y + 25),
      zIndex: this.getCurrentElements().length + 1
    };

    this.setCurrentElements([...this.getCurrentElements(), dup]);
    this.state.selectedId = dup.id;
    this.recordHistory();
    this.render();
    this.triggerStateChange();
  }

  // ============================================================================
  // HISTORY & UNDO / REDO
  // ============================================================================

  private recordHistory() {
    const snapshot = JSON.stringify({
      front: this.state.frontElements,
      back: this.state.backElements,
      color: this.state.shirtColor,
      style: this.state.shirtStyle
    });

    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(snapshot);
    if (this.history.length > 30) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  public canUndo(): boolean {
    return this.historyIndex > 0;
  }

  public canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  public undo() {
    if (!this.canUndo()) return;
    this.historyIndex--;
    this.applyHistorySnapshot(this.history[this.historyIndex]);
  }

  public redo() {
    if (!this.canRedo()) return;
    this.historyIndex++;
    this.applyHistorySnapshot(this.history[this.historyIndex]);
  }

  private applyHistorySnapshot(snapshotJson: string) {
    try {
      const snap = JSON.parse(snapshotJson);
      this.state.frontElements = snap.front || [];
      this.state.backElements = snap.back || [];
      this.state.shirtColor = snap.color || '#ffffff';
      this.state.shirtStyle = snap.style || 'crewneck';
      this.state.selectedId = null;

      this.threeScene.setShirtColor(this.state.shirtColor);
      this.updatePrintGuidePosition();
      this.render();
      this.triggerStateChange();
    } catch (e) {
      console.error('History parse error', e);
    }
  }

  // ============================================================================
  // RENDERING & 3D SYNCHRONIZATION
  // ============================================================================

  public render() {
    this.renderElements();
    this.syncArtworkToDecals();
  }

  private renderElements() {
    if (!this.overlayEl) return;
    this.overlayEl.innerHTML = '';

    const elements = this.getCurrentElements();
    elements.forEach(el => {
      const isSelected = el.id === this.state.selectedId;
      const elNode = document.createElement('div');
      elNode.className = `canvas-item ${isSelected ? 'selected' : ''}`;
      elNode.dataset.id = el.id;

      elNode.style.left = `${(el.x / 600) * 100}%`;
      elNode.style.top = `${(el.y / 680) * 100}%`;
      elNode.style.width = `${(el.width / 600) * 100}%`;
      elNode.style.height = `${(el.height / 680) * 100}%`;
      elNode.style.transform = `rotate(${el.rotation}deg)`;
      elNode.style.zIndex = `${el.zIndex}`;

      let innerContent = '';
      if (el.type === 'sticker') {
        const finishClass = `finish-${el.finishStyle || 'screenprint'}`;
        innerContent = `
          <div class="sticker-wrapper ${finishClass}">
            <img class="item-img real-vinyl-sticker" src="${el.content}" alt="${el.name}" draggable="false" />
          </div>
        `;
      } else if (el.type === 'image') {
        const finishClass = `finish-${el.finishStyle || 'screenprint'}`;
        innerContent = `
          <div class="sticker-wrapper ${finishClass}">
            <img class="item-img realistic-decal" src="${el.content}" alt="${el.name}" draggable="false" />
          </div>
        `;
      } else if (el.type === 'graphic') {
        const finishClass = `finish-${el.finishStyle || 'screenprint'}`;
        innerContent = `<div class="item-graphic realistic-decal ${finishClass}">${el.content}</div>`;
      } else if (el.type === 'text') {
        const styleClass = `text-style-${el.textStyle || 'puff'}`;
        const strokeStyle = el.strokeWidth && el.strokeWidth > 0 
          ? `-webkit-text-stroke: ${el.strokeWidth}px ${el.strokeColor || '#000000'};` 
          : '';
        const spacingStyle = el.letterSpacing !== undefined 
          ? `letter-spacing: ${el.letterSpacing}px;` 
          : 'letter-spacing: 2px;';

        if (el.isCurved) {
          const w = el.width;
          const h = el.height;
          const pathD = `M 12,${h * 0.82} Q ${w / 2},${h * 0.82 - 50} ${w - 12},${h * 0.82}`;
          innerContent = `
            <div class="item-text-curved ${styleClass}">
              <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%">
                <defs>
                  <path id="path_${el.id}" d="${pathD}" fill="none" />
                </defs>
                <text fill="${el.fillColor || '#ffffff'}" font-family="${el.fontFamily || "'Bebas Neue', sans-serif"}" font-size="${el.fontSize || 34}px" font-weight="800" style="${strokeStyle} ${spacingStyle}">
                  <textPath href="#path_${el.id}" startOffset="50%" text-anchor="middle">
                    ${el.content}
                  </textPath>
                </text>
              </svg>
            </div>
          `;
        } else {
          innerContent = `
            <div class="item-text ${styleClass}" style="font-family: ${el.fontFamily || "'Bebas Neue', sans-serif"}; color: ${el.fillColor || '#ffffff'}; font-size: ${el.fontSize || 34}px; ${strokeStyle} ${spacingStyle}">
              ${el.content}
            </div>
          `;
        }
      }

      let handlesHtml = '';
      if (isSelected) {
        handlesHtml = `<div class="selection-box">${this.getSelectionBoxHtml(el.id)}</div>`;
      }

      elNode.innerHTML = innerContent + handlesHtml;
      
      elNode.addEventListener('pointerdown', (e: PointerEvent) => {
        this.handleElementPointerDown(e);
      });

      this.overlayEl.appendChild(elNode);
    });
  }

  private updateSelectionOverlay() {
    this.renderElements();
  }

  private getSelectionBoxHtml(id: string): string {
    const el = this.getCurrentElements().find(item => item.id === id);
    let finishBtnHtml = '';
    if (el && (el.type === 'sticker' || el.type === 'image' || el.type === 'graphic')) {
      const curFinish = el.finishStyle || 'screenprint';
      finishBtnHtml = `
        <button class="action-mini-btn finish-btn" data-action="finish" title="Finish: ${curFinish.toUpperCase()} (Click to Cycle)">
          <span class="finish-pill">${curFinish.slice(0, 4).toUpperCase()}</span>
        </button>
      `;
    }

    return `
      <div class="selection-action-bar">
        <button class="action-mini-btn confirm-btn" data-action="confirm" title="Confirm Sticker Placement (✔)">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span class="confirm-text">Apply</span>
        </button>
        ${finishBtnHtml}
        <button class="action-mini-btn" data-action="duplicate" title="Duplicate">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button class="action-mini-btn" data-action="rotate-90" title="Rotate 90°">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
        </button>
        <button class="action-mini-btn delete-btn" data-action="delete" title="Delete">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="rotate-stem"></div>
      <div class="handle rotate-handle" data-handle="rotate" title="Drag to Rotate">
        <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
      </div>

      <div class="handle scale-handle nw" data-handle="nw"></div>
      <div class="handle scale-handle ne" data-handle="ne"></div>
      <div class="handle scale-handle se" data-handle="se"></div>
      <div class="handle scale-handle sw" data-handle="sw"></div>
    `;
  }

  /**
   * High-Resolution offscreen canvas rendering for 3D Decal Projection
   */
  public async syncArtworkToDecals() {
    await this.drawSideToCanvas(this.canvasFrontEl, this.state.frontElements);
    await this.drawSideToCanvas(this.canvasBackEl, this.state.backElements);
    this.threeScene.updateDecals(this.canvasFrontEl, this.canvasBackEl);
  }

  private async drawSideToCanvas(canvas: HTMLCanvasElement, elements: CanvasElement[]) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (elements.length === 0) return;

    const scale = canvas.width / 600; // 2x scale (1200 / 600)
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    for (const el of sorted) {
      // While an element is actively selected / being dragged in 2D, skip drawing it on the 3D decal so user only sees ONE sticker
      if (el.id === this.state.selectedId) {
        continue;
      }
      ctx.save();
      const elX = el.x * scale;
      const elY = el.y * scale;
      const elW = el.width * scale;
      const elH = el.height * scale;
      const cx = elX + elW / 2;
      const cy = elY + elH / 2;

      ctx.translate(cx, cy);
      ctx.rotate((el.rotation * Math.PI) / 180);

      if (el.type === 'sticker' || el.type === 'image') {
        const img = await this.loadOrGetImage(el.content);
        if (img) {
          // Subtle drop shadow for authentic vinyl sticker thickness
          ctx.shadowColor = 'rgba(0,0,0,0.18)';
          ctx.shadowBlur = 8 * scale;
          ctx.shadowOffsetY = 3 * scale;
          ctx.drawImage(img, -elW / 2, -elH / 2, elW, elH);
        }
      } else if (el.type === 'graphic') {
        const img = await this.loadSvgToImage(el.content);
        if (img) {
          ctx.shadowColor = 'rgba(0,0,0,0.15)';
          ctx.shadowBlur = 6 * scale;
          ctx.drawImage(img, -elW / 2, -elH / 2, elW, elH);
        }
      } else if (el.type === 'text') {
        ctx.font = `800 ${(el.fontSize || 34) * scale}px ${el.fontFamily || "'Bebas Neue', sans-serif"}`;
        ctx.fillStyle = el.fillColor || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Rich text shadow
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 6 * scale;
        ctx.shadowOffsetY = 2 * scale;

        if (el.strokeWidth && el.strokeWidth > 0) {
          ctx.strokeStyle = el.strokeColor || '#000000';
          ctx.lineWidth = el.strokeWidth * scale * 2;
          ctx.strokeText(el.content, 0, 0);
        }

        ctx.fillText(el.content, 0, 0);
      }

      ctx.restore();
    }
  }

  private loadOrGetImage(src: string): Promise<HTMLImageElement | null> {
    if (this.imageCache.has(src)) {
      return Promise.resolve(this.imageCache.get(src)!);
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  private loadSvgToImage(svg: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  // ============================================================================
  // POINTER & TRANSFORM EVENTS
  // ============================================================================

  private screenToSvgCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.overlayEl.getBoundingClientRect();
    const x = ((clientX - rect.left) / (rect.width || 1)) * 600;
    const y = ((clientY - rect.top) / (rect.height || 1)) * 680;
    return { 
      x: Math.max(0, Math.min(600, x)), 
      y: Math.max(0, Math.min(680, y)) 
    };
  }

  private initEventListeners() {
    this.overlayEl.addEventListener('pointerdown', this.handleElementPointerDown.bind(this));

    window.addEventListener('pointermove', this.handlePointerMove.bind(this));
    window.addEventListener('pointerup', this.handlePointerUp.bind(this));

    // HTML5 Drag & Drop Target
    const dropZone = this.containerEl;

    dropZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      const { x, y } = this.screenToSvgCoords(e.clientX, e.clientY);

      const colorData = e.dataTransfer?.getData('application/x-custom-color');
      if (colorData) {
        this.setShirtColor(colorData);
        return;
      }

      const stickerId = e.dataTransfer?.getData('application/x-custom-sticker');
      if (stickerId) {
        this.addSticker(stickerId, x, y);
        return;
      }

      const graphicId = e.dataTransfer?.getData('application/x-custom-graphic');
      if (graphicId) {
        this.addPresetGraphic(graphicId, x, y);
        return;
      }

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (loadEvt) => {
            if (loadEvt.target?.result) {
              this.addImage(loadEvt.target.result as string, file.name, x, y);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.state.selectedId) {
          e.preventDefault();
          this.deleteSelected();
        }
      } else if (e.key === 'Escape') {
        this.selectElement(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      }
    });
  }

  private handleElementPointerDown(e: PointerEvent) {
    const target = e.target as HTMLElement;

    // Mini Action Buttons
    const actionBtn = target.closest('.action-mini-btn') as HTMLElement;
    if (actionBtn) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      const action = actionBtn.dataset.action;
      const elNode = actionBtn.closest('.canvas-item') as HTMLElement;
      const id = elNode?.dataset.id;
      if (!id) return;

      if (action === 'confirm') {
        this.selectElement(null);
      } else if (action === 'delete') {
        this.deleteElement(id);
      } else if (action === 'duplicate') {
        this.duplicateElement(id);
      } else if (action === 'rotate-90') {
        const items = [...this.getCurrentElements()];
        const el = items.find(item => item.id === id);
        if (el) {
          el.rotation = (el.rotation + 90) % 360;
          this.setCurrentElements(items);
          this.render();
          this.recordHistory();
          this.triggerStateChange();
        }
      } else if (action === 'finish') {
        this.cycleElementFinish(id);
      }
      return;
    }

    // Handles (Scale & Rotate)
    const handle = target.closest('.handle') as HTMLElement;
    if (handle) {
      e.stopPropagation();
      const handleType = handle.dataset.handle;
      const elNode = handle.closest('.canvas-item') as HTMLElement;
      const id = elNode?.dataset.id;
      const el = this.getCurrentElements().find(item => item.id === id);
      if (!el || !id) return;

      const rect = elNode.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      if (handleType === 'rotate') {
        this.activeTransform = {
          type: 'rotate',
          elementId: id,
          startX: e.clientX,
          startY: e.clientY,
          origX: el.x,
          origY: el.y,
          origW: el.width,
          origH: el.height,
          origRot: el.rotation,
          centerX,
          centerY
        };
      } else {
        this.activeTransform = {
          type: 'resize',
          elementId: id,
          startX: e.clientX,
          startY: e.clientY,
          origX: el.x,
          origY: el.y,
          origW: el.width,
          origH: el.height,
          origRot: el.rotation,
          handle: handleType,
          centerX,
          centerY
        };
      }
      return;
    }

    // Direct Element Selection & Move Drag
    const itemEl = target.closest('.canvas-item') as HTMLElement;
    if (itemEl) {
      e.stopPropagation();
      const id = itemEl.dataset.id;
      if (!id) return;

      this.selectElement(id);
      const el = this.getCurrentElements().find(item => item.id === id);
      if (!el) return;

      this.activeTransform = {
        type: 'move',
        elementId: id,
        startX: e.clientX,
        startY: e.clientY,
        origX: el.x,
        origY: el.y,
        origW: el.width,
        origH: el.height,
        origRot: el.rotation
      };
      return;
    }

    // Click on empty canvas deselects
    this.selectElement(null);
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.activeTransform) return;

    const items = [...this.getCurrentElements()];
    const el = items.find(item => item.id === this.activeTransform!.elementId);
    if (!el) return;

    const overlayRect = this.overlayEl.getBoundingClientRect();
    const scaleFactorX = 600 / (overlayRect.width || 1);
    const scaleFactorY = 680 / (overlayRect.height || 1);

    const deltaX = (e.clientX - this.activeTransform.startX) * scaleFactorX;
    const deltaY = (e.clientY - this.activeTransform.startY) * scaleFactorY;

    if (this.activeTransform.type === 'move') {
      el.x = Math.round(Math.max(-50, Math.min(550, this.activeTransform.origX + deltaX)));
      el.y = Math.round(Math.max(-50, Math.min(600, this.activeTransform.origY + deltaY)));
    } else if (this.activeTransform.type === 'resize') {
      const handle = this.activeTransform.handle;
      const aspect = this.activeTransform.origW / (this.activeTransform.origH || 1);

      let newW = this.activeTransform.origW;
      if (handle === 'se') {
        newW = Math.max(40, Math.min(420, this.activeTransform.origW + deltaX));
      } else if (handle === 'sw') {
        newW = Math.max(40, Math.min(420, this.activeTransform.origW - deltaX));
      } else if (handle === 'ne') {
        newW = Math.max(40, Math.min(420, this.activeTransform.origW + deltaX));
      } else if (handle === 'nw') {
        newW = Math.max(40, Math.min(420, this.activeTransform.origW - deltaX));
      }

      el.width = Math.round(newW);
      el.height = Math.round(newW / aspect);
    } else if (this.activeTransform.type === 'rotate') {
      const cx = this.activeTransform.centerX!;
      const cy = this.activeTransform.centerY!;
      const rad = Math.atan2(e.clientY - cy, e.clientX - cx);
      let deg = Math.round((rad * 180) / Math.PI) + 90;
      if (deg < 0) deg += 360;
      el.rotation = deg % 360;
    }

    this.setCurrentElements(items);
    this.renderElements();
    this.syncArtworkToDecals();
  }

  private handlePointerUp() {
    if (this.activeTransform) {
      this.activeTransform = null;
      this.recordHistory();
      this.triggerStateChange();
    }
  }

  public dispose() {
    this.threeScene.dispose();
  }
}
