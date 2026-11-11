// js/world.js - Escenario 3D, trazado de carretera y estaciones
import * as THREE from './lib/three.module.js';
import * as CANNON from './lib/cannon-es.js';

// Funciones de trazado de ruta (curvas y elevaciones)
export function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function getRoadX(z) {
  // Inicio recto (-30..36) para el arco y bolos, curvas escénicas amplias en el trayecto, final recto en Meta
  const env = smoothstep(36, 68, z) * (1 - smoothstep(330, 360, z));
  return env * (22.0 * Math.sin((z - 36) * 0.017) - 6.0 * Math.sin((z - 36) * 0.034));
}

export function getRoadY(z) {
  // Inicio plano (Y=0 hasta z=45) y Meta plana (Y=0 desde z=355), con 2 colinas y un valle intermedio
  const env = smoothstep(45, 75, z) * (1 - smoothstep(320, 355, z));
  const t = (z - 45) * ((Math.PI * 2) / 155);
  const wave = 0.5 * (1 - Math.cos(t));
  const boost = 1.0 + 0.25 * smoothstep(160, 250, z);
  return env * (0.8 * smoothstep(45, 90, z) + 6.8 * wave * boost);
}

export function getRoadHeading(z) {
  const dx = (getRoadX(z + 0.25) - getRoadX(z - 0.25)) / 0.5;
  return Math.atan2(dx, 1);
}

export function getRoadPitch(z) {
  const dx = (getRoadX(z + 0.25) - getRoadX(z - 0.25)) / 0.5;
  const dy = (getRoadY(z + 0.25) - getRoadY(z - 0.25)) / 0.5;
  const horiz = Math.hypot(dx, 1);
  return Math.atan2(dy, horiz);
}

export function getCorridorHalfWidth(z) {
  // Más ancho en la plaza de inicio para despejar los grandes carteles laterales
  return 22.5 + 3.0 * (1 - smoothstep(14, 34, z));
}

export function getTerrainHeight(x, z) {
  const roadX = getRoadX(z);
  const roadY = getRoadY(z);
  const lat = Math.abs(x - roadX);
  const halfW = getCorridorHalfWidth(z);

  if (lat <= halfW - 1.5) {
    return roadY;
  }

  // Fuera de las vallas: colinas y lomas otoñales que enmarcan todo el recorrido
  const bankFactor = smoothstep(halfW - 1.5, halfW + 28.0, lat);
  const hillNoise =
    6.5 +
    3.5 * Math.sin(x * 0.06 + z * 0.032) +
    2.0 * Math.cos(x * 0.1 - z * 0.045);

  return roadY + bankFactor * Math.max(2.0, hillNoise);
}

export function getDriveSurfaceHeight(x, z) {
  const baseH = getTerrainHeight(x, z);
  const lat = Math.abs(x - getRoadX(z));
  const asphaltLift = 0.04 * (1 - smoothstep(6.9, 7.5, lat));
  return baseH + asphaltLift;
}

export class WorldBuilder {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    // Listas para actualización y colisiones
    this.physicsObjects = []; // Mallas vinculadas a Cannon.js
    this.checkpoints = [];    // Estaciones de proyectos
    this.boostPads = [];      // Pads de turbo
    this.animatedMeshes = []; // Objetos con animación (monedas, birretes, drones)
    this.floatingLeaves = []; // Hojas otoñales animadas en el viento
    this.stationZones = [];   // Zonas despejadas para estaciones

    this.setupAutumnEnvironment();
    this.createAutumnGround();
    this.createCurvedHighway();
    this.createBoundaryFences();
    this.createAllMilestoneStations();
    this.createAutumnFoliageAndBushes();
    this.createLushEnvironmentDetails();
    this.createRampsAndBoostPads();
  }

  // Generador de texturas de ultra-alta definición sin desenfoque ni mipmaps borrosos
  createCrispTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 16;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  setupAutumnEnvironment() {
    // 1. Cielo y niebla cálida de atardecer otoñal (Golden Hour / Autumn Fall)
    const autumnSkyColor = 0x2a1b12;
    this.scene.background = new THREE.Color(autumnSkyColor);
    this.scene.fog = new THREE.FogExp2(autumnSkyColor, 0.0056);

    // 2. Iluminación ambiental cálida dorada
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.9);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfbbf24, 0x3b2610, 0.7);
    this.scene.add(hemiLight);

    // Sol direccional dorado con sombras suaves
    this.sunLight = new THREE.DirectionalLight(0xffedd5, 1.9);
    this.sunLight.position.set(50, 95, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 450;
    const d = 115;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);
  }

  createGroundCanvasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#485224';
    ctx.fillRect(0, 0, 512, 512);

    // Manchas orgánicas de tierra, musgo y pasto otoñal
    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 1 + Math.random() * 5;
      const colors = ['#3b4a1c', '#5a6328', '#6b5324', '#4d3a1c', '#746728', '#525f22'];
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.globalAlpha = 0.25 + Math.random() * 0.35;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(36, 68);
    tex.anisotropy = 8;
    return tex;
  }

  createAsphaltCanvasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Asfalto oscuro realista
    ctx.fillStyle = '#1b1c20';
    ctx.fillRect(0, 0, 512, 512);

    // Grano mineral del asfalto
    for (let i = 0; i < 5500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const shade = 22 + Math.floor(Math.random() * 34);
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 4})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Huellas sutiles de rodadura
    ctx.fillStyle = 'rgba(10, 10, 14, 0.28)';
    ctx.fillRect(110, 0, 68, 512);
    ctx.fillRect(334, 0, 68, 512);

    // Líneas laterales blancas/ámbar claras del borde del asfalto
    ctx.fillStyle = 'rgba(245, 158, 11, 0.72)';
    ctx.fillRect(16, 0, 10, 512);
    ctx.fillRect(486, 0, 10, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 52);
    tex.anisotropy = 16;
    return tex;
  }

  createAutumnGround() {
    // Suelo plano físico en Y=0 solo para la zona de bolos inicial (Z=32, Y=0)
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    groundBody.isGround = true;
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.physicsWorld.addBody(groundBody);

    // Malla de terreno 3D esculpida con alturas y colinas laterales
    const width = 260;
    const length = 470;
    const segX = 110;
    const segZ = 220;
    const groundGeo = new THREE.PlaneGeometry(width, length, segX, segZ);
    groundGeo.rotateX(-Math.PI / 2);
    groundGeo.translate(0, 0, 175);

    const posAttr = groundGeo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);

    const colShoulder = new THREE.Color(0x5c4726); // Tierra cálida junto al asfalto
    const colMeadow = new THREE.Color(0x526327);   // Pasto verde otoñal
    const colGoldGrass = new THREE.Color(0x756422); // Pasto dorado
    const colHill = new THREE.Color(0x454f22);     // Colina boscosa
    const tmpCol = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = getTerrainHeight(vx, vz);
      posAttr.setY(i, vy);

      const lat = Math.abs(vx - getRoadX(vz));
      const halfW = getCorridorHalfWidth(vz);
      const mixSeed = 0.5 + 0.5 * Math.sin(vx * 0.14 + vz * 0.11);

      if (lat < 8.5) {
        tmpCol.copy(colShoulder);
      } else if (lat < halfW) {
        tmpCol.copy(colMeadow).lerp(colGoldGrass, mixSeed * 0.55);
      } else {
        tmpCol.copy(colGoldGrass).lerp(colHill, 0.55 + mixSeed * 0.35);
      }

      colors[i * 3] = tmpCol.r;
      colors[i * 3 + 1] = tmpCol.g;
      colors[i * 3 + 2] = tmpCol.b;
    }

    groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      map: this.createGroundCanvasTexture(),
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.04,
    });

    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);
  }

  createCurvedHighway() {
    // Carretera escénica curva con subidas y bajadas de altitud (Z = -26 a Z = 388)
    const startZ = -26;
    const endZ = 388;
    const stepZ = 1.5;
    const halfRoadW = 7.0;
    const curbW = 0.85;
    const curbH = 0.22;

    const spine = [];
    for (let z = startZ; z <= endZ + 0.01; z += stepZ) {
      const cz = Math.min(z, endZ);
      const cx = getRoadX(cz);
      const cy = getRoadY(cz);
      const dx = (getRoadX(cz + 0.25) - getRoadX(cz - 0.25)) / 0.5;
      const len = Math.hypot(dx, 1);
      const tx = dx / len;
      const tz = 1 / len;
      // Normal perpendicular en XZ (derecha: +nx, +nz)
      const nx = tz;
      const nz = -tx;
      spine.push({ cx, cy, cz, nx, nz });
    }

    // 1. Malla continua de Asfalto
    const roadVerts = [];
    const roadUVs = [];
    const roadIndices = [];

    for (let i = 0; i < spine.length; i++) {
      const p = spine[i];
      const vCoord = i / (spine.length - 1);
      roadVerts.push(
        p.cx - p.nx * halfRoadW, p.cy + 0.045, p.cz - p.nz * halfRoadW,
        p.cx + p.nx * halfRoadW, p.cy + 0.045, p.cz + p.nz * halfRoadW
      );
      roadUVs.push(0, vCoord, 1, vCoord);

      if (i < spine.length - 1) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        roadIndices.push(a, c, b, b, c, d);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUVs, 2));
    roadGeo.setIndex(roadIndices);
    roadGeo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      map: this.createAsphaltCanvasTexture(),
      roughness: 0.85,
      metalness: 0.08,
    });

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);

    // 2. Bordillos / Aceras laterales de madera rústica siguiendo cada curva y pendiente
    const buildCurbRibbon = (sideSign) => {
      const verts = [];
      const idx = [];
      const innerOff = sideSign * halfRoadW;
      const outerOff = sideSign * (halfRoadW + curbW);

      for (let i = 0; i < spine.length; i++) {
        const p = spine[i];
        const ix = p.cx + p.nx * innerOff;
        const iz = p.cz + p.nz * innerOff;
        const ox = p.cx + p.nx * outerOff;
        const oz = p.cz + p.nz * outerOff;

        // 4 vértices por sección: inner-top, outer-top, outer-bottom, inner-bottom
        verts.push(
          ix, p.cy + curbH, iz,
          ox, p.cy + curbH, oz,
          ox, p.cy - 0.05, oz,
          ix, p.cy - 0.05, iz
        );

        if (i < spine.length - 1) {
          const b0 = i * 4;
          const b1 = (i + 1) * 4;
          // Cara superior
          idx.push(b0 + 0, b1 + 0, b0 + 1, b0 + 1, b1 + 0, b1 + 1);
          // Cara exterior
          idx.push(b0 + 1, b1 + 1, b0 + 2, b0 + 2, b1 + 1, b1 + 2);
          // Cara interior
          idx.push(b0 + 3, b1 + 3, b0 + 0, b0 + 0, b1 + 3, b1 + 0);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };

    buildCurbRibbon(-1);
    buildCurbRibbon(1);

    // 3. Línea central dorada discontinua siguiendo la curva y pendiente
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const dashGeo = new THREE.PlaneGeometry(0.42, 4.6);
    for (let z = -18; z < 368; z += 9) {
      const rx = getRoadX(z);
      const ry = getRoadY(z);
      const heading = getRoadHeading(z);
      const pitch = getRoadPitch(z);

      const dashWrapper = new THREE.Group();
      dashWrapper.position.set(rx, ry + 0.06, z);
      dashWrapper.rotation.order = 'YXZ';
      dashWrapper.rotation.set(-pitch, heading, 0);

      const lineMesh = new THREE.Mesh(dashGeo, lineMat);
      lineMesh.rotation.x = -Math.PI / 2;
      dashWrapper.add(lineMesh);
      this.scene.add(dashWrapper);
    }

    // 4. Parches de hojas otoñales caídas al borde de la carretera
    this.createFallenLeafPatches(halfRoadW * 2, -16, 368);
  }

  createBoundaryFences() {
    // Vallas rústicas delimitadoras en ambos lados de todo el corredor y cierres en inicio/final
    const postMat = new THREE.MeshStandardMaterial({ color: 0x4a250d, roughness: 0.9 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.82 });

    const startZ = -24;
    const endZ = 385;
    const step = 4.5;

    const addSideFence = (sideSign) => {
      let prevPt = null;
      let segIndex = 0;

      for (let z = startZ; z <= endZ + 0.1; z += step) {
        const cz = Math.min(z, endZ);
        const cx = getRoadX(cz);
        const dx = (getRoadX(cz + 0.25) - getRoadX(cz - 0.25)) / 0.5;
        const len = Math.hypot(dx, 1);
        const nx = 1 / len;
        const nz = -dx / len;

        const offset = getCorridorHalfWidth(cz);
        const fx = cx + sideSign * nx * offset;
        const fz = cz + sideSign * nz * offset;
        const fy = getTerrainHeight(fx, fz);

        // Poste vertical de madera
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.55, 0.32), postMat);
        post.position.set(fx, fy + 0.77, fz);
        post.castShadow = true;
        post.receiveShadow = true;
        this.scene.add(post);

        const curPt = new THREE.Vector3(fx, fy, fz);

        if (prevPt) {
          const mid = prevPt.clone().add(curPt).multiplyScalar(0.5);
          const dist = prevPt.distanceTo(curPt);
          const ddx = curPt.x - prevPt.x;
          const ddy = curPt.y - prevPt.y;
          const ddz = curPt.z - prevPt.z;
          const yaw = Math.atan2(ddx, ddz);
          const pitch = Math.atan2(ddy, Math.hypot(ddx, ddz));

          const railGroup = new THREE.Group();
          railGroup.position.copy(mid);
          railGroup.rotation.order = 'YXZ';
          railGroup.rotation.set(-pitch, yaw, 0);

          const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, dist + 0.12), railMat);
          railTop.position.y = 1.22;
          railTop.castShadow = true;
          railGroup.add(railTop);

          const railBot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, dist + 0.12), railMat);
          railBot.position.y = 0.65;
          railBot.castShadow = true;
          railGroup.add(railBot);

          this.scene.add(railGroup);

          // Colisionador físico sólido de la valla para impedir salir del mapa
          this.createStaticBoxCollider(mid.x, mid.y + 1.2, mid.z, 0.9, 2.5, dist + 0.4, yaw);
        }

        prevPt = curPt;
        segIndex++;
      }
    };

    addSideFence(-1);
    addSideFence(1);

    // Cierres de límite al inicio (Z = -24) y al final (Z = 385)
    const addEndBarrier = (zPos) => {
      const halfW = getCorridorHalfWidth(zPos);
      const rx = getRoadX(zPos);
      const ry = getRoadY(zPos);

      for (let x = -halfW; x <= halfW; x += 4.2) {
        const px = rx + x;
        const py = getTerrainHeight(px, zPos);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.6, 0.36), postMat);
        post.position.set(px, py + 0.8, zPos);
        post.castShadow = true;
        this.scene.add(post);
      }

      const bar = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2, 0.24, 0.2), railMat);
      bar.position.set(rx, ry + 1.15, zPos);
      this.scene.add(bar);

      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2, 0.24, 0.2), railMat);
      bar2.position.set(rx, ry + 0.6, zPos);
      this.scene.add(bar2);

      this.createStaticBoxCollider(rx, ry + 1.2, zPos, halfW * 2, 2.6, 1.0, 0);
    };

    addEndBarrier(startZ);
    addEndBarrier(endZ);
  }

  createFallenLeafPatches(roadW, startZ, endZ) {
    const leafColors = [0xd97706, 0xea580c, 0xb45309, 0xdc2626, 0xca8a04];
    for (let z = startZ; z < endZ; z += 11) {
      const rx = getRoadX(z);
      const ry = getRoadY(z);
      const heading = getRoadHeading(z);
      const pitch = getRoadPitch(z);
      const nx = Math.cos(heading);
      const nz = -Math.sin(heading);

      const color = leafColors[Math.floor(Math.random() * leafColors.length)];
      const patchMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78 });
      const patchGeo = new THREE.CircleGeometry(1.1 + Math.random() * 1.4, 8);

      const offL = -roadW / 2 + 0.5 + Math.random() * 1.6;
      const patchL = new THREE.Mesh(patchGeo, patchMat);
      patchL.position.set(rx + nx * offL, ry + 0.06, z + nz * offL);
      patchL.rotation.order = 'YXZ';
      patchL.rotation.set(-Math.PI / 2 - pitch, heading, 0);
      this.scene.add(patchL);

      const offR = roadW / 2 - 0.5 - Math.random() * 1.6;
      const patchR = new THREE.Mesh(patchGeo, patchMat);
      patchR.position.set(rx + nx * offR, ry + 0.06, z + nz * offR);
      patchR.rotation.order = 'YXZ';
      patchR.rotation.set(-Math.PI / 2 - pitch, heading, 0);
      this.scene.add(patchR);
    }
  }

  isZoneClearForProp(x, z) {
    const roadX = getRoadX(z);
    const lat = Math.abs(x - roadX);
    if (lat < 8.8) return false; // No bloquear el asfalto ni los bordillos

    // Despejar plaza de inicio y meta para visibilidad total
    if (z >= -20 && z <= 14 && lat < 23.5) return false;
    if (z >= 360 && z <= 380 && lat < 14.0) return false;

    // Despejar estaciones y sus carteles
    for (let i = 0; i < this.stationZones.length; i++) {
      const sz = this.stationZones[i];
      const d = Math.hypot(x - sz.x, z - sz.z);
      if (d < sz.radius) return false;
    }

    return true;
  }

  createAutumnFoliageAndBushes() {
    const autumnPalette = [
      0xea580c, // Naranja fuego
      0xf59e0b, // Ámbar dorado
      0xdc2626, // Rojo carmesí
      0xb45309, // Ocre otoñal
      0xeab308, // Amarillo arce
      0x854d0e  // Castaño dorado
    ];

    // Bosque denso y variado dentro y fuera del corredor delimitado (-22m a 385m)
    for (let z = -26; z <= 388; z += 6.5) {
      const rx = getRoadX(z);

      // 1. Árboles en ambos costados (dentro del prado y en las colinas exteriores)
      [-1, 1].forEach((side) => {
        // Árbol exterior en colinas (detrás de la valla)
        const outerDist = 26 + Math.random() * 24;
        const ox = rx + side * outerDist;
        const oz = z + (Math.random() - 0.5) * 3.5;
        const treeH = 6.0 + Math.random() * 5.0;
        const col = autumnPalette[Math.floor(Math.random() * autumnPalette.length)];
        if (Math.random() > 0.42) {
          this.createBroadleafTree(ox, oz, treeH, col, false);
        } else {
          this.createAutumnTree(ox, oz, treeH, col, false);
        }

        // Árbol ocasional dentro del corredor entre el camino y la valla
        if (Math.random() > 0.35) {
          const innerDist = 11.5 + Math.random() * 8.5;
          const ix = rx + side * innerDist;
          const iz = z + (Math.random() - 0.5) * 3.0;
          if (this.isZoneClearForProp(ix, iz)) {
            const innerH = 5.0 + Math.random() * 3.8;
            const innerCol = autumnPalette[Math.floor(Math.random() * autumnPalette.length)];
            if (Math.random() > 0.45) {
              this.createBroadleafTree(ix, iz, innerH, innerCol, true);
            } else {
              this.createAutumnTree(ix, iz, innerH, innerCol, true);
            }
          }
        }

        // Arbustos variados en los costados
        const bushDist = 9.4 + Math.random() * 11.5;
        const bx = rx + side * bushDist;
        const bz = z + (Math.random() - 0.5) * 3.5;
        if (this.isZoneClearForProp(bx, bz)) {
          const bHeights = [0.65, 1.1, 1.65, 2.2];
          const bh = bHeights[Math.floor(Math.random() * bHeights.length)];
          const bCol = autumnPalette[Math.floor(Math.random() * autumnPalette.length)];
          this.createAutumnBush(bx, bz, bh, bCol);
        }
      });
    }
  }

  createAutumnTree(x, z, height, foliageColor, addCollider = true) {
    const y = getTerrainHeight(x, z);
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);

    const trunkH = height * 0.42;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, trunkH, 6), trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const leavesMat = new THREE.MeshStandardMaterial({
      color: foliageColor,
      roughness: 0.75,
      metalness: 0.08
    });

    const crownH = height * 0.65;
    const crownR = height * 0.35;

    const layer1 = new THREE.Mesh(new THREE.ConeGeometry(crownR, crownH * 0.6, 6), leavesMat);
    layer1.position.y = trunkH + crownH * 0.25;
    layer1.castShadow = true;
    treeGroup.add(layer1);

    const layer2 = new THREE.Mesh(new THREE.ConeGeometry(crownR * 0.72, crownH * 0.5, 6), leavesMat);
    layer2.position.y = trunkH + crownH * 0.6;
    layer2.castShadow = true;
    treeGroup.add(layer2);

    this.scene.add(treeGroup);

    if (addCollider) {
      this.createStaticBoxCollider(x, y + trunkH / 2, z, 0.9, trunkH, 0.9);
    }
  }

  createBroadleafTree(x, z, height, foliageColor, addCollider = true) {
    const y = getTerrainHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const trunkH = height * 0.45;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f1d0b, roughness: 0.92 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, trunkH, 7), trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    const leavesMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.78 });
    const r = height * 0.28;

    const offsets = [
      { ox: 0, oy: trunkH + r * 0.8, oz: 0, s: 1.0 },
      { ox: r * 0.65, oy: trunkH + r * 0.5, oz: r * 0.3, s: 0.75 },
      { ox: -r * 0.6, oy: trunkH + r * 0.55, oz: -r * 0.35, s: 0.78 },
      { ox: 0.1, oy: trunkH + r * 1.45, oz: -0.1, s: 0.7 }
    ];

    offsets.forEach((o) => {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r * o.s, 1), leavesMat);
      puff.position.set(o.ox, o.oy, o.oz);
      puff.castShadow = true;
      group.add(puff);
    });

    this.scene.add(group);

    if (addCollider) {
      this.createStaticBoxCollider(x, y + trunkH / 2, z, 0.9, trunkH, 0.9);
    }
  }

  createAutumnBush(x, z, height, color) {
    const y = getTerrainHeight(x, z);
    const bushGroup = new THREE.Group();
    bushGroup.position.set(x, y, z);

    const bushMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.8,
      metalness: 0.08
    });

    const radius = height * 0.65;
    const centerSphere = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 1), bushMat);
    centerSphere.position.y = radius * 0.9;
    centerSphere.castShadow = true;
    bushGroup.add(centerSphere);

    const subSphere1 = new THREE.Mesh(new THREE.DodecahedronGeometry(radius * 0.7, 1), bushMat);
    subSphere1.position.set(radius * 0.45, radius * 0.65, radius * 0.3);
    bushGroup.add(subSphere1);

    const subSphere2 = new THREE.Mesh(new THREE.DodecahedronGeometry(radius * 0.65, 1), bushMat);
    subSphere2.position.set(-radius * 0.45, radius * 0.6, -radius * 0.2);
    bushGroup.add(subSphere2);

    this.scene.add(bushGroup);

    if (height > 1.65) {
      this.createStaticBoxCollider(x, y + height / 2, z, radius * 1.1, height, radius * 1.1);
    }
  }

  createLushEnvironmentDetails() {
    // 1. PASTO 3D INSTANCIADO (3,800 matas de pasto en tonos verdes, oliva y dorados)
    const blade1 = new THREE.ConeGeometry(0.16, 0.95, 3);
    blade1.translate(0, 0.45, 0);
    const grassCount = 3800;
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.02,
      flatShading: true
    });
    const grassInst = new THREE.InstancedMesh(blade1, grassMat, grassCount);
    grassInst.receiveShadow = true;

    const grassPalette = [
      new THREE.Color(0x65a30d),
      new THREE.Color(0x4d7c0f),
      new THREE.Color(0x84cc16),
      new THREE.Color(0xca8a04),
      new THREE.Color(0xa16207),
      new THREE.Color(0x5f7a24)
    ];

    const dummy = new THREE.Object3D();
    let placedGrass = 0;
    let attempts = 0;

    while (placedGrass < grassCount && attempts < grassCount * 4) {
      attempts++;
      const z = -22 + Math.random() * 406;
      const rx = getRoadX(z);
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 7.7 + Math.random() * 40.0;
      const x = rx + side * dist;

      // No poner pasto encima de los anillos de estación cercanos o plaza de inicio central
      if (Math.abs(x - rx) < 7.6) continue;
      const y = getTerrainHeight(x, z);

      dummy.position.set(x, y - 0.05, z);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.28,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.28
      );
      const s = 0.65 + Math.random() * 0.95;
      dummy.scale.set(s * 1.15, s * (0.8 + Math.random() * 0.65), s * 1.15);
      dummy.updateMatrix();

      grassInst.setMatrixAt(placedGrass, dummy.matrix);
      grassInst.setColorAt(placedGrass, grassPalette[Math.floor(Math.random() * grassPalette.length)]);
      placedGrass++;
    }
    grassInst.count = placedGrass;
    grassInst.instanceMatrix.needsUpdate = true;
    if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
    this.scene.add(grassInst);

    // 2. ROCAS Y PIEDRAS OTOÑALES INSTANCIADAS (320 rocas variadas)
    const rockGeo = new THREE.DodecahedronGeometry(0.65, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      flatShading: true
    });
    const rockCount = 320;
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rockInst.castShadow = true;
    rockInst.receiveShadow = true;

    const rockPalette = [
      new THREE.Color(0x57534e),
      new THREE.Color(0x78716c),
      new THREE.Color(0x44403c),
      new THREE.Color(0x6b5b4b)
    ];

    let placedRocks = 0;
    for (let i = 0; i < 900 && placedRocks < rockCount; i++) {
      const z = -22 + Math.random() * 405;
      const rx = getRoadX(z);
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 9.0 + Math.random() * 34.0;
      const x = rx + side * dist;
      if (!this.isZoneClearForProp(x, z)) continue;

      const y = getTerrainHeight(x, z);
      const sx = 0.6 + Math.random() * 1.6;
      const sy = 0.45 + Math.random() * 0.9;
      const sz = 0.6 + Math.random() * 1.5;

      dummy.position.set(x, y + sy * 0.2, z);
      dummy.rotation.set(Math.random() * 2, Math.random() * 3, Math.random() * 2);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();

      rockInst.setMatrixAt(placedRocks, dummy.matrix);
      rockInst.setColorAt(placedRocks, rockPalette[Math.floor(Math.random() * rockPalette.length)]);
      placedRocks++;
    }
    rockInst.count = placedRocks;
    rockInst.instanceMatrix.needsUpdate = true;
    if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
    this.scene.add(rockInst);

    // 3. TOCONES Y TRONCOS CAÍDOS (120 piezas)
    const stumpGeo = new THREE.CylinderGeometry(0.42, 0.55, 0.75, 7);
    const stumpMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.92 });
    const stumpCount = 120;
    const stumpInst = new THREE.InstancedMesh(stumpGeo, stumpMat, stumpCount);
    stumpInst.castShadow = true;

    let placedStumps = 0;
    for (let i = 0; i < 400 && placedStumps < stumpCount; i++) {
      const z = -20 + Math.random() * 400;
      const rx = getRoadX(z);
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 10.5 + Math.random() * 26.0;
      const x = rx + side * dist;
      if (!this.isZoneClearForProp(x, z)) continue;

      const y = getTerrainHeight(x, z);
      dummy.position.set(x, y + 0.32, z);
      if (Math.random() > 0.45) {
        // Tocón vertical
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        dummy.scale.set(0.8 + Math.random() * 0.5, 0.8 + Math.random() * 0.6, 0.8 + Math.random() * 0.5);
      } else {
        // Tronco caído horizontal
        dummy.position.y = y + 0.35;
        dummy.rotation.set(Math.PI / 2, Math.random() * Math.PI, 0);
        dummy.scale.set(0.75, 2.2 + Math.random() * 1.4, 0.75);
      }
      dummy.updateMatrix();
      stumpInst.setMatrixAt(placedStumps, dummy.matrix);
      placedStumps++;
    }
    stumpInst.count = placedStumps;
    stumpInst.instanceMatrix.needsUpdate = true;
    this.scene.add(stumpInst);

    // 4. FLORES SILVESTRES Y MONTONES DE HOJAS (240 detalles de color en el pasto)
    const flowerGeo = new THREE.DodecahedronGeometry(0.32, 0);
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const flowerCount = 240;
    const flowerInst = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
    const flowerColors = [
      new THREE.Color(0xfbbf24),
      new THREE.Color(0xf97316),
      new THREE.Color(0xef4444),
      new THREE.Color(0xfde047)
    ];

    let placedFlowers = 0;
    for (let i = 0; i < 600 && placedFlowers < flowerCount; i++) {
      const z = -20 + Math.random() * 400;
      const rx = getRoadX(z);
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = rx + side * (8.4 + Math.random() * 20.0);
      if (!this.isZoneClearForProp(x, z)) continue;
      const y = getTerrainHeight(x, z);
      dummy.position.set(x, y + 0.14, z);
      dummy.rotation.set(0, Math.random() * 3, 0);
      dummy.scale.set(1.2, 0.5, 1.2);
      dummy.updateMatrix();
      flowerInst.setMatrixAt(placedFlowers, dummy.matrix);
      flowerInst.setColorAt(placedFlowers, flowerColors[Math.floor(Math.random() * flowerColors.length)]);
      placedFlowers++;
    }
    flowerInst.count = placedFlowers;
    flowerInst.instanceMatrix.needsUpdate = true;
    if (flowerInst.instanceColor) flowerInst.instanceColor.needsUpdate = true;
    this.scene.add(flowerInst);

    // 5. FAROLES VIALES OTOÑALES Y SEÑALES DE CURVA (CHEVRONS)
    const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x292524, metalness: 0.7, roughness: 0.4 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const chevronMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });

    let lampToggle = 1;
    for (let z = 18; z <= 355; z += 26) {
      const rx = getRoadX(z);
      const ry = getRoadY(z);
      const heading = getRoadHeading(z);
      const nx = Math.cos(heading);
      const nz = -Math.sin(heading);

      lampToggle *= -1;
      const lx = rx + lampToggle * nx * 8.4;
      const lz = z + lampToggle * nz * 8.4;

      if (this.isZoneClearForProp(lx, lz)) {
        const lampGrp = new THREE.Group();
        lampGrp.position.set(lx, ry, lz);
        lampGrp.rotation.y = heading;

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.6, 8), lampPostMat);
        pole.position.y = 2.3;
        pole.castShadow = true;
        lampGrp.add(pole);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.14), lampPostMat);
        arm.position.set(-lampToggle * 0.65, 4.5, 0);
        lampGrp.add(arm);

        const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.35), bulbMat);
        bulb.position.set(-lampToggle * 1.15, 4.35, 0);
        lampGrp.add(bulb);

        this.scene.add(lampGrp);
      }
    }

    // Señales de advertencia de curva en las zonas más sinuosas
    for (let z = 55; z <= 345; z += 18) {
      const dx = (getRoadX(z + 0.5) - getRoadX(z - 0.5));
      if (Math.abs(dx) > 0.22) {
        const rx = getRoadX(z);
        const ry = getRoadY(z);
        const heading = getRoadHeading(z);
        const nx = Math.cos(heading);
        const nz = -Math.sin(heading);
        // Lado exterior de la curva
        const side = dx > 0 ? -1 : 1;
        const cx = rx + side * nx * 8.6;
        const cz = z + side * nz * 8.6;
        if (this.isZoneClearForProp(cx, cz)) {
          const signGrp = new THREE.Group();
          signGrp.position.set(cx, ry, cz);
          signGrp.rotation.y = heading;

          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), lampPostMat);
          post.position.y = 1.1;
          signGrp.add(post);

          const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.85, 0.1), chevronMat);
          board.position.y = 2.0;
          signGrp.add(board);

          this.scene.add(signGrp);
        }
      }
    }

    // 6. HOJAS OTOÑALES FLOTANTES EN EL AIRE (160 hojas animadas)
    const leafGeo = new THREE.PlaneGeometry(0.32, 0.22);
    const leafColorsHex = [0xf59e0b, 0xea580c, 0xdc2626, 0xeab308];
    for (let i = 0; i < 160; i++) {
      const z = -15 + Math.random() * 395;
      const rx = getRoadX(z);
      const ry = getRoadY(z);
      const x = rx + (Math.random() - 0.5) * 34;
      const y = ry + 1.5 + Math.random() * 10;

      const mat = new THREE.MeshBasicMaterial({
        color: leafColorsHex[Math.floor(Math.random() * leafColorsHex.length)],
        side: THREE.DoubleSide
      });
      const leaf = new THREE.Mesh(leafGeo, mat);
      leaf.position.set(x, y, z);
      this.scene.add(leaf);

      this.floatingLeaves.push({
        mesh: leaf,
        baseX: x,
        baseY: ry + 0.3,
        maxY: ry + 11.5,
        speed: 0.7 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        rotSpeed: 1.5 + Math.random() * 2.5
      });
    }
  }

  createAllMilestoneStations() {
    // Estaciones ubicadas a lo largo de la carretera curva

    // Pre-registrar las zonas de todas las estaciones para que los árboles/rocas no las tapen
    const stationSpecs = [
      { z: 78, side: 1, r: 13.5 },
      { z: 125, side: -1, r: 13.5 },
      { z: 175, side: 1, r: 13.5 },
      { z: 225, side: -1, r: 13.5 },
      { z: 275, side: 1, r: 13.5 },
      { z: 325, side: -1, r: 13.5 },
    ];
    stationSpecs.forEach(s => {
      const rx = getRoadX(s.z);
      const h = getRoadHeading(s.z);
      const nx = Math.cos(h);
      const nz = -Math.sin(h);
      this.stationZones.push({
        x: rx + s.side * nx * 13.0,
        z: s.z + s.side * nz * 13.0,
        radius: s.r
      });
    });

    // 0. KM 0: Arco de Salida & Perfil Profesional (Z = 0, Y = 0)
    this.createStartArchway(getRoadX(0), 0);

    // 1. KM 1: Stack Tecnológico y Herramientas (Z = 32, Y = 0)
    this.createTechBowlingAlley(getRoadX(32), 32);

    // 2. KM 2: Control Ganadero Pro v2.5 (Z = 78, subida de Colina 1)
    this.createStationCheckpoint({
      id: 'control-ganadero',
      index: 0,
      z: 78,
      side: 1,
      title: 'Control Ganadero Pro v2.5',
      category: 'AgroTech / Web App',
      color: 0x10b981,
      badgeText: 'EN PRODUCCIÓN ACTIVA',
      builder: (grp, stationX, stationY, stationZ, heading, side) => {
        const barn = new THREE.Mesh(
          new THREE.BoxGeometry(8, 6.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 })
        );
        barn.position.set(side * 4.5, 3.25, 0);
        barn.castShadow = true;
        grp.add(barn);

        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(6.5, 3.5, 4),
          new THREE.MeshStandardMaterial({ color: 0x78350f })
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.set(side * 4.5, 8.0, 0);
        grp.add(roof);

        const cow = this.createLowPolyCow();
        cow.position.set(-side * 2.5, 0, 2.5);
        grp.add(cow);

        const hayMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.95 });
        const hay1 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 12), hayMat);
        hay1.rotation.z = Math.PI / 2;
        hay1.position.set(-side * 1.5, 0.8, -4);
        grp.add(hay1);

        const worldBarn = this.localToWorldOffset(stationX, stationY, stationZ, heading, side * 4.5, 3.25, 0);
        this.createStaticBoxCollider(worldBarn.x, worldBarn.y, worldBarn.z, 8, 6.5, 8, heading);
      }
    });

    // 3. KM 3: MiAliado SIGC (Z = 125, cima de Colina 1)
    this.createStationCheckpoint({
      id: 'mialiado-sigc',
      index: 1,
      z: 125,
      side: -1,
      title: 'MiAliado (SIGC)',
      category: 'FinTech / ERP PYME',
      color: 0x3b82f6,
      badgeText: 'PLATAFORMA OPERATIVA',
      builder: (grp, stationX, stationY, stationZ, heading, side) => {
        const towerGeo = new THREE.BoxGeometry(7, 15, 7);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.8, roughness: 0.2 });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.set(side * 4.2, 7.5, 0);
        tower.castShadow = true;
        grp.add(tower);

        for (let i = 0; i < 3; i++) {
          const coinGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.2, 16);
          coinGeo.rotateX(Math.PI / 2);
          const coinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.1 });
          const coin = new THREE.Mesh(coinGeo, coinMat);
          coin.position.set(-side * 2.0, 2.5 + i * 1.5, -2 + i * 2);
          grp.add(coin);
          this.animatedMeshes.push({ mesh: coin, rotSpeed: 2.2 });
        }

        const worldTower = this.localToWorldOffset(stationX, stationY, stationZ, heading, side * 4.2, 7.5, 0);
        this.createStaticBoxCollider(worldTower.x, worldTower.y, worldTower.z, 7, 15, 7, heading);
      }
    });

    // 4. KM 4: Portal Kelme Latam Hub (Z = 175, descenso hacia el valle)
    this.createStationCheckpoint({
      id: 'kelme-latam',
      index: 2,
      z: 175,
      side: 1,
      title: 'Portal Kelme Latam Hub',
      category: 'E-Commerce B2B Mayorista',
      color: 0xf59e0b,
      badgeText: 'B2B CORPORATIVO',
      builder: (grp, stationX, stationY, stationZ, heading, side) => {
        const contMat1 = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
        const cont1 = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 4), contMat1);
        cont1.position.set(side * 4.5, 2, 0);
        cont1.castShadow = true;
        grp.add(cont1);

        const contMat2 = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 });
        const cont2 = new THREE.Mesh(new THREE.BoxGeometry(7, 3.5, 3.5), contMat2);
        cont2.position.set(side * 4.5, 5.5, 0.5);
        cont2.rotation.y = 0.15;
        grp.add(cont2);

        const ball = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.2, 1),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
        );
        ball.position.set(-side * 2.5, 1.2, 2);
        grp.add(ball);
        this.animatedMeshes.push({ mesh: ball, rotSpeed: 1.5 });

        const worldCont = this.localToWorldOffset(stationX, stationY, stationZ, heading, side * 4.5, 2, 0);
        this.createStaticBoxCollider(worldCont.x, worldCont.y, worldCont.z, 8.5, 4, 4.5, heading);
      }
    });

    // 5. KM 5: ErgoIA (Z = 225, subida a la Colina 2)
    this.createStationCheckpoint({
      id: 'ergoia',
      index: 3,
      z: 225,
      side: -1,
      title: 'ErgoIA (Salud Laboral & IA)',
      category: 'Inteligencia Artificial',
      color: 0xa855f7,
      badgeText: 'COMPUTER VISION / AI',
      builder: (grp, stationX, stationY, stationZ, heading, side) => {
        const labBase = new THREE.Mesh(
          new THREE.CylinderGeometry(4.5, 5.0, 2, 24),
          new THREE.MeshStandardMaterial({ color: 0x4c1d95, metalness: 0.7, roughness: 0.3 })
        );
        labBase.position.set(side * 4.2, 1, 0);
        grp.add(labBase);

        const drone = new THREE.Group();
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(1.3, 24, 24),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 })
        );
        drone.add(eye);

        const iris = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16),
          new THREE.MeshBasicMaterial({ color: 0xc084fc })
        );
        iris.rotateX(Math.PI / 2);
        iris.position.z = 1.25;
        drone.add(iris);

        drone.position.set(side * 4.2, 5, 0);
        grp.add(drone);
        this.animatedMeshes.push({ mesh: drone, bobbing: true, baseHeight: 5 });

        const worldLab = this.localToWorldOffset(stationX, stationY, stationZ, heading, side * 4.2, 1.25, 0);
        this.createStaticBoxCollider(worldLab.x, worldLab.y, worldLab.z, 8.5, 2.5, 8.5, heading);
      }
    });

    // 6. KM 6: Lengua de Señas Panameña (Z = 275, mirador alto de Colina 2)
    this.createStationCheckpoint({
      id: 'lengua-senas',
      index: 4,
      z: 275,
      side: 1,
      title: 'Lengua de Señas Panameña',
      category: 'Investigación UTP 2025',
      color: 0xf43f5e,
      badgeText: 'RECONOCIMIENTO JIC UTP',
      builder: (grp, stationX, stationY, stationZ, heading, side) => {
        const podium = new THREE.Mesh(
          new THREE.CylinderGeometry(4.2, 4.8, 2.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5 })
        );
        podium.position.set(side * 4.2, 1.25, 0);
        grp.add(podium);

        const trophy = new THREE.Mesh(
          new THREE.CylinderGeometry(1.2, 0.6, 2.8, 16),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.15 })
        );
        trophy.position.set(side * 4.2, 4, 0);
        grp.add(trophy);
        this.animatedMeshes.push({ mesh: trophy, rotSpeed: 1.6 });

        const worldPod = this.localToWorldOffset(stationX, stationY, stationZ, heading, side * 4.2, 1.25, 0);
        this.createStaticBoxCollider(worldPod.x, worldPod.y, worldPod.z, 8.5, 2.5, 8.5, heading);
      }
    });

    // 7. KM 7: Educación & Certificaciones Samsung (Z = 325, descenso hacia Meta)
    this.createStationCheckpoint({
      id: 'educacion-certs',
      index: 5,
      z: 325,
      side: -1,
      title: 'Educación & Certificaciones',
      category: 'Samsung Campus & UTP',
      color: 0x06b6d4,
      badgeText: '200H AI & 5TO AÑO UTP',
      builder: (grp, stationX, stationY, stationZ, heading, side) => {
        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(6, 13, 6),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 })
        );
        tower.position.set(side * 4.2, 6.5, 0);
        tower.castShadow = true;
        grp.add(tower);

        const capGroup = new THREE.Group();
        const capTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 3.5), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
        capTop.rotation.y = Math.PI / 4;
        capGroup.add(capTop);

        const capBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
        capBase.position.y = -0.45;
        capGroup.add(capBase);

        capGroup.position.set(side * 4.2, 4.5, 0);
        grp.add(capGroup);
        this.animatedMeshes.push({ mesh: capGroup, rotSpeed: 1.8, bobbing: true, baseHeight: 4.5 });

        const worldTow = this.localToWorldOffset(stationX, stationY, stationZ, heading, side * 4.2, 6.5, 0);
        this.createStaticBoxCollider(worldTow.x, worldTow.y, worldTow.z, 6, 13, 6, heading);
      }
    });

    // 8. KM 8: Meta Final & Contacto Profesional (Z = 370, al final del camino)
    this.createFinishLine(getRoadX(370), 370);
  }

  localToWorldOffset(ox, oy, oz, heading, lx, ly, lz) {
    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);
    return {
      x: ox + lx * cosH + lz * sinH,
      y: oy + ly,
      z: oz - lx * sinH + lz * cosH
    };
  }

  createStartArchway(x, z) {
    const archGroup = new THREE.Group();
    archGroup.position.set(x, 0, z);

    const colMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x3d1704, roughness: 0.8 });

    // 1. Arco central de salida sobre la carretera (-7 a +7)
    const colGeo = new THREE.BoxGeometry(1.6, 11.6, 1.8);

    // Pilar Izquierdo del arco (x = -8.4)
    const colL = new THREE.Mesh(colGeo, colMat);
    colL.position.set(-8.4, 5.8, 0);
    colL.castShadow = true;
    colL.receiveShadow = true;
    archGroup.add(colL);

    // Pilar Derecho del arco (x = +8.4)
    const colR = new THREE.Mesh(colGeo, colMat);
    colR.position.set(8.4, 5.8, 0);
    colR.castShadow = true;
    colR.receiveShadow = true;
    archGroup.add(colR);

    // Gran Viga Transversal del arco central
    const beam = new THREE.Mesh(new THREE.BoxGeometry(18.6, 2.2, 2.0), beamMat);
    beam.position.set(0, 11.6, 0);
    beam.castShadow = true;
    archGroup.add(beam);

    // Soporte trasero de madera para el cartel superior central
    const topBackGeo = new THREE.BoxGeometry(17.8, 4.2, 0.25);
    const topBackMesh = new THREE.Mesh(topBackGeo, colMat);
    topBackMesh.position.set(0, 11.6, 0);
    topBackMesh.castShadow = true;
    archGroup.add(topBackMesh);

    // Letrero Superior Central en Alta Definición (2800 x 640)
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 2800;
    textCanvas.height = 640;
    const ctx = textCanvas.getContext('2d');

    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, 2800, 640);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 24;
    ctx.strokeRect(12, 12, 2776, 616);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 4;
    ctx.strokeRect(34, 34, 2732, 572);

    // Nombre Gigante de Jahir en 160px con sombra nítida y perfectamente centrado
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 160px "Open Sans", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillText('JAHIR SÁNCHEZ CENTELLA', 1400, 230);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Subtítulo profesional
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 58px "Tiny5", monospace';
    ctx.fillText('SOFTWARE ARCHITECT & FULL-STACK  •  5TO AÑO UTP', 1400, 342);

    // Barra de instrucción inferior de alto contraste
    ctx.fillStyle = 'rgba(251, 191, 36, 0.16)';
    ctx.fillRect(80, 435, 2640, 135);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(80, 435, 2640, 135);

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 42px "Open Sans", sans-serif';
    ctx.fillText('CONDUCE POR LA RUTA HACIA CADA ESTACIÓN  •  USA LA RUEDITA PARA ZOOM', 1400, 520);

    const texTop = this.createCrispTexture(textCanvas);
    const signGeo = new THREE.PlaneGeometry(17.5, 4.0);

    const signMatFront = new THREE.MeshBasicMaterial({ map: texTop, side: THREE.FrontSide });
    const signMatBack = new THREE.MeshBasicMaterial({ map: texTop, side: THREE.FrontSide });

    const signFront = new THREE.Mesh(signGeo, signMatFront);
    signFront.position.set(0, 11.6, -1.05);
    signFront.rotation.y = Math.PI;
    archGroup.add(signFront);

    const signBack = new THREE.Mesh(signGeo, signMatBack);
    signBack.position.set(0, 11.6, 1.05);
    signBack.rotation.y = 0;
    archGroup.add(signBack);

    // 2. Cuadro lateral izquierdo: panel de ruta (x = -16.2)
    const billboardLGroup = new THREE.Group();
    billboardLGroup.position.set(-16.2, 0, 0);
    billboardLGroup.rotation.y = -0.20; // 11.5° hacia la calzada
    archGroup.add(billboardLGroup);

    // Estructura de soporte del cartel izquierdo
    const boardBackGeo = new THREE.BoxGeometry(6.9, 10.8, 0.4);
    const boardLBackMesh = new THREE.Mesh(boardBackGeo, colMat);
    boardLBackMesh.position.set(0, 5.6, 0);
    boardLBackMesh.castShadow = true;
    billboardLGroup.add(boardLBackMesh);

    // Postes de madera de anclaje
    const postGeo = new THREE.BoxGeometry(0.5, 11.2, 0.5);
    const postL1 = new THREE.Mesh(postGeo, colMat);
    postL1.position.set(-2.8, 5.6, 0.25);
    billboardLGroup.add(postL1);
    const postL2 = new THREE.Mesh(postGeo, colMat);
    postL2.position.set(2.8, 5.6, 0.25);
    billboardLGroup.add(postL2);

    const canvasL = document.createElement('canvas');
    canvasL.width = 1536;
    canvasL.height = 2048;
    const ctxL = canvasL.getContext('2d');

    ctxL.fillStyle = '#080d1a';
    ctxL.fillRect(0, 0, 1536, 2048);

    ctxL.strokeStyle = '#f59e0b';
    ctxL.lineWidth = 26;
    ctxL.strokeRect(13, 13, 1510, 2022);

    ctxL.fillStyle = '#f59e0b';
    ctxL.fillRect(36, 36, 1464, 164);
    ctxL.fillStyle = '#080d1a';
    ctxL.font = '900 72px "Open Sans", sans-serif';
    ctxL.textAlign = 'center';
    ctxL.fillText('MAPA DE RUTA - 7 HITOS', 768, 108);
    ctxL.font = 'bold 40px "Tiny5", monospace';
    ctxL.fillText('ESTACIONES Y PROYECTOS EN EL CAMINO', 768, 164);

    const stationsList = [
      { km: 'KM 0', tag: '00', name: 'SALIDA & PERFIL', color: '#f59e0b', tech: 'Perfil, Arquitectura & Stack Técnico' },
      { km: 'KM 1', tag: '01', name: 'STACK TÉCNICO & CLOUD', color: '#06b6d4', tech: 'Vercel, Cloudflare, SQL Server, React' },
      { km: 'KM 2', tag: '02', name: 'CONTROL GANADERO PRO', color: '#10b981', tech: 'AgroTech Web App en Producción Activa' },
      { km: 'KM 3', tag: '03', name: 'ERP MIALIADO (SIGC)', color: '#3b82f6', tech: 'Finanzas, Inventario & Ventas en .click' },
      { km: 'KM 4', tag: '04', name: 'PORTAL KELME LATAM', color: '#f97316', tech: 'B2B Mayorista Internacional de Deportes' },
      { km: 'KM 5', tag: '05', name: 'ERGOIA SALUD LABORAL', color: '#a855f7', tech: 'Visión Artificial en Tiempo Real (Webcam)' },
      { km: 'KM 6', tag: '06', name: 'LENGUA DE SEÑAS UTP', color: '#ec4899', tech: 'Investigación Científica JIC 2025' },
      { km: 'KM 7', tag: '07', name: 'SAMSUNG IA & META', color: '#22c55e', tech: 'Certificación 200h IA SIC & Contacto' }
    ];

    stationsList.forEach((st, idx) => {
      const y = 224 + idx * 222;
      ctxL.fillStyle = '#111827';
      ctxL.fillRect(45, y, 1446, 198);
      ctxL.strokeStyle = st.color;
      ctxL.lineWidth = 6;
      ctxL.strokeRect(45, y, 1446, 198);

      ctxL.fillStyle = st.color;
      ctxL.fillRect(68, y + 20, 240, 64);
      ctxL.fillStyle = '#000000';
      ctxL.font = '900 42px "Tiny5", monospace';
      ctxL.textAlign = 'center';
      ctxL.fillText(st.km, 188, y + 66);

      ctxL.fillStyle = '#ffffff';
      ctxL.font = '900 52px "Open Sans", sans-serif';
      ctxL.textAlign = 'left';
      ctxL.fillText(`[${st.tag}] ${st.name}`, 330, y + 68);

      ctxL.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctxL.lineWidth = 2;
      ctxL.beginPath();
      ctxL.moveTo(68, y + 104);
      ctxL.lineTo(1450, y + 104);
      ctxL.stroke();

      ctxL.fillStyle = '#94a3b8';
      ctxL.font = 'bold 37px "Tiny5", monospace';
      ctxL.fillText(`▸ ${st.tech}`, 68, y + 158);
    });

    const texL = this.createCrispTexture(canvasL);
    const towerPlaqueGeo = new THREE.PlaneGeometry(6.6, 10.4);
    const plaqueMatLFront = new THREE.MeshBasicMaterial({ map: texL, side: THREE.FrontSide });
    const plaqueMatLBack = new THREE.MeshBasicMaterial({ map: texL, side: THREE.FrontSide });

    const plaqueLFront = new THREE.Mesh(towerPlaqueGeo, plaqueMatLFront);
    plaqueLFront.position.set(0, 5.6, -0.22);
    plaqueLFront.rotation.y = Math.PI;
    billboardLGroup.add(plaqueLFront);

    const plaqueLBack = new THREE.Mesh(towerPlaqueGeo, plaqueMatLBack);
    plaqueLBack.position.set(0, 5.6, 0.22);
    plaqueLBack.rotation.y = 0;
    billboardLGroup.add(plaqueLBack);

    // 3. Cuadro lateral derecho: controles y guia (x = +16.2)
    const billboardRGroup = new THREE.Group();
    billboardRGroup.position.set(16.2, 0, 0);
    billboardRGroup.rotation.y = 0.20; // 11.5° hacia la calzada
    archGroup.add(billboardRGroup);

    // Estructura de soporte del cartel derecho
    const boardRBackMesh = new THREE.Mesh(boardBackGeo, colMat);
    boardRBackMesh.position.set(0, 5.6, 0);
    boardRBackMesh.castShadow = true;
    billboardRGroup.add(boardRBackMesh);

    const postR1 = new THREE.Mesh(postGeo, colMat);
    postR1.position.set(-2.8, 5.6, 0.25);
    billboardRGroup.add(postR1);
    const postR2 = new THREE.Mesh(postGeo, colMat);
    postR2.position.set(2.8, 5.6, 0.25);
    billboardRGroup.add(postR2);

    const canvasR = document.createElement('canvas');
    canvasR.width = 1536;
    canvasR.height = 2048;
    const ctxR = canvasR.getContext('2d');

    ctxR.fillStyle = '#080d1a';
    ctxR.fillRect(0, 0, 1536, 2048);

    ctxR.strokeStyle = '#06b6d4';
    ctxR.lineWidth = 26;
    ctxR.strokeRect(13, 13, 1510, 2022);

    ctxR.fillStyle = '#06b6d4';
    ctxR.fillRect(36, 36, 1464, 164);
    ctxR.fillStyle = '#080d1a';
    ctxR.font = '900 72px "Open Sans", sans-serif';
    ctxR.textAlign = 'center';
    ctxR.fillText('CÓMO JUGAR • CONTROLES', 768, 108);
    ctxR.font = 'bold 40px "Tiny5", monospace';
    ctxR.fillText('MANUAL DE CONDUCCIÓN DEL VEHÍCULO', 768, 164);

    const controlsList = [
      { key: 'W / ↑', action: 'ACELERAR', desc: 'Avanza hacia adelante por la carretera', color: '#22c55e' },
      { key: 'S / ↓', action: 'FRENO / REVERSA', desc: 'Reduce la velocidad o marcha atrás', color: '#ef4444' },
      { key: 'A / D', action: 'DIRECCIÓN', desc: 'Gira el volante a izquierda o derecha', color: '#38bdf8' },
      { key: 'ESPACIO', action: 'DERRAPE / CLAXON', desc: 'Freno de mano arcade y sonido de bocina', color: '#f59e0b' },
      { key: 'RUEDITA', action: 'ZOOM CÁMARA', desc: 'Gira la ruedita del ratón para acercar o alejar', color: '#06b6d4' },
      { key: 'R', action: 'REINICIAR AUTO', desc: 'Vuelve al arco de salida Km 0 al instante', color: '#a855f7' },
      { key: 'HITOS', action: 'EXPEDIENTES', desc: 'Conduce al círculo de luz para ver proyectos', color: '#10b981' },
      { key: 'MODO CV', action: 'VERSIÓN TEXTO', desc: 'Pulsa el botón superior para ver versión texto', color: '#f43f5e' }
    ];

    controlsList.forEach((ctrl, idx) => {
      const y = 224 + idx * 222;
      ctxR.fillStyle = '#111827';
      ctxR.fillRect(45, y, 1446, 198);
      ctxR.strokeStyle = ctrl.color;
      ctxR.lineWidth = 6;
      ctxR.strokeRect(45, y, 1446, 198);

      ctxR.fillStyle = ctrl.color;
      ctxR.fillRect(68, y + 20, 290, 64);
      ctxR.fillStyle = '#000000';
      ctxR.font = '900 38px "Tiny5", monospace';
      ctxR.textAlign = 'center';
      ctxR.fillText(ctrl.key, 213, y + 66);

      ctxR.fillStyle = '#ffffff';
      ctxR.font = '900 52px "Open Sans", sans-serif';
      ctxR.textAlign = 'left';
      ctxR.fillText(ctrl.action, 385, y + 68);

      ctxR.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctxR.lineWidth = 2;
      ctxR.beginPath();
      ctxR.moveTo(68, y + 104);
      ctxR.lineTo(1450, y + 104);
      ctxR.stroke();

      ctxR.fillStyle = '#94a3b8';
      ctxR.font = 'bold 37px "Open Sans", sans-serif';
      ctxR.fillText(ctrl.desc, 68, y + 158);
    });

    const texR = this.createCrispTexture(canvasR);
    const plaqueMatRFront = new THREE.MeshBasicMaterial({ map: texR, side: THREE.FrontSide });
    const plaqueMatRBack = new THREE.MeshBasicMaterial({ map: texR, side: THREE.FrontSide });

    const plaqueRFront = new THREE.Mesh(towerPlaqueGeo, plaqueMatRFront);
    plaqueRFront.position.set(0, 5.6, -0.22);
    plaqueRFront.rotation.y = Math.PI;
    billboardRGroup.add(plaqueRFront);

    const plaqueRBack = new THREE.Mesh(towerPlaqueGeo, plaqueMatRBack);
    plaqueRBack.position.set(0, 5.6, 0.22);
    plaqueRBack.rotation.y = 0;
    billboardRGroup.add(plaqueRBack);

    this.scene.add(archGroup);

    // Colisionadores sólidos
    // Pilares del arco central
    this.createStaticBoxCollider(-8.4, 5.8, z, 1.6, 11.6, 1.8);
    this.createStaticBoxCollider(8.4, 5.8, z, 1.6, 11.6, 1.8);

    // Carteles laterales exteriores
    this.createStaticBoxCollider(-16.2, 5.6, z, 7.0, 11.2, 2.0);
    this.createStaticBoxCollider(16.2, 5.6, z, 7.0, 11.2, 2.0);
  }

  createTechBowlingAlley(x, z) {
    // Pirámide de Bolos Tecnológicos en medio del camino otoñal
    const techItems = [
      { name: 'VERCEL', cat: 'CLOUD / DEPLOY', bg: '#09090b', textCol: '#ffffff', border: '#ffffff' },
      { name: 'CLOUDFLARE', cat: 'EDGE / PAGES', bg: '#ea580c', textCol: '#ffffff', border: '#fdba74' },
      { name: 'SQL SERVER', cat: 'RELATIONAL DB', bg: '#b91c1c', textCol: '#ffffff', border: '#fca5a5' },
      { name: 'TYPESCRIPT', cat: 'TIPADO ESTRICTO', bg: '#0891b2', textCol: '#ffffff', border: '#67e8f9' },
      { name: 'FIREBASE', cat: 'CLOUD & AUTH', bg: '#059669', textCol: '#ffffff', border: '#6ee7b7' },
      { name: 'REACT', cat: 'FRONTEND SPA', bg: '#0284c7', textCol: '#ffffff', border: '#7dd3fc' },
      { name: 'NODE.JS', cat: 'BACKEND RUNTIME', bg: '#15803d', textCol: '#ffffff', border: '#86efac' },
      { name: 'PYTHON', cat: 'AI & VISION', bg: '#ca8a04', textCol: '#000000', border: '#fde047' },
      { name: 'LINUX', cat: 'DEBIAN / CACHY', bg: '#334155', textCol: '#ffffff', border: '#94a3b8' },
      { name: 'DOCKER', cat: 'CONTAINERS', bg: '#1d4ed8', textCol: '#ffffff', border: '#93c5fd' }
    ];

    let itemIdx = 0;
    const rows = [4, 3, 2, 1];
    const boxSize = 1.85; // Cubos más grandes y fáciles de leer

    rows.forEach((count, rIdx) => {
      const rowZ = z + rIdx * 2.3;
      const startX = -((count - 1) * 2.3) / 2;

      for (let c = 0; c < count; c++) {
        if (itemIdx >= techItems.length) break;
        const boxX = startX + c * 2.3;
        const item = techItems[itemIdx++];

        this.createSmashableBlock(boxX, boxSize / 2, rowZ, boxSize, item);
      }
    });

    // Cartel indicador orientado de frente al conductor
    const signGroup = this.createBoardSign(0, 0, z - 8, '¡CHOCA EL STACK!', 'Stack Técnico & Herramientas', 0xf59e0b);
    this.scene.add(signGroup);
  }

  createSmashableBlock(x, y, z, size, info) {
    // 1. Textura en Ultra Alta Definición (1024 x 1024) para las caras laterales
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Fondo con color distintivo de la marca
    ctx.fillStyle = info.bg;
    ctx.fillRect(0, 0, 1024, 1024);

    // Borde grueso de alto contraste
    ctx.strokeStyle = info.border;
    ctx.lineWidth = 36;
    ctx.strokeRect(18, 18, 988, 988);

    // Etiqueta de Categoría
    ctx.fillStyle = info.border;
    ctx.font = 'bold 54px "Tiny5", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`[ ${info.cat} ]`, 512, 180);

    // Nombre Gigante de la Tecnología con tipografía nítida
    ctx.fillStyle = info.textCol;
    ctx.font = '900 135px "Open Sans", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 14;
    ctx.fillText(info.name, 512, 512);
    ctx.shadowBlur = 0;

    // Decoración inferior
    ctx.fillStyle = info.border;
    ctx.font = '900 48px "Tiny5", monospace';
    ctx.fillText('EXPERIENCIA', 512, 840);

    const texture = this.createCrispTexture(canvas);

    // Textura para la cara superior (+Y) vista desde la cámara isométrica
    const canvasTop = document.createElement('canvas');
    canvasTop.width = 1024;
    canvasTop.height = 1024;
    const ctxTop = canvasTop.getContext('2d');
    ctxTop.fillStyle = info.bg;
    ctxTop.fillRect(0, 0, 1024, 1024);
    ctxTop.strokeStyle = info.border;
    ctxTop.lineWidth = 36;
    ctxTop.strokeRect(18, 18, 988, 988);

    ctxTop.fillStyle = info.textCol;
    ctxTop.font = '900 148px "Open Sans", -apple-system, sans-serif';
    ctxTop.textAlign = 'center';
    ctxTop.textBaseline = 'middle';
    ctxTop.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctxTop.shadowBlur = 14;
    ctxTop.fillText(info.name, 512, 512);

    const textureTop = this.createCrispTexture(canvasTop);

    // Materiales para las 6 caras de BoxGeometry: [+X, -X, +Y, -Y, +Z, -Z]
    const sideMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.35, metalness: 0.1 });
    const topMat = new THREE.MeshStandardMaterial({ map: textureTop, roughness: 0.35, metalness: 0.1 });

    const materials = [
      sideMat, // +X
      sideMat, // -X
      topMat,  // +Y (Cara superior visible desde la cámara)
      sideMat, // -Y
      sideMat, // +Z
      sideMat  // -Z (Cara frontal que mira al auto aproximándose)
    ];

    const boxGeo = new THREE.BoxGeometry(size, size, size);
    const mesh = new THREE.Mesh(boxGeo, materials);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const half = size / 2;
    const body = new CANNON.Body({
      mass: 10,
      shape: new CANNON.Box(new CANNON.Vec3(half, half, half)),
      position: new CANNON.Vec3(x, y, z),
      linearDamping: 0.4,
      angularDamping: 0.4,
    });
    this.physicsWorld.addBody(body);
    this.physicsObjects.push({ mesh, body });
  }

  createStationCheckpoint(data) {
    const z = data.z;
    const side = data.side; // +1 o -1
    const rx = getRoadX(z);
    const ry = getRoadY(z);
    const heading = getRoadHeading(z);
    const nx = Math.cos(heading);
    const nz = -Math.sin(heading);

    // Centro de la estación al costado de la carretera curva y a su altura exacta
    const stationOffset = 13.0;
    const stationX = rx + side * nx * stationOffset;
    const stationZ = z + side * nz * stationOffset;
    const stationY = getTerrainHeight(stationX, stationZ);
    const stationPos = new THREE.Vector3(stationX, stationY, stationZ);

    const stationGroup = new THREE.Group();
    stationGroup.position.copy(stationPos);
    stationGroup.rotation.y = heading;

    // Círculo luminoso de activación en el suelo
    const ringGeo = new THREE.RingGeometry(4.2, 5.0, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: data.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.08;
    stationGroup.add(ringMesh);

    // Baliza de luz translúcida hacia el cielo (Cilindro holográfico limpio)
    const beamGeo = new THREE.CylinderGeometry(4.2, 4.2, 22, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: data.color,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 11;
    stationGroup.add(beam);

    // Cartel de carretera al borde de la calzada antes de la estación
    const signZ = z - 6.5;
    const signRx = getRoadX(signZ);
    const signHeading = getRoadHeading(signZ);
    const snx = Math.cos(signHeading);
    const snz = -Math.sin(signHeading);
    const signLat = side * 11.4;
    const signX = signRx + signLat * snx;
    const signWorldZ = signZ + signLat * snz;
    const signY = getTerrainHeight(signX, signWorldZ);

    const roadsideSign = this.createBoardSign(
      signX,
      signY,
      signWorldZ,
      data.title,
      data.badgeText || data.category,
      data.color,
      data.index
    );

    // Orientar el cartel siguiendo la tangente de la vía e inclinado 18° hacia el carril
    roadsideSign.rotation.y = signHeading + (side > 0 ? -0.32 : 0.32);
    this.scene.add(roadsideSign);

    // Colisionador físico sólido para el poste del cartel
    this.createStaticBoxCollider(signX, signY + 2.0, signWorldZ, 7.5, 4.2, 1.2, roadsideSign.rotation.y);

    if (data.builder) {
      data.builder(stationGroup, stationX, stationY, stationZ, heading, side);
    }

    this.scene.add(stationGroup);

    // Zona de activación centrada entre el círculo de luz y el borde de la calzada
    const triggerPos = new THREE.Vector3(
      rx + side * nx * 8.5,
      ry,
      z + side * nz * 8.5
    );

    this.checkpoints.push({
      id: data.id,
      index: data.index,
      title: data.title,
      category: data.category,
      pos: triggerPos,
      radius: 9.2, // Radio generoso que cubre la calzada cercana y el círculo de luz
      color: data.color,
    });
  }

  createFinishLine(x, z) {
    // Meta final con banderines a cuadros y contacto
    const finishY = getRoadY(z);
    const finishGroup = new THREE.Group();
    finishGroup.position.set(x, finishY, z);

    // Línea de meta a cuadros en el suelo
    const finishLineGeo = new THREE.PlaneGeometry(14, 3.5);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const cols = 8;
    const rows = 2;
    const cw = 512 / cols;
    const rh = 128 / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(c * cw, r * rh, cw, rh);
      }
    }
    const tex = this.createCrispTexture(canvas);
    const lineMesh = new THREE.Mesh(finishLineGeo, new THREE.MeshBasicMaterial({ map: tex }));
    lineMesh.rotation.x = -Math.PI / 2;
    lineMesh.position.y = 0.05;
    finishGroup.add(lineMesh);

    // Arco de Meta
    const colMat = new THREE.MeshStandardMaterial({ color: 0x5c2b0e, roughness: 0.7 });
    const colL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 8.5, 1.8), colMat);
    colL.position.set(-7.5, 4.25, 0);
    finishGroup.add(colL);

    const colR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 8.5, 1.8), colMat);
    colR.position.set(7.5, 4.25, 0);
    finishGroup.add(colR);

    // Viga superior con letrero de meta
    const beamGeo = new THREE.BoxGeometry(16.5, 2.5, 1.8);
    const beam = new THREE.Mesh(beamGeo, colMat);
    beam.position.set(0, 8.8, 0);
    finishGroup.add(beam);

    // Letrero de Meta (2048 x 512)
    const canvasMeta = document.createElement('canvas');
    canvasMeta.width = 2048;
    canvasMeta.height = 512;
    const ctxMeta = canvasMeta.getContext('2d');

    ctxMeta.fillStyle = '#090d16';
    ctxMeta.fillRect(0, 0, 2048, 512);

    ctxMeta.strokeStyle = '#10b981';
    ctxMeta.lineWidth = 22;
    ctxMeta.strokeRect(11, 11, 2026, 490);

    ctxMeta.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctxMeta.lineWidth = 4;
    ctxMeta.strokeRect(30, 30, 1988, 452);

    ctxMeta.fillStyle = '#34d399';
    ctxMeta.font = '900 96px "Open Sans", sans-serif';
    ctxMeta.textAlign = 'center';
    ctxMeta.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctxMeta.shadowBlur = 16;
    ctxMeta.fillText('META ALCANZADA', 1024, 155);
    ctxMeta.shadowBlur = 0;

    ctxMeta.fillStyle = '#ffffff';
    ctxMeta.font = 'bold 50px "Tiny5", monospace';
    ctxMeta.fillText('JAHIR SÁNCHEZ CENTELLA • SOFTWARE ARCHITECT & FULL-STACK', 1024, 275);

    ctxMeta.fillStyle = '#fef08a';
    ctxMeta.font = 'bold 40px "Open Sans", sans-serif';
    ctxMeta.fillText('jahirjanche@gmail.com  •  LINKEDIN  •  GITHUB: @llir0', 1024, 395);

    const texMeta = this.createCrispTexture(canvasMeta);
    const metaGeo = new THREE.PlaneGeometry(15.5, 2.8);
    const metaMat = new THREE.MeshBasicMaterial({ map: texMeta, side: THREE.DoubleSide });

    // Cara frontal hacia el auto que llega (mira hacia -Z)
    const metaSignFront = new THREE.Mesh(metaGeo, metaMat);
    metaSignFront.position.set(0, 8.8, -0.95);
    metaSignFront.rotation.y = Math.PI;
    finishGroup.add(metaSignFront);

    // Cara trasera (mira hacia +Z)
    const metaSignBack = new THREE.Mesh(metaGeo, metaMat);
    metaSignBack.position.set(0, 8.8, 0.95);
    metaSignBack.rotation.y = 0;
    finishGroup.add(metaSignBack);

    this.scene.add(finishGroup);

    this.createStaticBoxCollider(x - 7.5, finishY + 4.25, z, 1.8, 8.5, 1.8);
    this.createStaticBoxCollider(x + 7.5, finishY + 4.25, z, 1.8, 8.5, 1.8);

    this.checkpoints.push({
      id: 'meta-contacto',
      index: 6,
      title: '¡Meta Alcanzada! Contacto Profesional',
      category: 'Contacto & Liderazgo Técnico',
      pos: new THREE.Vector3(x, finishY, z),
      radius: 6.8,
      color: 0x10b981,
    });
  }

  createBoardSign(x, y, z, title, subtitle, colorHex = 0xf59e0b, index = null) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Dimensiones del gran cartel
    const boardWidth = 8.8;
    const boardHeight = 3.6;

    // 1. Postes gemelos de madera plantados en el suelo que elevan el cartel
    const postMat = new THREE.MeshStandardMaterial({ color: 0x3d1c06, roughness: 0.85 });
    const postGeo = new THREE.CylinderGeometry(0.18, 0.22, 4.6, 12);

    const postL = new THREE.Mesh(postGeo, postMat);
    postL.position.set(-3.2, 2.3, 0);
    postL.castShadow = true;
    group.add(postL);

    const postR = new THREE.Mesh(postGeo, postMat);
    postR.position.set(3.2, 2.3, 0);
    postR.castShadow = true;
    group.add(postR);

    // Grupo de panel inclinado suavemente hacia la cámara isométrica
    const signPanel = new THREE.Group();
    signPanel.position.set(0, 3.2, 0);
    signPanel.rotation.x = -0.14; // Inclinación suave ~8° hacia la cámara superior
    group.add(signPanel);

    // Tablero trasero de madera
    const boardBackGeo = new THREE.BoxGeometry(boardWidth + 0.3, boardHeight + 0.3, 0.18);
    const boardBack = new THREE.Mesh(boardBackGeo, postMat);
    boardBack.castShadow = true;
    signPanel.add(boardBack);

    // 2. Lienzo 2D en Ultra Alta Definición (2048 x 850)
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');

    // Fondo oscuro profundo de alto contraste
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 2048, 850);

    const hexStr = `#${colorHex.toString(16).padStart(6, '0')}`;

    // Marco exterior con color temático del proyecto
    ctx.strokeStyle = hexStr;
    ctx.lineWidth = 26;
    ctx.strokeRect(13, 13, 2022, 824);

    // Filete interior sutil
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, 1976, 778);

    // 1. Etiqueta Superior (Píldora de Hito)
    const badgeText = index !== null 
      ? `ESTACION 0${index + 1} • ${(subtitle || 'PROYECTO').toUpperCase()}`
      : `${(subtitle || 'PROYECTO DESTACADO').toUpperCase()}`;

    ctx.fillStyle = hexStr;
    const badgeWidth = Math.min(ctx.measureText(badgeText).width + 90, 1850);
    ctx.fillRect(1024 - badgeWidth / 2, 55, badgeWidth, 72);

    ctx.fillStyle = '#090d16';
    ctx.font = '900 42px "Tiny5", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 1024, 91);

    // 2. Título Principal en Alta Legibilidad
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    let titleFontSize = 94;
    ctx.font = `900 ${titleFontSize}px "Open Sans", -apple-system, sans-serif`;
    const titleWidth = ctx.measureText(title).width;
    if (titleWidth > 1820) {
      titleFontSize = Math.floor(titleFontSize * (1820 / titleWidth));
      ctx.font = `900 ${titleFontSize}px "Open Sans", -apple-system, sans-serif`;
    }

    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillText(title, 1024, 275);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Línea separadora luminosa
    ctx.strokeStyle = hexStr;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(350, 335);
    ctx.lineTo(1698, 335);
    ctx.stroke();

    // 3. Subtítulo o Descripción del Rol / Stack
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 50px "Open Sans", sans-serif';
    ctx.fillText(subtitle, 1024, 430);

    // 4. Franja de Acción de Alto Contraste (Call to Action)
    ctx.fillStyle = 'rgba(251, 191, 36, 0.16)';
    ctx.fillRect(80, 520, 1888, 110);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(80, 520, 1888, 110);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 42px "Tiny5", monospace';
    ctx.fillText('ACÉRCATE CON EL AUTO PARA ABRIR EL EXPEDIENTE TÉCNICO', 1024, 590);

    // Pie con credencial
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 32px "Tiny5", monospace';
    ctx.fillText('JAHIR SÁNCHEZ CENTELLA • ARCHITECTURE & CODE', 1024, 750);

    // Textura de máxima nitidez sin mipmaps borrosos
    const tex = this.createCrispTexture(canvas);

    const planeGeo = new THREE.PlaneGeometry(boardWidth, boardHeight);
    const signMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });

    // Cara frontal hacia el auto (-Z)
    const frontMesh = new THREE.Mesh(planeGeo, signMat);
    frontMesh.position.set(0, 0, -0.1);
    frontMesh.rotation.y = Math.PI;
    signPanel.add(frontMesh);

    // Cara posterior (+Z)
    const backMesh = new THREE.Mesh(planeGeo, signMat);
    backMesh.position.set(0, 0, 0.1);
    backMesh.rotation.y = 0;
    signPanel.add(backMesh);

    return group;
  }

  createRampsAndBoostPads() {
    // Carretera 100% lisa, continua y sin obstáculos/rampas que desestabilicen el vehículo
    // Pads de Turbo de alta velocidad integrados al ras del asfalto siguiendo curvas y pendientes
    const boostZs = [14, 50, 102, 148, 198, 246, 302];
    boostZs.forEach(bz => {
      this.createTurboBoostPad(getRoadX(bz), bz);
    });
  }

  createJumpRamp(x, y, z, rotationY) {
    const rampGroup = new THREE.Group();
    rampGroup.position.set(x, y, z);
    rampGroup.rotation.y = rotationY;

    const width = 4.2;
    const length = 6.5;
    const height = 1.8;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(length, 0);
    shape.lineTo(length, height);
    shape.closePath();

    const rampGeo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    rampGeo.translate(0, 0, -width / 2);

    const rampMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Rampa de madera rústica
      roughness: 0.6,
      metalness: 0.2,
    });

    const mesh = new THREE.Mesh(rampGeo, rampMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rampGroup.add(mesh);
    this.scene.add(rampGroup);

    const halfL = length / 2;
    const rampBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(halfL, height / 2, width / 2)),
      position: new CANNON.Vec3(x, y + height / 3, z),
    });
    rampBody.isRamp = true; // Marcar como rampa legítima
    rampBody.quaternion.setFromEuler(0, rotationY, Math.PI / 12);
    this.physicsWorld.addBody(rampBody);
  }

  createTurboBoostPad(x, z) {
    const padGeo = new THREE.PlaneGeometry(3.5, 5.5);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1c110b';
    ctx.fillRect(0, 0, 256, 512);

    // Borde brillante del pad
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 244, 500);

    ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < 3; i++) {
      const y = 130 + i * 130;
      ctx.beginPath();
      ctx.moveTo(128, y + 50); // Punta de la flecha apuntando hacia adelante en la dirección de la ruta (+Z)
      ctx.lineTo(220, y - 40); // Ala derecha
      ctx.lineTo(170, y - 40);
      ctx.lineTo(128, y);      // Vértice interior
      ctx.lineTo(86, y - 40);
      ctx.lineTo(36, y - 40);  // Ala izquierda
      ctx.closePath();
      ctx.fill();
    }

    const tex = this.createCrispTexture(canvas);
    const padMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95 });

    const ry = getRoadY(z);
    const heading = getRoadHeading(z);
    const pitch = getRoadPitch(z);

    const padGroup = new THREE.Group();
    padGroup.position.set(x, ry + 0.062, z);
    padGroup.rotation.order = 'YXZ';
    padGroup.rotation.set(-pitch, heading, 0);

    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.rotation.x = -Math.PI / 2;
    padGroup.add(padMesh);
    this.scene.add(padGroup);

    this.boostPads.push({ pos: new THREE.Vector3(x, ry, z), radius: 3.0 });
  }

  createLowPolyCow() {
    const cow = new THREE.Group();
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.2), whiteMat);
    body.position.y = 1.4;
    cow.add(body);

    const spot = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.22), darkMat);
    spot.position.set(0.3, 1.4, 0);
    cow.add(spot);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), whiteMat);
    head.position.set(1.4, 1.9, 0);
    cow.add(head);

    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.7), pinkMat);
    muzzle.position.set(1.85, 1.7, 0);
    cow.add(muzzle);

    const legGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3);
    const legPositions = [
      { x: -0.7, z: -0.4 }, { x: -0.7, z: 0.4 },
      { x: 0.7, z: -0.4 },  { x: 0.7, z: 0.4 },
    ];
    legPositions.forEach(p => {
      const leg = new THREE.Mesh(legGeo, darkMat);
      leg.position.set(p.x, 0.45, p.z);
      cow.add(leg);
    });

    return cow;
  }

  createStaticBoxCollider(x, y, z, w, h, d, yaw = 0) {
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)),
      position: new CANNON.Vec3(x, y, z),
    });
    if (yaw !== 0) {
      body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
    }
    this.physicsWorld.addBody(body);
  }

  update(delta, time) {
    this.physicsObjects.forEach(obj => {
      obj.mesh.position.copy(obj.body.position);
      obj.mesh.quaternion.copy(obj.body.quaternion);
    });

    this.animatedMeshes.forEach(item => {
      if (item.rotSpeed) {
        item.mesh.rotation.y += item.rotSpeed * delta;
      }
      if (item.bobbing) {
        item.mesh.position.y = item.baseHeight + Math.sin(time * 2.5) * 0.3;
      }
    });

    // Animar hojas otoñales flotando suavemente en el viento
    if (this.floatingLeaves && this.floatingLeaves.length > 0) {
      for (let i = 0; i < this.floatingLeaves.length; i++) {
        const leaf = this.floatingLeaves[i];
        leaf.mesh.position.y -= leaf.speed * delta;
        leaf.mesh.position.x = leaf.baseX + Math.sin(time * 1.4 + leaf.phase) * 1.3;
        leaf.mesh.rotation.x += leaf.rotSpeed * delta;
        leaf.mesh.rotation.z += leaf.rotSpeed * 0.7 * delta;
        if (leaf.mesh.position.y < leaf.baseY) {
          leaf.mesh.position.y = leaf.maxY;
        }
      }
    }
  }
}
