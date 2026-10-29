import './style.css';
import { TshirtEditor, type EditorState } from './editor';
import { APPAREL_STYLES } from './tshirt';
import { COLOR_PALETTES, TOY_STICKERS, PRESET_GRAPHICS } from './stickers';
import { exportTshirtImage } from './exporter';

document.addEventListener('DOMContentLoaded', () => {
  const canvasMountEl = document.getElementById('studio-main-canvas') as HTMLElement;
  if (!canvasMountEl) return;

  // Initialize Editor Engine
  const editor = new TshirtEditor(canvasMountEl);

  // Expose editor on window for debugging & scripting
  (window as any).editor = editor;

  // --- 1. Tab Navigation ---
  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  const tabPanes = document.querySelectorAll<HTMLElement>('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      if (!targetTab) return;

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(`tab-${targetTab}`);
      if (pane) pane.classList.add('active');
    });
  });

  // --- 0. Styles & Collar Setup ---
  initStylesAndCollar(editor);

  // --- 1. Color Palettes Setup ---
  initColorSwatches(editor);

  // --- 2. Toy Stickers Setup ---
  initToyStickers(editor);

  // --- 3. Custom Image & Presets Setup ---
  initImageUploadAndPresets(editor);

  // --- 4. Typography Customizer Setup ---
  initTypography(editor);

  // --- 5. Right Panel & Topbar Studio Controls ---
  initStudioControls(editor);

  // --- 6. State Sync & Layers Manager ---
  editor.onStateChange((state) => {
    syncUIWithState(editor, state);
  });
});

// ============================================================================
// APPAREL STYLES & COLLAR CONFIGURATION
// ============================================================================
function initStylesAndCollar(editor: TshirtEditor) {
  const listContainer = document.getElementById('style-cards-list');
  const btnWithoutCollar = document.getElementById('btn-collar-without') as HTMLButtonElement;
  const btnWithCollar = document.getElementById('btn-collar-with') as HTMLButtonElement;
  const btnQuickCollar = document.getElementById('btn-quick-collar') as HTMLButtonElement;

  if (listContainer) {
    listContainer.innerHTML = '';
    APPAREL_STYLES.forEach(style => {
      const card = document.createElement('div');
      card.className = `style-card ${editor.getState().shirtStyle === style.id ? 'active' : ''}`;
      card.dataset.styleId = style.id;

      card.innerHTML = `
        <div class="style-thumb-box">
          <img src="${style.frontImg}" alt="${style.name}" />
        </div>
        <div class="style-info-col">
          <div class="style-title-row">
            <span class="style-title">${style.name}</span>
            <span class="style-collar-badge">${style.badge}</span>
          </div>
          <span class="style-desc">${style.description}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        editor.setShirtStyle(style.id);
        flashHudMessage(`Applied silhouette: ${style.name} (${style.badge})`);
      });

      listContainer.appendChild(card);
    });
  }

  if (btnWithoutCollar && btnWithCollar) {
    btnWithoutCollar.addEventListener('click', () => {
      editor.setWithCollar(false);
      flashHudMessage('Switched to: Without Collar (Classic Crewneck)');
    });

    btnWithCollar.addEventListener('click', () => {
      editor.setWithCollar(true);
      flashHudMessage('Switched to: With Collar (Polo Shirt)');
    });
  }

  if (btnQuickCollar) {
    btnQuickCollar.addEventListener('click', () => {
      editor.toggleCollar();
      const isPolo = editor.getState().shirtStyle === 'polo';
      flashHudMessage(`Collar: ${isPolo ? 'ON (Polo Shirt with Collar)' : 'OFF (Crewneck without Collar)'}`);
    });
  }
}

// ============================================================================
// COLOR SWATCHES & PICKER INITIALIZATION
// ============================================================================
function initColorSwatches(editor: TshirtEditor) {
  const essentialGrid = document.getElementById('grid-essential-colors');
  const vibrantGrid = document.getElementById('grid-vibrant-colors');
  const pastelGrid = document.getElementById('grid-pastel-colors');
  const earthyGrid = document.getElementById('grid-earthy-colors');

  const nativePicker = document.getElementById('native-color-picker') as HTMLInputElement;
  const hexInput = document.getElementById('custom-hex-input') as HTMLInputElement;
  const previewCircle = document.getElementById('custom-color-preview') as HTMLElement;
  const applyHexBtn = document.getElementById('btn-apply-hex') as HTMLButtonElement;

  function renderCategorySwatches(category: string, container: HTMLElement | null) {
    if (!container) return;
    const swatches = COLOR_PALETTES.filter(c => c.category === category);
    container.innerHTML = '';

    swatches.forEach(s => {
      const chip = document.createElement('div');
      chip.className = `color-chip ${editor.getState().shirtColor.toLowerCase() === s.hex.toLowerCase() ? 'active' : ''}`;
      chip.dataset.color = s.hex;
      chip.title = `Drag onto shirt or click to apply: ${s.name} (${s.hex})`;
      chip.draggable = true;

      chip.innerHTML = `
        <div class="chip-circle" style="background-color: ${s.hex};"></div>
        <span class="chip-name">${s.name}</span>
      `;

      chip.addEventListener('click', () => {
        editor.setShirtColor(s.hex);
      });

      chip.addEventListener('dragstart', (e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData('application/x-custom-color', s.hex);
          e.dataTransfer.effectAllowed = 'copy';
        }
      });

      container.appendChild(chip);
    });
  }

  renderCategorySwatches('Essential', essentialGrid);
  renderCategorySwatches('Vibrant', vibrantGrid);
  renderCategorySwatches('Pastel', pastelGrid);
  renderCategorySwatches('Earthy', earthyGrid);

  if (nativePicker && hexInput && previewCircle) {
    // Live update on native color picker drag
    nativePicker.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      hexInput.value = val.toUpperCase();
      previewCircle.style.backgroundColor = val;
      editor.setShirtColor(val);
    });

    // Live update on typing hex color
    hexInput.addEventListener('input', () => {
      let val = hexInput.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
        nativePicker.value = val.length === 4 ? `#${val[1]}${val[1]}${val[2]}${val[2]}${val[3]}${val[3]}` : val;
        previewCircle.style.backgroundColor = val;
        editor.setShirtColor(val);
      }
    });

    applyHexBtn.addEventListener('click', () => {
      let val = hexInput.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        nativePicker.value = val;
        previewCircle.style.backgroundColor = val;
        editor.setShirtColor(val);
      }
    });

    hexInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        applyHexBtn.click();
      }
    });

    // Eyedropper API
    const btnEyedropper = document.getElementById('btn-eyedropper');
    if (btnEyedropper && 'EyeDropper' in window) {
      btnEyedropper.addEventListener('click', async () => {
        try {
          const eyeDropper = new (window as any).EyeDropper();
          const result = await eyeDropper.open();
          if (result?.sRGBHex) {
            const hex = result.sRGBHex;
            nativePicker.value = hex;
            hexInput.value = hex.toUpperCase();
            previewCircle.style.backgroundColor = hex;
            editor.setShirtColor(hex);
          }
        } catch (e) {
          // User cancelled
        }
      });
    }

    // HSL Fine-Tuning Sliders
    const sliderHue = document.getElementById('slider-hue') as HTMLInputElement;
    const sliderSat = document.getElementById('slider-sat') as HTMLInputElement;
    const sliderLight = document.getElementById('slider-light') as HTMLInputElement;
    const valHue = document.getElementById('val-hue');
    const valSat = document.getElementById('val-sat');
    const valLight = document.getElementById('val-light');

    function applyHsl() {
      if (!sliderHue || !sliderSat || !sliderLight) return;
      const h = parseInt(sliderHue.value, 10);
      const s = parseInt(sliderSat.value, 10);
      const l = parseInt(sliderLight.value, 10);

      if (valHue) valHue.textContent = `${h}°`;
      if (valSat) valSat.textContent = `${s}%`;
      if (valLight) valLight.textContent = `${l}%`;

      // HSL to Hex conversion
      const lightness = l / 100;
      const a = (s * Math.min(lightness, 1 - lightness)) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = lightness - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      const hex = `#${f(0)}${f(8)}${f(4)}`;

      nativePicker.value = hex;
      hexInput.value = hex.toUpperCase();
      previewCircle.style.backgroundColor = hex;
      editor.setShirtColor(hex);
    }

    if (sliderHue) sliderHue.addEventListener('input', applyHsl);
    if (sliderSat) sliderSat.addEventListener('input', applyHsl);
    if (sliderLight) sliderLight.addEventListener('input', applyHsl);


  }
}

// ============================================================================
// TOY STICKERS INITIALIZATION
// ============================================================================
function initToyStickers(editor: TshirtEditor) {
  // Finish Pills listener
  const finishPills = document.querySelectorAll<HTMLButtonElement>('#sticker-finish-pills .finish-pill');
  finishPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const finish = pill.dataset.finish as any;
      if (!finish) return;
      finishPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      editor.setDefaultStickerFinish(finish);

      const curSelected = editor.getState().selectedId;
      if (curSelected) {
        const sideElements = editor.getState().currentSide === 'front' 
          ? editor.getState().frontElements 
          : editor.getState().backElements;
        const el = sideElements.find(item => item.id === curSelected);
        if (el && (el.type === 'sticker' || el.type === 'image' || el.type === 'graphic')) {
          el.finishStyle = finish;
          editor.render();
        }
      }
      flashHudMessage(`Print finish set to ${finish.toUpperCase()}`);
    });
  });

  const stickersGrid = document.getElementById('toy-stickers-grid');
  const filterPills = document.querySelectorAll<HTMLButtonElement>('#sticker-filter-pills .pill');
  if (!stickersGrid) return;

  function renderStickers(category: string) {
    if (!stickersGrid) return;
    stickersGrid.innerHTML = '';

    const list = category === 'all' 
      ? TOY_STICKERS 
      : TOY_STICKERS.filter(s => s.category === category);

    list.forEach(sticker => {
      const card = document.createElement('div');
      card.className = 'toy-sticker-card';
      card.draggable = true;
      card.dataset.stickerId = sticker.id;
      card.title = `Drag onto T-shirt to place, or click to center: ${sticker.name}`;

      card.innerHTML = `
        <span class="toy-drag-badge">${sticker.badge || '3D VINYL'}</span>
        <div class="sticker-preview-box">
          <img src="${sticker.imgUrl}" alt="${sticker.name}" class="sticker-preview-img" />
        </div>
        <span class="toy-sticker-name">${sticker.name}</span>
      `;

      card.addEventListener('click', () => {
        editor.addSticker(sticker.id);
        flashHudMessage(`Added "${sticker.name}" to shirt!`);
      });

      card.addEventListener('dragstart', (e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData('application/x-custom-sticker', sticker.id);
          e.dataTransfer.effectAllowed = 'copy';
        }
      });

      stickersGrid.appendChild(card);
    });
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderStickers(pill.dataset.category || 'all');
    });
  });

  renderStickers('all');
}

// ============================================================================
// IMAGE UPLOAD & PRESET GRAPHICS INITIALIZATION
// ============================================================================
function initImageUploadAndPresets(editor: TshirtEditor) {
  const fileDropZone = document.getElementById('file-drop-zone') as HTMLElement;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const triggerBtn = document.getElementById('btn-trigger-upload') as HTMLButtonElement;
  const userUploadsSection = document.getElementById('user-uploads-section') as HTMLElement;
  const userUploadsGrid = document.getElementById('user-uploads-grid') as HTMLElement;
  const presetsGrid = document.getElementById('preset-graphics-grid') as HTMLElement;

  if (presetsGrid) {
    presetsGrid.innerHTML = '';
    PRESET_GRAPHICS.forEach(preset => {
      const card = document.createElement('div');
      card.className = 'preset-graphic-card';
      card.draggable = true;
      card.dataset.presetId = preset.id;
      card.title = `Drag onto T-shirt: ${preset.title}`;

      card.innerHTML = `
        <div class="preset-preview-box">${preset.svg}</div>
        <span class="item-caption">${preset.title}</span>
      `;

      card.addEventListener('click', () => {
        editor.addPresetGraphic(preset.id);
        flashHudMessage(`Added "${preset.title}" to shirt!`);
      });

      card.addEventListener('dragstart', (e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData('application/x-custom-graphic', preset.id);
          e.dataTransfer.effectAllowed = 'copy';
        }
      });

      presetsGrid.appendChild(card);
    });
  }

  if (triggerBtn && fileInput) {
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    fileDropZone.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        processUploadedFile(fileInput.files[0], editor, userUploadsSection, userUploadsGrid);
      }
    });

    fileDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropZone.classList.add('dragover');
    });

    fileDropZone.addEventListener('dragleave', () => {
      fileDropZone.classList.remove('dragover');
    });

    fileDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropZone.classList.remove('dragover');
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        processUploadedFile(e.dataTransfer.files[0], editor, userUploadsSection, userUploadsGrid);
      }
    });
  }
}

function processUploadedFile(file: File, editor: TshirtEditor, section: HTMLElement, grid: HTMLElement) {
  if (!file.type.startsWith('image/')) {
    alert('Please choose an image file (PNG, JPG, WebP, or SVG).');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    if (!dataUrl) return;

    editor.addImage(dataUrl, file.name);
    flashHudMessage(`Loaded "${file.name}" onto shirt!`);

    section.style.display = 'block';
    const item = document.createElement('div');
    item.className = 'user-upload-item';
    item.draggable = true;
    item.title = `Drag onto shirt: ${file.name}`;

    item.innerHTML = `
      <img src="${dataUrl}" class="user-upload-img" alt="${file.name}" />
      <span class="item-caption">${file.name}</span>
    `;

    item.addEventListener('click', () => {
      editor.addImage(dataUrl, file.name);
    });

    item.addEventListener('dragstart', (evt) => {
      if (evt.dataTransfer) {
        evt.dataTransfer.setData('text/plain', dataUrl);
      }
    });

    grid.prepend(item);
  };
  reader.readAsDataURL(file);
}

// ============================================================================
// TYPOGRAPHY INITIALIZATION
// ============================================================================
function initTypography(editor: TshirtEditor) {
  const textInput = document.getElementById('text-input-field') as HTMLInputElement;
  const fontSelect = document.getElementById('font-family-select') as HTMLSelectElement;
  const colorPicker = document.getElementById('font-color-picker') as HTMLInputElement;
  const addBtn = document.getElementById('btn-add-text') as HTMLButtonElement;
  const colorDots = document.querySelectorAll<HTMLButtonElement>('.color-dot');

  // Sliders and controls
  const fontSizeSlider = document.getElementById('font-size-slider') as HTMLInputElement;
  const fontSizeVal = document.getElementById('font-size-val');
  const letterSpacingSlider = document.getElementById('letter-spacing-slider') as HTMLInputElement;
  const letterSpacingVal = document.getElementById('letter-spacing-val');
  const strokeWidthSlider = document.getElementById('stroke-width-slider') as HTMLInputElement;
  const strokeWidthVal = document.getElementById('stroke-width-val');
  const strokeColorPicker = document.getElementById('stroke-color-picker') as HTMLInputElement;
  const curvedCheckbox = document.getElementById('curved-text-checkbox') as HTMLInputElement;
  const presetButtons = document.querySelectorAll<HTMLButtonElement>('#text-style-presets .style-preset-btn');

  let activeFontColor = '#ffffff';
  let activeTextStyle: any = 'puff';

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTextStyle = btn.dataset.style || 'puff';
      const curSelected = editor.getState().selectedId;
      if (curSelected) {
        editor.updateSelectedText({ textStyle: activeTextStyle });
      }
    });
  });

  if (textInput) {
    textInput.addEventListener('input', () => {
      const curSelected = editor.getState().selectedId;
      if (curSelected) {
        editor.updateSelectedText({ text: textInput.value });
      }
    });
  }

  if (fontSelect) {
    fontSelect.addEventListener('change', () => {
      const curSelected = editor.getState().selectedId;
      if (curSelected) {
        editor.updateSelectedText({ fontFamily: fontSelect.value });
      }
    });
  }

  if (fontSizeSlider && fontSizeVal) {
    fontSizeSlider.addEventListener('input', () => {
      const val = parseInt(fontSizeSlider.value, 10);
      fontSizeVal.textContent = `${val}px`;
      const curSelected = editor.getState().selectedId;
      if (curSelected) {
        editor.updateSelectedText({ fontSize: val });
      }
    });
  }

  if (letterSpacingSlider && letterSpacingVal) {
    letterSpacingSlider.addEventListener('input', () => {
      const val = parseInt(letterSpacingSlider.value, 10);
      letterSpacingVal.textContent = `${val}px`;
      const curSelected = editor.getState().selectedId;
      if (curSelected) {
        editor.updateSelectedText({ letterSpacing: val });
      }
    });
  }

  if (strokeWidthSlider && strokeWidthVal) {
    strokeWidthSlider.addEventListener('input', () => {
      const val = parseInt(strokeWidthSlider.value, 10);
      strokeWidthVal.textContent = `${val}px`;
      const curSelected = editor.getState().selectedId;
      if (curSelected) {
        editor.updateSelectedText({ strokeWidth: val });
      }
    });
  }

  if (strokeColorPicker) {
    strokeColorPicker.addEventListener('input', () => {
      const curSelected = editor.getState().selectedId;
      if (curSelected) {
        editor.updateSelectedText({ strokeColor: strokeColorPicker.value });
      }
    });
  }

  if (curvedCheckbox) {
    curvedCheckbox.addEventListener('change', () => {
      const curSelected = editor.getState().selectedId;
      if (curSelected) {
        editor.updateSelectedText({ isCurved: curvedCheckbox.checked });
      }
    });
  }

  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      activeFontColor = dot.dataset.fcolor || '#ffffff';
      colorPicker.value = activeFontColor;
      const curSelected = editor.getState().selectedId;
      if (curSelected) {
        editor.updateSelectedText({ fillColor: activeFontColor });
      }
    });
  });

  colorPicker.addEventListener('input', (e) => {
    activeFontColor = (e.target as HTMLInputElement).value;
    const curSelected = editor.getState().selectedId;
    if (curSelected) {
      editor.updateSelectedText({ fillColor: activeFontColor });
    }
  });

  if (addBtn && textInput) {
    addBtn.addEventListener('click', () => {
      const txt = textInput.value.trim();
      if (!txt) return;

      const fontSize = fontSizeSlider ? parseInt(fontSizeSlider.value, 10) : 34;
      const letterSpacing = letterSpacingSlider ? parseInt(letterSpacingSlider.value, 10) : 2;
      const strokeWidth = strokeWidthSlider ? parseInt(strokeWidthSlider.value, 10) : 0;
      const strokeColor = strokeColorPicker ? strokeColorPicker.value : '#000000';
      const isCurved = curvedCheckbox ? curvedCheckbox.checked : false;

      editor.addCustomText(txt, fontSelect.value, activeFontColor, {
        style: activeTextStyle,
        fontSize,
        letterSpacing,
        strokeWidth,
        strokeColor,
        isCurved
      });
      flashHudMessage(`Placed "${txt}" with ${activeTextStyle.toUpperCase()} style!`);
    });
  }
}

// ============================================================================
// ============================================================================
// RIGHT PANEL & TOPBAR STUDIO CONTROLS
// ============================================================================
function initStudioControls(editor: TshirtEditor) {
  const btnFront = document.getElementById('btn-view-front') as HTMLButtonElement;
  const btnBack = document.getElementById('btn-view-back') as HTMLButtonElement;
  const btnHero = document.getElementById('btn-view-hero') as HTMLButtonElement;
  const btnLeft = document.getElementById('btn-view-left') as HTMLButtonElement;
  const btnRight = document.getElementById('btn-view-right') as HTMLButtonElement;
  const btnTop = document.getElementById('btn-view-top') as HTMLButtonElement;
  const btnQuickFlip = document.getElementById('btn-quick-flip') as HTMLButtonElement;
  const btnReset3D = document.getElementById('btn-reset-3d') as HTMLButtonElement;
  const btnTurntable = document.getElementById('btn-turntable-spin') as HTMLButtonElement;

  if (btnFront) btnFront.addEventListener('click', () => editor.setCameraPreset('front'));
  if (btnBack) btnBack.addEventListener('click', () => editor.setCameraPreset('back'));
  if (btnHero) btnHero.addEventListener('click', () => editor.setCameraPreset('hero'));
  if (btnLeft) btnLeft.addEventListener('click', () => editor.setCameraPreset('left'));
  if (btnRight) btnRight.addEventListener('click', () => editor.setCameraPreset('right'));
  if (btnTop) btnTop.addEventListener('click', () => editor.setCameraPreset('top'));

  if (btnQuickFlip) {
    btnQuickFlip.addEventListener('click', () => {
      editor.toggleSide();
    });
  }

  if (btnReset3D) {
    btnReset3D.addEventListener('click', () => {
      editor.reset3DView();
      flashHudMessage('Reset 3D camera to Front Studio View');
    });
  }

  if (btnTurntable) {
    btnTurntable.addEventListener('click', () => {
      const active = editor.toggleTurntable();
      flashHudMessage(active ? '360° Auto-Turntable: ACTIVE' : '360° Auto-Turntable: PAUSED');
    });
  }

  // Floating XYZ Dock toggle & sliders
  const btnToggleXyz = document.getElementById('btn-toggle-xyz-dock') as HTMLButtonElement;
  const btnCloseXyz = document.getElementById('btn-close-xyz-dock') as HTMLButtonElement;
  const xyzDock = document.getElementById('xyz-floating-dock') as HTMLElement;
  const sliderX = document.getElementById('slider-rot-x') as HTMLInputElement;
  const sliderY = document.getElementById('slider-rot-y') as HTMLInputElement;
  const sliderZ = document.getElementById('slider-rot-z') as HTMLInputElement;
  const valX = document.getElementById('val-rot-x');
  const valY = document.getElementById('val-rot-y');
  const valZ = document.getElementById('val-rot-z');
  const btnZeroXyz = document.getElementById('btn-zero-xyz') as HTMLButtonElement;

  if (btnToggleXyz && xyzDock) {
    btnToggleXyz.addEventListener('click', () => {
      const isHidden = xyzDock.style.display === 'none';
      xyzDock.style.display = isHidden ? 'block' : 'none';
      btnToggleXyz.classList.toggle('active', isHidden);
    });
  }

  if (btnCloseXyz && xyzDock && btnToggleXyz) {
    btnCloseXyz.addEventListener('click', () => {
      xyzDock.style.display = 'none';
      btnToggleXyz.classList.remove('active');
    });
  }

  function applySlidersToRotation() {
    if (!sliderX || !sliderY || !sliderZ) return;
    const x = parseFloat(sliderX.value) || 0;
    const y = parseFloat(sliderY.value) || 0;
    const z = parseFloat(sliderZ.value) || 0;

    if (valX) valX.textContent = `${x}°`;
    if (valY) valY.textContent = `${y}°`;
    if (valZ) valZ.textContent = `${z}°`;

    editor.setRotationXYZ(x, y, z);
  }

  if (sliderX) sliderX.addEventListener('input', applySlidersToRotation);
  if (sliderY) sliderY.addEventListener('input', applySlidersToRotation);
  if (sliderZ) sliderZ.addEventListener('input', applySlidersToRotation);

  if (btnZeroXyz) {
    btnZeroXyz.addEventListener('click', () => {
      if (sliderX) sliderX.value = '0';
      if (sliderY) sliderY.value = '0';
      if (sliderZ) sliderZ.value = '0';
      applySlidersToRotation();
    });
  }

  const btnToggleGuide = document.getElementById('btn-toggle-guide') as HTMLButtonElement;
  if (btnToggleGuide) {
    btnToggleGuide.addEventListener('click', () => {
      const guideBoundaries = document.querySelectorAll('.print-guide-boundary');
      let isNowActive = false;
      guideBoundaries.forEach(el => {
        const isHidden = el.classList.toggle('hidden');
        isNowActive = !isHidden;
      });
      btnToggleGuide.classList.toggle('active', isNowActive);
    });
  }

  const btnZoomIn = document.getElementById('btn-zoom-in') as HTMLButtonElement;
  const btnZoomOut = document.getElementById('btn-zoom-out') as HTMLButtonElement;
  const btnZoomReset = document.getElementById('btn-zoom-reset') as HTMLButtonElement;

  if (btnZoomIn) btnZoomIn.addEventListener('click', () => editor.zoomIn());
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => editor.zoomOut());
  if (btnZoomReset) btnZoomReset.addEventListener('click', () => editor.resetZoom());

  const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
  const btnRedo = document.getElementById('btn-redo') as HTMLButtonElement;

  if (btnUndo) btnUndo.addEventListener('click', () => editor.undo());
  if (btnRedo) btnRedo.addEventListener('click', () => editor.redo());

  const btnClearSide = document.getElementById('btn-clear-side') as HTMLButtonElement;
  if (btnClearSide) {
    btnClearSide.addEventListener('click', () => {
      if (confirm(`Clear all custom elements on the ${editor.getState().currentSide.toUpperCase()} view?`)) {
        editor.clearCurrentSide();
        flashHudMessage(`Cleared ${editor.getState().currentSide.toUpperCase()} design`);
      }
    });
  }

  const btnExport = document.getElementById('btn-export-png') as HTMLButtonElement;
  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      flashHudMessage('Generating high-resolution 3D photorealistic mockup...');
      try {
        await exportTshirtImage(editor);
        flashHudMessage('3D Photorealistic mockup downloaded successfully!');
      } catch (err) {
        console.error('Export error', err);
        flashHudMessage('Export failed. Check console for details.');
      }
    });
  }
}

// ============================================================================
// STATE SYNC & LAYERS LIST
// ============================================================================
function syncUIWithState(editor: TshirtEditor, state: EditorState) {
  // Update Collar Buttons Active State
  const btnWithoutCollar = document.getElementById('btn-collar-without');
  const btnWithCollar = document.getElementById('btn-collar-with');
  const hasCollar = state.shirtStyle === 'polo';

  if (btnWithoutCollar && btnWithCollar) {
    btnWithoutCollar.classList.toggle('active', !hasCollar);
    btnWithCollar.classList.toggle('active', hasCollar);
  }

  // Update Style Cards Active State
  const styleCards = document.querySelectorAll<HTMLElement>('.style-card');
  styleCards.forEach(card => {
    card.classList.toggle('active', card.dataset.styleId === state.shirtStyle);
  });

  // 3D Perspective Preset Buttons Active State
  const btnFront = document.getElementById('btn-view-front');
  const btnBack = document.getElementById('btn-view-back');
  const btnHero = document.getElementById('btn-view-hero');
  const btnLeft = document.getElementById('btn-view-left');
  const btnRight = document.getElementById('btn-view-right');
  const btnTop = document.getElementById('btn-view-top');

  if (btnFront) btnFront.classList.toggle('active', state.cameraPreset === 'front');
  if (btnBack) btnBack.classList.toggle('active', state.cameraPreset === 'back');
  if (btnHero) btnHero.classList.toggle('active', state.cameraPreset === 'hero');
  if (btnLeft) btnLeft.classList.toggle('active', state.cameraPreset === 'left');
  if (btnRight) btnRight.classList.toggle('active', state.cameraPreset === 'right');
  if (btnTop) btnTop.classList.toggle('active', state.cameraPreset === 'top');

  // Turntable Active State
  const btnTurntable = document.getElementById('btn-turntable-spin');
  if (btnTurntable) {
    btnTurntable.classList.toggle('active', state.isTurntable);
  }

  // Sync sliders if user isn't dragging them
  const sliderX = document.getElementById('slider-rot-x') as HTMLInputElement;
  const sliderY = document.getElementById('slider-rot-y') as HTMLInputElement;
  const sliderZ = document.getElementById('slider-rot-z') as HTMLInputElement;
  const valX = document.getElementById('val-rot-x');
  const valY = document.getElementById('val-rot-y');
  const valZ = document.getElementById('val-rot-z');

  if (sliderX && document.activeElement !== sliderX) {
    sliderX.value = String(state.angles.pitch);
    if (valX) valX.textContent = `${state.angles.pitch}°`;
  }
  if (sliderY && document.activeElement !== sliderY) {
    sliderY.value = String(state.angles.yaw);
    if (valY) valY.textContent = `${state.angles.yaw}°`;
  }
  if (sliderZ && document.activeElement !== sliderZ) {
    sliderZ.value = String(state.angles.roll);
    if (valZ) valZ.textContent = `${state.angles.roll}°`;
  }

  // Zoom Percentage Display
  const zoomLabel = document.getElementById('zoom-percentage');
  if (zoomLabel) {
    zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  // Undo / Redo Buttons
  const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
  const btnRedo = document.getElementById('btn-redo') as HTMLButtonElement;
  if (btnUndo) btnUndo.disabled = !editor.canUndo();
  if (btnRedo) btnRedo.disabled = !editor.canRedo();

  // Color Swatches Active State
  const chips = document.querySelectorAll<HTMLElement>('.color-chip');
  chips.forEach(chip => {
    const isCur = chip.dataset.color?.toLowerCase() === state.shirtColor.toLowerCase();
    chip.classList.toggle('active', isCur);
  });

  // Layer Count Badge in Tab
  const layerBadge = document.getElementById('layer-count');
  const currentElements = state.currentSide === 'front' ? state.frontElements : state.backElements;
  if (layerBadge) {
    layerBadge.textContent = `${currentElements.length}`;
  }

  // Sync Selected Text Properties with Typography Sidebar Controls
  const selectedEl = currentElements.find(el => el.id === state.selectedId);
  if (selectedEl && selectedEl.type === 'text') {
    const textInput = document.getElementById('text-input-field') as HTMLInputElement;
    const fontSelect = document.getElementById('font-family-select') as HTMLSelectElement;
    const colorPicker = document.getElementById('font-color-picker') as HTMLInputElement;
    const fontSizeSlider = document.getElementById('font-size-slider') as HTMLInputElement;
    const fontSizeVal = document.getElementById('font-size-val');
    const letterSpacingSlider = document.getElementById('letter-spacing-slider') as HTMLInputElement;
    const letterSpacingVal = document.getElementById('letter-spacing-val');
    const curvedCheckbox = document.getElementById('curved-text-checkbox') as HTMLInputElement;
    const strokeWidthSlider = document.getElementById('stroke-width-slider') as HTMLInputElement;
    const strokeWidthVal = document.getElementById('stroke-width-val');
    const strokeColorPicker = document.getElementById('stroke-color-picker') as HTMLInputElement;
    const presetButtons = document.querySelectorAll<HTMLButtonElement>('#text-style-presets .style-preset-btn');

    if (textInput && document.activeElement !== textInput) textInput.value = selectedEl.content;
    if (fontSelect && selectedEl.fontFamily) fontSelect.value = selectedEl.fontFamily;
    if (colorPicker && selectedEl.fillColor) colorPicker.value = selectedEl.fillColor;
    if (fontSizeSlider && selectedEl.fontSize) {
      fontSizeSlider.value = String(selectedEl.fontSize);
      if (fontSizeVal) fontSizeVal.textContent = `${selectedEl.fontSize}px`;
    }
    if (letterSpacingSlider && selectedEl.letterSpacing !== undefined) {
      letterSpacingSlider.value = String(selectedEl.letterSpacing);
      if (letterSpacingVal) letterSpacingVal.textContent = `${selectedEl.letterSpacing}px`;
    }
    if (strokeWidthSlider && selectedEl.strokeWidth !== undefined) {
      strokeWidthSlider.value = String(selectedEl.strokeWidth);
      if (strokeWidthVal) strokeWidthVal.textContent = `${selectedEl.strokeWidth}px`;
    }
    if (strokeColorPicker && selectedEl.strokeColor) strokeColorPicker.value = selectedEl.strokeColor;
    if (curvedCheckbox) curvedCheckbox.checked = !!selectedEl.isCurved;
    if (presetButtons && selectedEl.textStyle) {
      presetButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.style === selectedEl.textStyle);
      });
    }
  }

  // Layers Tab Listing
  const layersSideLabel = document.getElementById('layers-current-side-label');
  if (layersSideLabel) {
    layersSideLabel.textContent = state.currentSide.toUpperCase();
  }

  const layersList = document.getElementById('layers-list');
  if (layersList) {
    if (currentElements.length === 0) {
      layersList.innerHTML = `<div class="empty-layers-msg">No custom elements on the ${state.currentSide} side yet.<br/>Drag stickers or images from the left tabs!</div>`;
    } else {
      layersList.innerHTML = '';
      [...currentElements].reverse().forEach(el => {
        const row = document.createElement('div');
        row.className = `layer-item-row ${el.id === state.selectedId ? 'selected' : ''}`;
        row.dataset.id = el.id;

        let thumb = '';
        if (el.type === 'sticker' || el.type === 'image') {
          thumb = `<img src="${el.content}" alt="layer" />`;
        } else if (el.type === 'graphic') {
          thumb = el.content;
        } else {
          thumb = `<span style="font-weight: bold; font-size: 10px;">TXT</span>`;
        }

        row.innerHTML = `
          <div class="layer-info-cluster">
            <div class="layer-thumb-preview">${thumb}</div>
            <span class="layer-title-text">${el.name}</span>
          </div>
          <div class="layer-actions-group">
            <button class="layer-action-btn up" data-action="up" title="Bring Forward">▲</button>
            <button class="layer-action-btn down" data-action="down" title="Send Backward">▼</button>
            <button class="layer-action-btn del" data-action="del" title="Delete">✕</button>
          </div>
        `;

        row.addEventListener('click', (e) => {
          const actionBtn = (e.target as HTMLElement).closest('.layer-action-btn') as HTMLElement;
          if (actionBtn) {
            e.stopPropagation();
            const act = actionBtn.dataset.action;
            if (act === 'up') editor.bringForward(el.id);
            if (act === 'down') editor.sendBackward(el.id);
            if (act === 'del') {
              editor.selectElement(el.id);
              editor.deleteSelected();
            }
            return;
          }
          editor.selectElement(el.id);
        });

        layersList.appendChild(row);
      });
    }
  }
}

// Flash Toast helper
let hudTimer: number | null = null;
function flashHudMessage(msg: string) {
  const hudEl = document.getElementById('hud-message');
  if (!hudEl) return;
  hudEl.textContent = msg;

  if (hudTimer) clearTimeout(hudTimer);
  hudTimer = window.setTimeout(() => {
    hudEl.textContent = 'Ready • Drag any element from the left panel onto the shirt';
  }, 4000);
}
