import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

export type CameraPreset = 'front' | 'back' | 'left' | 'right' | 'hero' | 'top';

export interface ThreeSceneOptions {
  container: HTMLElement;
  initialColor?: string;
  onAngleChange?: (pitch: number, yaw: number, roll: number) => void;
  onModelLoaded?: () => void;
}

export class ThreeScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  // 3D Model references
  private shirtGroup: THREE.Group;
  private shirtMeshes: THREE.Mesh[] = [];
  private shirtMaterials: THREE.MeshStandardMaterial[] = [];

  private currentColor: string = '#ffffff';

  // Decals
  private frontDecalMesh: THREE.Mesh | null = null;
  private backDecalMesh: THREE.Mesh | null = null;
  private frontDecalTexture: THREE.CanvasTexture | null = null;
  private backDecalTexture: THREE.CanvasTexture | null = null;

  // Normal Map for ultra-realistic fabric weave and micro-creases
  private fabricNormalMap: THREE.Texture | null = null;

  // Turntable & Animation
  private isTurntableActive: boolean = false;
  private animationFrameId: number | null = null;
  private isDisposed: boolean = false;



  // Callbacks
  private onAngleChangeCb?: (pitch: number, yaw: number, roll: number) => void;
  private onModelLoadedCb?: () => void;

  constructor(options: ThreeSceneOptions) {
    this.container = options.container;
    this.currentColor = options.initialColor || '#ffffff';
    this.onAngleChangeCb = options.onAngleChange;
    this.onModelLoadedCb = options.onModelLoaded;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 700;
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 0.05, 2.5);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 4.5;
    this.controls.maxPolarAngle = Math.PI * 0.95;
    this.controls.minPolarAngle = Math.PI * 0.05;
    this.controls.target.set(0, 0, 0);

    // Track angles on control changes
    this.controls.addEventListener('change', () => {
      this.broadcastOrientation();
    });

    // 5. Setup Lighting & Floor
    this.setupLighting();
    this.setupFloorShadow();

    // 6. 3D Model Root Group
    this.shirtGroup = new THREE.Group();
    this.scene.add(this.shirtGroup);

    // 7. Load Normal Map and 3D Model
    this.loadFabricTexture();
    this.loadTshirtModel();

    // 8. Event Listeners & Animation Loop
    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private setupLighting() {
    // Soft Ambient global fill
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd8e2ed, 0.9);
    hemiLight.position.set(0, 10, 0);
    this.scene.add(hemiLight);

    // Studio Key Light (Front-Right Top)
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.4);
    keyLight.position.set(2.5, 3.5, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0002;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Studio Fill Light (Front-Left Low)
    const fillLight = new THREE.DirectionalLight(0xe8f0ff, 0.7);
    fillLight.position.set(-3.0, 1.5, 2.5);
    this.scene.add(fillLight);

    // Subtle Rim / Backlight for edge separation
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    rimLight.position.set(0, 3.5, -3.5);
    this.scene.add(rimLight);

    // Additional subtle under-bounce light
    const bounceLight = new THREE.DirectionalLight(0xf1f5f9, 0.4);
    bounceLight.position.set(0, -2.5, 1.0);
    this.scene.add(bounceLight);
  }

  private setupFloorShadow() {
    // Ground Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.92;
    shadowMesh.receiveShadow = true;
    this.scene.add(shadowMesh);

    // Radial gradient contact shadow under the shirt
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.28)');
      grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.12)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
    const contactTexture = new THREE.CanvasTexture(canvas);
    const contactGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const contactMat = new THREE.MeshBasicMaterial({
      map: contactTexture,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    const contactMesh = new THREE.Mesh(contactGeo, contactMat);
    contactMesh.rotation.x = -Math.PI / 2;
    contactMesh.position.y = -0.915;
    this.scene.add(contactMesh);
  }

  private loadFabricTexture() {
    const texLoader = new THREE.TextureLoader();
    texLoader.load(
      '/models/extracted_0.jpg',
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        this.fabricNormalMap = texture;
        this.applyFabricPropertiesToMaterials();
      },
      undefined,
      () => {
        // Fallback or ignore if not present
      }
    );
  }

  private loadTshirtModel() {
    const loader = new GLTFLoader();

    // Primary model: user-uploaded /models/tshirt.glb
    loader.load(
      '/models/tshirt.glb',
      (gltf) => {
        this.setupLoadedModel(gltf.scene);
      },
      undefined,
      (err) => {
        console.warn('Could not load /models/tshirt.glb, attempting fallback to /models/shirt_baked.glb:', err);
        loader.load(
          '/models/shirt_baked.glb',
          (fallbackGltf) => {
            this.setupLoadedModel(fallbackGltf.scene);
          },
          undefined,
          (err2) => {
            console.error('Failed to load 3D shirt model:', err2);
          }
        );
      }
    );
  }

  private setupLoadedModel(rawModel: THREE.Group) {
    this.shirtGroup.clear();
    this.shirtMeshes = [];
    this.shirtMaterials = [];
    this.frontDecalMesh = null;
    this.backDecalMesh = null;

    // 1. Force world matrix calculation on loaded model hierarchy
    rawModel.updateMatrixWorld(true);

    // Compute exact bounding box of the imported model
    const box = new THREE.Box3().setFromObject(rawModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    // Target height ~ 1.65 in studio space
    const targetScale = 1.65 / (maxDim || 1);

    // 2. Extract meshes and bake transforms & normalization directly into geometry
    rawModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geo = mesh.geometry.clone();

        // Bake the node's world transform into the geometry vertices
        geo.applyMatrix4(mesh.matrixWorld);

        // Center at origin and scale to human torso dimensions
        geo.translate(-center.x, -center.y, -center.z);
        geo.scale(targetScale, targetScale, targetScale);

        // Rotate 180° around Y so front chest faces the default camera (+Z)
        geo.rotateY(Math.PI);
        geo.computeVertexNormals();
        geo.computeBoundingBox();

        const normalizedMesh = new THREE.Mesh(geo);
        normalizedMesh.castShadow = true;
        normalizedMesh.receiveShadow = true;

        const clothMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(this.currentColor),
          roughness: 0.85,
          metalness: 0.02,
          side: THREE.DoubleSide
        });

        normalizedMesh.material = clothMat;
        this.shirtGroup.add(normalizedMesh);
        this.shirtMeshes.push(normalizedMesh);
        this.shirtMaterials.push(clothMat);
      }
    });

    // Identify front and back meshes
    let frontMesh = this.shirtMeshes.find((m) => m.name.includes('Object_4')) || null;
    let backMesh = this.shirtMeshes.find((m) => m.name.includes('Object_6')) || null;

    if (!frontMesh && this.shirtMeshes.length > 0) {
      frontMesh = this.shirtMeshes[0];
    }
    if (!backMesh && this.shirtMeshes.length > 1) {
      backMesh = this.shirtMeshes[1];
    } else if (!backMesh && this.shirtMeshes.length > 0) {
      backMesh = this.shirtMeshes[0];
    }

    // Re-apply fabric normal map if loaded
    this.applyFabricPropertiesToMaterials();

    // Create front and back decal meshes calibrated to 600x680 torso coordinate space
    if (frontMesh && backMesh) {
      this.initDecalMeshes(frontMesh, backMesh);
    }

    if (this.onModelLoadedCb) {
      this.onModelLoadedCb();
    }
  }

  private applyFabricPropertiesToMaterials() {
    this.shirtMaterials.forEach((mat) => {
      mat.color.setStyle(this.currentColor);
      mat.roughness = 0.84;
      mat.metalness = 0.02;
      if (this.fabricNormalMap) {
        mat.normalMap = this.fabricNormalMap;
        mat.normalScale = new THREE.Vector2(0.35, 0.35);
      }
      mat.needsUpdate = true;
    });
  }

  /**
   * Initializes Front and Back 3D Decal geometries conforming to the T-shirt surface
   */
  private initDecalMeshes(frontMesh: THREE.Mesh, backMesh: THREE.Mesh) {
    const decalSize = new THREE.Vector3(1.02, 1.16, 0.45);
    const frontPos = new THREE.Vector3(0, -0.02, 0.34);
    const backPos = new THREE.Vector3(0, -0.02, -0.32);

    // 1. Front Decal
    const frontDecalGeo = new DecalGeometry(
      frontMesh,
      frontPos,
      new THREE.Euler(0, 0, 0),
      decalSize
    );

    const dummyFrontCanvas = document.createElement('canvas');
    dummyFrontCanvas.width = 1200;
    dummyFrontCanvas.height = 1360;

    this.frontDecalTexture = new THREE.CanvasTexture(dummyFrontCanvas);
    this.frontDecalTexture.colorSpace = THREE.SRGBColorSpace;
    this.frontDecalTexture.flipY = true;
    this.frontDecalTexture.anisotropy = 16;
    this.frontDecalTexture.minFilter = THREE.LinearFilter;
    this.frontDecalTexture.magFilter = THREE.LinearFilter;

    const frontMat = new THREE.MeshStandardMaterial({
      map: this.frontDecalTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      roughness: 0.75,
      metalness: 0.02
    });

    this.frontDecalMesh = new THREE.Mesh(frontDecalGeo, frontMat);
    this.frontDecalMesh.renderOrder = 10;
    this.frontDecalMesh.visible = false;
    this.shirtGroup.add(this.frontDecalMesh);

    // 2. Back Decal
    const backDecalGeo = new DecalGeometry(
      backMesh,
      backPos,
      new THREE.Euler(0, Math.PI, 0),
      decalSize
    );

    const dummyBackCanvas = document.createElement('canvas');
    dummyBackCanvas.width = 1200;
    dummyBackCanvas.height = 1360;

    this.backDecalTexture = new THREE.CanvasTexture(dummyBackCanvas);
    this.backDecalTexture.colorSpace = THREE.SRGBColorSpace;
    this.backDecalTexture.flipY = true;
    this.backDecalTexture.anisotropy = 16;
    this.backDecalTexture.minFilter = THREE.LinearFilter;
    this.backDecalTexture.magFilter = THREE.LinearFilter;

    const backMat = new THREE.MeshStandardMaterial({
      map: this.backDecalTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      roughness: 0.75,
      metalness: 0.02
    });

    this.backDecalMesh = new THREE.Mesh(backDecalGeo, backMat);
    this.backDecalMesh.renderOrder = 10;
    this.backDecalMesh.visible = false;
    this.shirtGroup.add(this.backDecalMesh);
  }

  // ============================================================================
  // COLOR AND MATERIAL CONTROLS
  // ============================================================================

  public setShirtColor(hex: string) {
    this.currentColor = hex;
    this.shirtMaterials.forEach((mat) => {
      mat.color.setStyle(hex);
      mat.needsUpdate = true;
    });
  }

  public getShirtColor(): string {
    return this.currentColor;
  }

  // ============================================================================
  // DECALS & CUSTOM ARTWORK PROJECTION
  // ============================================================================

  /**
   * Updates the 3D shirt surface decals from the 2D Front and Back design canvases
   */
  public updateDecals(frontCanvas: HTMLCanvasElement, backCanvas: HTMLCanvasElement) {
    if (this.frontDecalMesh && this.frontDecalTexture) {
      this.updateSingleDecal(frontCanvas, this.frontDecalMesh, this.frontDecalTexture);
    }
    if (this.backDecalMesh && this.backDecalTexture) {
      this.updateSingleDecal(backCanvas, this.backDecalMesh, this.backDecalTexture);
    }
  }

  private updateSingleDecal(
    sourceCanvas: HTMLCanvasElement,
    mesh: THREE.Mesh,
    texture: THREE.CanvasTexture
  ) {
    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) return;

    // Fast check if canvas contains any rendered artwork
    const imgData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    let hasContent = false;
    for (let i = 3; i < imgData.data.length; i += 40) {
      if (imgData.data[i] > 10) {
        hasContent = true;
        break;
      }
    }

    if (!hasContent) {
      mesh.visible = false;
      return;
    }

    texture.image = sourceCanvas;
    texture.flipY = true;
    texture.needsUpdate = true;
    mesh.visible = true;
    (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
  }

  // ============================================================================
  // 3D XYZ ROTATION & CAMERA CONTROLS
  // ============================================================================

  /**
   * Sets the 3D camera to a predefined vantage point
   */
  public setCameraPreset(preset: CameraPreset) {
    const dist = 2.45;
    // Reset model rotation so presets are always relative to true forward orientation
    this.shirtGroup.rotation.set(0, 0, 0);
    let targetPos = new THREE.Vector3(0, 0.05, dist);

    switch (preset) {
      case 'front':
        targetPos.set(0, 0.05, dist);
        break;
      case 'back':
        targetPos.set(0, 0.05, -dist);
        break;
      case 'left':
        targetPos.set(-dist, 0.05, 0);
        break;
      case 'right':
        targetPos.set(dist, 0.05, 0);
        break;
      case 'hero': // 3/4 front isometric hero perspective
        targetPos.set(0.95, 0.2, 2.1);
        break;
      case 'top': // Collar & shoulder perspective
        targetPos.set(0, 1.8, 1.6);
        break;
    }

    this.animateCameraTo(targetPos, new THREE.Vector3(0, 0, 0));
  }

  /**
   * Directly sets the 3D model rotation in degrees (X, Y, Z)
   */
  public setRotationXYZ(degX: number, degY: number, degZ: number) {
    this.shirtGroup.rotation.x = THREE.MathUtils.degToRad(degX);
    this.shirtGroup.rotation.y = THREE.MathUtils.degToRad(degY);
    this.shirtGroup.rotation.z = THREE.MathUtils.degToRad(degZ);



    this.broadcastOrientation();
  }

  /**
   * Incrementally rotates the 3D model by delta degrees in Pitch (X), Yaw (Y), and Roll (Z)
   */
  public rotateBy(deltaPitch: number, deltaYaw: number, deltaRoll: number) {
    this.shirtGroup.rotation.x += THREE.MathUtils.degToRad(deltaPitch);
    this.shirtGroup.rotation.y += THREE.MathUtils.degToRad(deltaYaw);
    this.shirtGroup.rotation.z += THREE.MathUtils.degToRad(deltaRoll);
    this.broadcastOrientation();
  }

  /**
   * Returns current XYZ angles in degrees
   */
  public getRotationXYZ(): { pitch: number; yaw: number; roll: number } {
    // Combine shirtGroup rotation and camera spherical angles
    const camPos = this.camera.position.clone().sub(this.controls.target);
    const radius = camPos.length();
    const phi = Math.acos(Math.max(-1, Math.min(1, camPos.y / (radius || 1)))); // pitch from top
    const theta = Math.atan2(camPos.x, camPos.z); // yaw around Y

    const pitch = Math.round(THREE.MathUtils.radToDeg(phi) - 90);
    const yaw = Math.round(THREE.MathUtils.radToDeg(theta));
    const roll = Math.round(THREE.MathUtils.radToDeg(this.shirtGroup.rotation.z));

    return { pitch, yaw, roll };
  }

  private broadcastOrientation() {
    if (this.onAngleChangeCb) {
      const angles = this.getRotationXYZ();
      this.onAngleChangeCb(angles.pitch, angles.yaw, angles.roll);
    }
  }

  public toggleTurntable(): boolean {
    this.isTurntableActive = !this.isTurntableActive;
    return this.isTurntableActive;
  }

  public setTurntable(active: boolean) {
    this.isTurntableActive = active;
  }

  public isTurntable(): boolean {
    return this.isTurntableActive;
  }

  public resetView() {
    this.setRotationXYZ(0, 0, 0);
    this.setCameraPreset('front');
  }

  public zoomIn() {
    const dist = this.camera.position.distanceTo(this.controls.target);
    const newDist = Math.max(this.controls.minDistance, dist - 0.3);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.camera.position.copy(this.controls.target).add(dir.multiplyScalar(newDist));
    this.controls.update();
  }

  public zoomOut() {
    const dist = this.camera.position.distanceTo(this.controls.target);
    const newDist = Math.min(this.controls.maxDistance, dist + 0.3);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.camera.position.copy(this.controls.target).add(dir.multiplyScalar(newDist));
    this.controls.update();
  }

  // Smooth camera animation helper
  private animateCameraTo(targetPos: THREE.Vector3, targetLookAt: THREE.Vector3) {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();
    const duration = 650; // ms

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startTarget, targetLookAt, ease);
      this.controls.update();
      this.broadcastOrientation();

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  // ============================================================================
  // RAYCASTING & INTERACTION
  // ============================================================================

  /**
   * Raycast from normalized screen coordinates (-1 to 1) into the 3D scene
   */
  public raycastScreenPoint(ndcX: number, ndcY: number): THREE.Intersection | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = raycaster.intersectObjects(this.shirtMeshes, true);
    return hits.length > 0 ? hits[0] : null;
  }

  // ============================================================================
  // RENDER & ANIMATION LOOP
  // ============================================================================

  private animate = () => {
    if (this.isDisposed) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    // Auto-turntable spin when enabled
    if (this.isTurntableActive) {
      this.shirtGroup.rotation.y += 0.008;
      if (this.frontDecalMesh) this.frontDecalMesh.rotation.y = this.shirtGroup.rotation.y;
      if (this.backDecalMesh) this.backDecalMesh.rotation.y = this.shirtGroup.rotation.y;
      this.broadcastOrientation();
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * High-Resolution 3D Screenshot Capture
   */
  public captureRender(width: number = 1920, height: number = 1920): string {
    const originalAspect = this.camera.aspect;
    const originalWidth = this.container.clientWidth;
    const originalHeight = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    // Restore viewport size
    this.camera.aspect = originalAspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(originalWidth, originalHeight);
    this.renderer.render(this.scene, this.camera);

    return dataUrl;
  }

  public getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public dispose() {
    this.isDisposed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
