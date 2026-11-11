// js/game.js - Controlador principal del recorrido y la interfaz
import * as THREE from './lib/three.module.js';
import * as CANNON from './lib/cannon-es.js';
import { sound } from './audio.js';
import { ToyCar } from './car.js';
import { WorldBuilder, getRoadX, getRoadHeading } from './world.js';

let lastConsoleCvTime = 0;

function printConsoleResume(force = false) {
  const now = Date.now();
  if (!force && now - lastConsoleCvTime < 1500) return;
  lastConsoleCvTime = now;

  const W = 74;
  const line = (ch = '═') => ch.repeat(W);
  const row = (txt = '') => `║  ${txt.padEnd(W - 2, ' ')}║`;

  const bannerStyle = 'color: #fef3c7; background: #1c110b; border: 1px solid #f59e0b; padding: 5px 12px; font-weight: bold; font-size: 13px; font-family: monospace;';
  const subStyle = 'color: #f59e0b; font-weight: bold; font-family: monospace; font-size: 12px;';
  const boxStyle = 'color: #e2e8f0; font-family: monospace; font-size: 12px; line-height: 1.45;';
  const cyanStyle = 'color: #06b6d4; font-weight: bold; font-family: monospace; font-size: 12px;';
  const emeraldStyle = 'color: #34d399; font-weight: bold; font-family: monospace; font-size: 12px;';
  const mutedStyle = 'color: #94a3b8; font-family: monospace; font-size: 11px;';

  const block = [
    `╔${line('═')}╗`,
    row('HOJA DE VIDA  //  JAHIR ELIECER SÁNCHEZ CENTELLA'),
    `╠${line('─')}╣`,
    row('• Rol        : Software Architect & Full-Stack Developer'),
    row('• Formación  : 5to Año Ing. de Sistemas Computacionales — UTP Azuero'),
    row('• Ubicación  : Chitré, Herrera, Panamá'),
    row(),
    row('RESUMEN PROFESIONAL'),
    row('Desarrollador con experiencia creando aplicaciones reales en producción'),
    row('de punta a punta: bases de datos en SQL Server, APIs en Node.js,'),
    row('interfaces en React/Tailwind y despliegues en Vercel / Cloudflare.'),
    `╠${line('─')}╣`,
    row('PROYECTOS EN PRODUCCIÓN'),
    row('▸ Control Ganadero Pro v2.5  | AgroTech / Web App (+1,200 registros)'),
    row('▸ MiAliado (SIGC)            | ERP Comercial & Control de Inventario'),
    row('▸ Portal Kelme Latam Hub     | Plataforma Mayorista B2B'),
    row('▸ ErgoIA                     | Salud Laboral con Visión Artificial'),
    row('▸ Traductor Lengua de Señas  | Investigación Premiada JIC UTP 2025'),
    `╠${line('─')}╣`,
    row('STACK TECNOLÓGICO & CERTIFICACIONES'),
    row('• Stack  : React, TypeScript, Node.js, Python, SQL Server, Firebase'),
    row('• Cloud  : Vercel, Cloudflare Pages, Git/GitHub, Linux'),
    row('• IA     : Samsung Innovation Campus — 200h (Cert. SIC1767-2025)'),
    `╠${line('─')}╣`,
    row('CONTACTO DIRECTO'),
    row('• Correo : jahirjanche@gmail.com'),
    row('• Tel/WA : +507 6606-1997'),
    row('• GitHub : https://github.com/llir0'),
    `╚${line('═')}╝`,
  ].join('\n');

  console.log('%c JAHIR SÁNCHEZ CENTELLA %c  Software Architect & Full-Stack Developer', bannerStyle, subStyle);
  console.log(`%c${block}`, boxStyle);
  console.log('%c[ CV CONSOLE ]%c Usa el botón "Modo CV / Texto" arriba para ver el currículum completo.', emeraldStyle, mutedStyle);
  console.log(`%c${'─'.repeat(76)}`, cyanStyle);
}

class GameController {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.activeStationId = null;
    this.visitedStations = new Set();
    this.isCardPinned = false;

    // Estado de entradas
    this.inputs = {
      up: false,
      down: false,
      left: false,
      right: false,
      space: false,
    };

    this.clock = new THREE.Clock();

    this.initThree();
    this.initPhysics();
    this.setupCarAndWorld();
    this.setupInputListeners();
    this.setupUIControls();
    this.setupMinimap();

    // Iniciar bucle de renderizado
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 450);
    this.baseCameraOffset = new THREE.Vector3(0, 18, -24); // Detrás y arriba del auto
    this.cameraOffset = this.baseCameraOffset.clone();
    this.cameraLookOffset = new THREE.Vector3(0, 1.5, 6);
    this.zoomLevel = 1.0;
    this.targetZoom = 1.0;
    this.minZoom = 0.40; // Acercamiento detallado para leer carteles
    this.maxZoom = 2.20; // Vista panorámica amplia aérea

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initPhysics() {
    this.physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -22, 0),
    });
    this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld);
    this.physicsWorld.solver.iterations = 12;
    this.physicsWorld.defaultContactMaterial.friction = 0.25;
    this.physicsWorld.defaultContactMaterial.restitution = 0.0; // Sin rebote sobre el suelo
    this.physicsWorld.defaultContactMaterial.contactEquationStiffness = 1e8;
    this.physicsWorld.defaultContactMaterial.contactEquationRelaxation = 4;
  }

  setupCarAndWorld() {
    this.worldBuilder = new WorldBuilder(this.scene, this.physicsWorld);
    this.car = new ToyCar(this.scene, this.physicsWorld);
    this.car.resetPosition(new THREE.Vector3(0, 0.45, -10)); // Frente al arco de inicio

    // Posicionar cámara inmediatamente detrás del vehículo desde el primer fotograma
    const carPos = this.car.getPosition();
    const carAngle = this.car.heading;
    const rotatedOffset = this.cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), carAngle);
    this.camera.position.copy(carPos.clone().add(rotatedOffset));
    const forwardLook = new THREE.Vector3(0, 1.6, 6).applyAxisAngle(new THREE.Vector3(0, 1, 0), carAngle);
    this.camera.lookAt(carPos.clone().add(forwardLook));
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      sound.init();

      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') this.inputs.up = true;
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') this.inputs.down = true;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') this.inputs.left = true;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') this.inputs.right = true;
      if (e.key === ' ') {
        this.inputs.space = true;
        sound.playHorn();
      }
      if (e.key.toLowerCase() === 'h') sound.playHorn();
      if (e.key.toLowerCase() === 'r') this.car.resetPosition(new THREE.Vector3(0, 0.45, -10));

      const isDevToolsShortcut =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'i' || e.key.toLowerCase() === 'j'));
      if (isDevToolsShortcut) {
        setTimeout(() => printConsoleResume(), 150);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') this.inputs.up = false;
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') this.inputs.down = false;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') this.inputs.left = false;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') this.inputs.right = false;
      if (e.key === ' ') this.inputs.space = false;
    });

    // Control de Zoom suave con la Ruedita del Ratón (Mouse Wheel)
    window.addEventListener('wheel', (e) => {
      // Si el cursor está haciendo scroll dentro del expediente modal o el modo texto CV, no alteramos la cámara
      const isOverScrollable = e.target.closest('#hud-project-card') || 
                               e.target.closest('#classic-view-overlay') || 
                               e.target.closest('.overflow-y-auto');
      if (isOverScrollable) return;

      e.preventDefault();
      // deltaY > 0 aleja la cámara, deltaY < 0 acerca la cámara
      const zoomStep = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.0016, 0.18);
      this.targetZoom = THREE.MathUtils.clamp(this.targetZoom + zoomStep, this.minZoom, this.maxZoom);
    }, { passive: false });

    window.addEventListener('click', () => sound.init(), { once: true });
  }

  setupUIControls() {
    // Botones de Zoom en pantalla
    document.getElementById('hud-zoom-in-btn')?.addEventListener('click', () => {
      this.targetZoom = THREE.MathUtils.clamp(this.targetZoom - 0.25, this.minZoom, this.maxZoom);
    });

    document.getElementById('hud-zoom-out-btn')?.addEventListener('click', () => {
      this.targetZoom = THREE.MathUtils.clamp(this.targetZoom + 0.25, this.minZoom, this.maxZoom);
    });

    document.getElementById('hud-horn-btn')?.addEventListener('click', () => {
      sound.init();
      sound.playHorn();
    });

    document.getElementById('hud-reset-btn')?.addEventListener('click', () => {
      this.car.resetPosition(new THREE.Vector3(0, 0.45, -10));
    });

    const muteBtn = document.getElementById('hud-mute-btn');
    muteBtn?.addEventListener('click', () => {
      sound.init();
      const isMuted = sound.toggleMute();
      if (muteBtn) {
        muteBtn.innerHTML = isMuted 
          ? `<svg class="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>`
          : `<svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>`;
      }
    });

    // Botones de Viaje Rápido (Autopiloto) a lo largo de la carretera lineal
    const fastTravelButtons = document.querySelectorAll('[data-station-target]');
    fastTravelButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sound.init();
        const targetId = btn.getAttribute('data-station-target');
        this.teleportOrDriveToStation(targetId);
      });
    });

    document.getElementById('hud-card-close')?.addEventListener('click', () => {
      this.closeStationHUD();
    });

    this.setupTouchControls();
  }

  setupTouchControls() {
    const bindTouch = (elemId, inputKey) => {
      const el = document.getElementById(elemId);
      if (!el) return;
      const start = (e) => { e.preventDefault(); sound.init(); this.inputs[inputKey] = true; };
      const end = (e) => { e.preventDefault(); this.inputs[inputKey] = false; };
      el.addEventListener('touchstart', start);
      el.addEventListener('touchend', end);
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', end);
    };

    bindTouch('touch-up', 'up');
    bindTouch('touch-down', 'down');
    bindTouch('touch-left', 'left');
    bindTouch('touch-right', 'right');
    bindTouch('touch-space', 'space');
  }

  setupMinimap() {
    this.minimapCanvas = document.getElementById('minimap-canvas');
    if (!this.minimapCanvas) return;
    this.minimapCtx = this.minimapCanvas.getContext('2d');
  }

  teleportOrDriveToStation(stationId) {
    if (stationId === 'start') {
      this.car.resetPosition(new THREE.Vector3(getRoadX(-10), 0.45, -10), getRoadHeading(-10));
      this.closeStationHUD();
      return;
    }

    if (stationId === 'stack-ia') {
      this.car.resetPosition(new THREE.Vector3(getRoadX(24), 0.45, 24), getRoadHeading(24));
      this.closeStationHUD();
      return;
    }

    const checkpoint = this.worldBuilder.checkpoints.find(c => c.id === stationId);
    if (!checkpoint) return;

    // Colocar el auto frente a la estación sobre la carretera curva
    const target = checkpoint.pos.clone();
    const spawnZ = target.z - 3;
    const roadCenter = getRoadX(spawnZ);
    const spawnX = target.x > roadCenter ? roadCenter + 2.5 : roadCenter - 2.5;
    this.car.resetPosition(new THREE.Vector3(spawnX, 0.45, spawnZ), getRoadHeading(spawnZ));
    sound.playCheckpoint();
    this.triggerCheckpointArrival(checkpoint);
  }

  checkCollisionsAndTriggers() {
    const carPos = this.car.getPosition();

    // 1. Detección de Boost Pads (Turbo)
    this.worldBuilder.boostPads.forEach(pad => {
      const dist = carPos.distanceTo(pad.pos);
      if (dist < pad.radius && !this.car.isBoosting) {
        this.car.triggerTurbo();
      }
    });

    // 2. Detección de Checkpoints de Proyectos
    let insideAnyStation = null;
    this.worldBuilder.checkpoints.forEach(cp => {
      const dist = carPos.distanceTo(cp.pos);
      if (dist < cp.radius) {
        insideAnyStation = cp;
      }
    });

    if (insideAnyStation) {
      if (this.activeStationId !== insideAnyStation.id) {
        this.triggerCheckpointArrival(insideAnyStation);
      }
    } else {
      if (this.activeStationId && !this.isCardPinned) {
        this.closeStationHUD();
      }
    }
  }

  triggerCheckpointArrival(checkpoint) {
    this.activeStationId = checkpoint.id;
    sound.playCheckpoint();

    this.visitedStations.add(checkpoint.id);
    this.updateProgressBadge();
    this.showRichStationHUD(checkpoint);
  }

  updateProgressBadge() {
    const badge = document.getElementById('hud-progress-counter');
    if (badge) {
      const total = this.worldBuilder.checkpoints.length;
      badge.textContent = `${this.visitedStations.size} / ${total} Hitos`;
    }
  }

  // Mostrar tarjeta lateral con el detalle del proyecto
  showRichStationHUD(checkpoint) {
    const hudCard = document.getElementById('hud-project-card');
    if (!hudCard) return;

    // Buscar proyecto en projectsData
    const allProjects = (typeof window !== 'undefined' && window.projectsData) ? window.projectsData : [];
    const projData = allProjects.find(p => p.id === checkpoint.id);
    const bodyContainer = document.getElementById('hud-card-body-content');
    if (!bodyContainer) return;

    // Color temático en HEX
    const colorHex = `#${checkpoint.color.toString(16).padStart(6, '0')}`;
    hudCard.style.borderColor = `${colorHex}88`;
    hudCard.style.boxShadow = `0 15px 35px -5px rgba(0, 0, 0, 0.7), 0 0 25px ${colorHex}33`;

    if (projData) {
      // PROYECTO COMPLETO CON DESCRIPCIÓN REAL, DESARROLLO, STACK Y ENLACES
      bodyContainer.innerHTML = `
        <div class="space-y-4">
          <!-- Encabezado del Proyecto -->
          <div class="border-b border-slate-800/80 pb-3">
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <span class="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase" style="background: ${colorHex}22; color: ${colorHex}; border: 1px solid ${colorHex}55;">
                ● ${projData.status}
              </span>
              <span class="text-[11px] font-mono text-slate-400">${projData.date}</span>
              <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">${projData.version}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-black text-white tracking-tight">${projData.title}</h2>
            <p class="text-xs font-mono mt-0.5" style="color: ${colorHex};">${projData.tagline}</p>
          </div>

          <!-- Sobre el Proyecto -->
          <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs leading-relaxed space-y-1.5">
            <span class="font-mono font-bold text-[11px] uppercase tracking-wider text-amber-400 block">Sobre el proyecto</span>
            <p class="text-slate-200 leading-relaxed">${projData.fullDescription}</p>
          </div>

          <!-- Aspectos Técnicos & Desarrollo -->
          <div class="space-y-2">
            <span class="font-mono font-bold text-[11px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>Cómo lo construí</span>
            </span>
            <div class="grid grid-cols-1 gap-2">
              ${projData.architecture.map(arc => `
                <div class="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs">
                  <span class="font-mono font-bold block mb-0.5" style="color: ${colorHex};">▸ ${arc.label}</span>
                  <span class="text-slate-300 text-[11px] leading-relaxed">${arc.desc}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Funcionalidades Clave -->
          <div class="space-y-1.5">
            <span class="font-mono font-bold text-[11px] uppercase tracking-wider text-slate-300 block">Funcionalidades principales</span>
            <ul class="space-y-1.5 text-xs text-slate-300">
              ${projData.features.map(f => `
                <li class="flex items-start gap-2">
                  <span class="text-emerald-400 font-bold">•</span>
                  <span>${f}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <!-- Tecnologías Utilizadas -->
          <div>
            <span class="font-mono font-bold text-[11px] uppercase tracking-wider text-slate-300 block mb-1.5">Tecnologías utilizadas</span>
            <div class="flex flex-wrap gap-1.5">
              ${projData.tools.map(tool => `
                <span class="text-[10px] font-mono px-2.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                  ${tool}
                </span>
              `).join('')}
            </div>
          </div>

          <!-- Botones de Acción Directa -->
          <div class="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
            ${projData.liveUrl ? `
              <a href="${projData.liveUrl}" target="_blank" rel="noopener noreferrer" class="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-transform hover:-translate-y-0.5">
                <span>Ver Proyecto en Vivo</span>
                <span>↗</span>
              </a>
            ` : ''}
            ${projData.githubUrl ? `
              <a href="${projData.githubUrl}" target="_blank" rel="noopener noreferrer" class="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-xs tracking-wide border border-slate-700 flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5">
                <span>Ver en GitHub</span>
                <span>↗</span>
              </a>
            ` : ''}
            ${projData.privateNotice ? `
              <div class="w-full text-center text-[11px] font-mono text-amber-300/90 py-1.5 px-2 bg-amber-950/30 rounded-lg border border-amber-800/40">
                ${projData.privateNotice}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } else if (checkpoint.id === 'educacion-certs') {
      // FORMACIÓN ACADÉMICA & CERTIFICACIONES REALES
      bodyContainer.innerHTML = `
        <div class="space-y-4">
          <div class="border-b border-slate-800 pb-3">
            <span class="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase" style="background: ${colorHex}22; color: ${colorHex}; border: 1px solid ${colorHex}55;">
              FORMACIÓN ACADÉMICA
            </span>
            <h2 class="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">Educación & Certificados</h2>
            <p class="text-xs font-mono text-cyan-300">Universidad Tecnológica de Panamá & Samsung Innovation Campus</p>
          </div>

          <div class="space-y-3 text-xs">
            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div class="flex justify-between items-center">
                <strong class="text-white text-sm">Ingeniería de Sistemas Computacionales</strong>
                <span class="text-cyan-400 font-mono text-[11px] font-bold">5to Año Activo</span>
              </div>
              <p class="text-slate-300 leading-relaxed">Universidad Tecnológica de Panamá (Centro Regional de Azuero). Culminando el plan de estudios a finales de 2026, con proyecto de tesis programado para 2026-2027.</p>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div class="flex justify-between items-center">
                <strong class="text-white text-sm">Programa de Inteligencia Artificial (200 Horas)</strong>
                <span class="text-amber-400 font-mono text-[11px] font-bold">SAMSUNG</span>
              </div>
              <p class="text-slate-300 leading-relaxed">Samsung Innovation Campus (Agosto - Diciembre 2025). Formación técnica intensiva en machine learning, redes neuronales y visión artificial. Certificado oficial: SIC1767-2025.</p>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div class="flex justify-between items-center">
                <strong class="text-white text-sm">Jornada de Iniciación Científica (JIC 2025)</strong>
                <span class="text-rose-400 font-mono text-[11px] font-bold">UTP 2025</span>
              </div>
              <p class="text-slate-300 leading-relaxed">Proyecto de investigación: "Propuesta de software para traducción de Lengua de Señas Panameña mediante Visión Artificial", con reconocimiento oficial de la UTP.</p>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div class="flex justify-between items-center">
                <strong class="text-white text-sm">Congreso de Ingeniería UTP Azuero</strong>
                <span class="text-slate-400 font-mono text-[11px]">Participación Continua</span>
              </div>
              <p class="text-slate-300 leading-relaxed">Asistencia y actualización técnica en conferencias sobre arquitectura de software, bases de datos y desarrollo web moderno.</p>
            </div>
          </div>
        </div>
      `;
    } else if (checkpoint.id === 'meta-contacto') {
      // META FINAL & CONTACTO PERSONAL
      bodyContainer.innerHTML = `
        <div class="space-y-4">
          <div class="border-b border-slate-800 pb-3">
            <span class="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              LLEGADA A LA META
            </span>
            <h2 class="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">¡Has completado el recorrido!</h2>
            <p class="text-xs font-mono text-emerald-400">Jahir Eliecer Sánchez Centella</p>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed">
            Gracias por recorrer mi portafolio. Soy estudiante de 5to año de Ingeniería de Sistemas en la UTP Azuero. Si buscas a alguien con iniciativa, experiencia creando aplicaciones reales en producción y muchas ganas de aportar valor a tu equipo de desarrollo, ponte en contacto conmigo:
          </p>

          <div class="space-y-2 text-xs font-mono">
            <a href="mailto:jahirjanche@gmail.com" class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-slate-200 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors">
              <span>Correo Electrónico:</span>
              <strong class="text-cyan-400">jahirjanche@gmail.com</strong>
            </a>

            <a href="tel:66061997" class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-slate-200 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors">
              <span>Teléfono / WhatsApp:</span>
              <strong class="text-cyan-400">+507 6606-1997</strong>
            </a>

            <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-slate-200">
              <span>Ubicación:</span>
              <strong class="text-slate-300">Chitré, Herrera, Panamá</strong>
            </div>

            <a href="https://github.com/llir0" target="_blank" class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-slate-200 hover:text-white hover:border-slate-600 transition-colors">
              <span>GitHub Oficial:</span>
              <strong class="text-cyan-400">github.com/llir0 ↗</strong>
            </a>
          </div>

          <a href="mailto:jahirjanche@gmail.com?subject=Oportunidad%20Laboral%20/%20Proyecto" class="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-transform hover:-translate-y-0.5">
            <span>Escribirme un Mensaje ↗</span>
          </a>
        </div>
      `;
    } else if (checkpoint.id === 'stack-ia') {
      // HABILIDADES & STACK TÉCNICO DE JAHIR
      bodyContainer.innerHTML = `
        <div class="space-y-4">
          <div class="border-b border-slate-800 pb-3">
            <span class="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              HABILIDADES & STACK TÉCNICO
            </span>
            <h2 class="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">Stack & Especialidades</h2>
            <p class="text-xs font-mono text-cyan-300">Desarrollo Web Full-Stack, Cloud & Bases de Datos</p>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs leading-relaxed space-y-1.5">
            <span class="font-mono font-bold text-[11px] uppercase tracking-wider text-amber-400 block">Enfoque de Ingeniería</span>
            <p class="text-slate-200 leading-relaxed">Como estudiante de 5to año de Ingeniería de Sistemas Computacionales en la UTP Azuero, me enfoco en crear software práctico, seguro y bien estructurado. Domino el ciclo completo: desde modelar la base de datos relacional en SQL Server y construir la API hasta diseñar la interfaz de usuario con React y desplegarla en la nube con dominio propio.</p>
          </div>

          <div class="space-y-2 text-xs">
            <div class="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <strong class="text-cyan-400 font-mono block mb-0.5">▸ Frontend & Interfaces Web:</strong>
              <span class="text-slate-300 text-[11px]">React, TypeScript, JavaScript Moderno, Tailwind CSS, HTML5 Semántico, CSS3.</span>
            </div>
            <div class="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <strong class="text-cyan-400 font-mono block mb-0.5">▸ Backend & Bases de Datos:</strong>
              <span class="text-slate-300 text-[11px]">SQL Server, Node.js, Modelado Relacional, APIs RESTful, Firebase / Firestore.</span>
            </div>
            <div class="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <strong class="text-cyan-400 font-mono block mb-0.5">▸ Cloud & Despliegue:</strong>
              <span class="text-slate-300 text-[11px]">Vercel, Cloudflare Pages, Git / GitHub, Entornos Linux (Debian, CachyOS).</span>
            </div>
            <div class="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <strong class="text-cyan-400 font-mono block mb-0.5">▸ Visión Artificial & Python:</strong>
              <span class="text-slate-300 text-[11px]">Python, OpenCV, MediaPipe, Redes Neuronales (Certificación Samsung 200h).</span>
            </div>
          </div>
        </div>
      `;
    } else {
      // Fallback universal con los datos de la estación
      bodyContainer.innerHTML = `
        <div class="space-y-3">
          <div class="border-b border-slate-800 pb-3">
            <span class="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase" style="background: ${colorHex}22; color: ${colorHex}; border: 1px solid ${colorHex}55;">
              HITO DEL RECORRIDO
            </span>
            <h2 class="text-xl font-black text-white tracking-tight mt-1.5">${checkpoint.title}</h2>
            <p class="text-xs font-mono" style="color: ${colorHex};">${checkpoint.category}</p>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed">
            Punto de interés en la trayectoria profesional y proyectos de Jahir Sánchez Centella.
          </p>
        </div>
      `;
    }

    hudCard.classList.remove('hidden-hud-card');
    hudCard.classList.add('visible-hud-card');
  }

  closeStationHUD() {
    const hudCard = document.getElementById('hud-project-card');
    if (hudCard) {
      hudCard.classList.remove('visible-hud-card');
      hudCard.classList.add('hidden-hud-card');
    }
    this.activeStationId = null;
  }

  updateCamera() {
    const carPos = this.car.getPosition();

    // Suavizado e interpolación de zoom (lerp)
    this.zoomLevel = THREE.MathUtils.lerp(this.zoomLevel, this.targetZoom, 0.12);

    // Perspectiva isométrica suave siguiendo al auto escalada por el zoom actual
    const carAngle = this.car.heading;
    const currentOffset = this.baseCameraOffset.clone().multiplyScalar(this.zoomLevel);
    this.cameraOffset.copy(currentOffset);
    const rotatedOffset = currentOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carAngle);
    const targetCamPos = carPos.clone().add(rotatedOffset);

    this.camera.position.lerp(targetCamPos, 0.08);

    const forwardLook = new THREE.Vector3(0, 1.6, 6).applyAxisAngle(new THREE.Vector3(0, 1, 0), carAngle);
    const lookTarget = carPos.clone().add(forwardLook);
    this.camera.lookAt(lookTarget);

    if (this.worldBuilder.sunLight) {
      this.worldBuilder.sunLight.position.set(carPos.x + 45, carPos.y + 85, carPos.z + 30);
      this.worldBuilder.sunLight.target = this.car.mesh;
    }
  }

  renderMinimap() {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Fondo del radar con tono cálido otoñal oscuro
    ctx.fillStyle = 'rgba(28, 17, 11, 0.88)';
    ctx.fillRect(0, 0, w, h);

    const carPos = this.car.getPosition();

    // Escala de radar centrada en el auto
    const cx = w / 2;
    const scale = 0.35;

    // Dibujar trazado real de la carretera curva en el radar
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.38)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let started = false;
    const minSampleZ = Math.max(-26, carPos.z - 160);
    const maxSampleZ = Math.min(388, carPos.z + 160);
    for (let sampleZ = minSampleZ; sampleZ <= maxSampleZ; sampleZ += 4) {
      const rx = getRoadX(sampleZ);
      const mx = cx + (rx - carPos.x) * scale;
      const my = (h / 2) + (sampleZ - carPos.z) * scale;
      if (!started) {
        ctx.moveTo(mx, my);
        started = true;
      } else {
        ctx.lineTo(mx, my);
      }
    }
    ctx.stroke();

    // Dibujar estaciones relativas a la posición del auto
    this.worldBuilder.checkpoints.forEach(cp => {
      const relX = (cp.pos.x - carPos.x) * scale;
      const relZ = (cp.pos.z - carPos.z) * scale;

      const mx = cx + relX;
      const my = (h / 2) + relZ;

      if (mx >= 4 && mx <= w - 4 && my >= 4 && my <= h - 4) {
        ctx.fillStyle = `#${cp.color.toString(16).padStart(6, '0')}`;
        ctx.beginPath();
        ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Auto en el centro del radar (triángulo cyan)
    const angle = this.car.heading;
    ctx.save();
    ctx.translate(cx, h / 2);
    ctx.rotate(angle);

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(-4, -5);
    ctx.lineTo(4, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  updateHUD() {
    const speedEl = document.getElementById('hud-speed-value');
    if (speedEl) {
      speedEl.textContent = this.car.getSpeedKmH();
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsedTime = this.clock.getElapsedTime();

    this.physicsWorld.step(1 / 60, delta, 3);
    this.car.update(delta, this.inputs);
    this.worldBuilder.update(delta, elapsedTime);
    this.checkCollisionsAndTriggers();
    this.updateCamera();
    this.renderMinimap();
    this.updateHUD();

    this.renderer.render(this.scene, this.camera);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        Promise.all([
          document.fonts.load('700 16px "Open Sans"'),
          document.fonts.load('900 16px "Open Sans"'),
          document.fonts.load('400 16px "Tiny5"'),
          document.fonts.ready
        ]),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ]);
    }
  } catch (err) {
    // Continuar con fuentes por defecto si hay error de red
  }
  window.gameApp = new GameController();
  printConsoleResume(true);
});
