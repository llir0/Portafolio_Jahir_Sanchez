// js/car.js - Modelo 3D y física del vehículo
import * as THREE from './lib/three.module.js';
import * as CANNON from './lib/cannon-es.js';
import { sound } from './audio.js';
import { getDriveSurfaceHeight, getRoadPitch } from './world.js';

export class ToyCar {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;

    // Parámetros de conducción
    this.speed = 0;
    this.maxSpeed = 30;
    this.reverseMaxSpeed = 12;
    this.acceleration = 34;
    this.braking = 52;
    this.drag = 0.982;

    this.heading = 0; // Ángulo de orientación horizontal (Y-axis en radianes)
    this.steering = 0;
    this.maxSteeringAngle = 0.52;
    this.steerSpeed = 4.5;

    this.isDrifting = false;
    this.isBoosting = false;
    this.boostTimer = 0;

    // Control de salto y altura del suelo
    this.groundY = 0.0;
    this.isAirborne = false;

    // Partículas de humo y derrape
    this.dustParticles = [];

    this.createCarBody();
    this.createPhysics();
    this.setupParticles();
  }

  createCarBody() {
    this.mesh = new THREE.Group();

    // Contenedor visual interno para inclinaciones dinámicas de suspensión
    this.visualBody = new THREE.Group();
    this.mesh.add(this.visualBody);

    // Materiales del auto
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Cyan característico de Jahir
      roughness: 0.25,
      metalness: 0.75,
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Slate oscuro
      roughness: 0.5,
      metalness: 0.3,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.1,
      metalness: 0.9,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.1,
      metalness: 0.95,
    });

    const lightYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 0.9,
      roughness: 0.1,
    });

    const lightRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.9,
      roughness: 0.1,
    });

    // 1. Chasis Inferior
    const baseGeo = new THREE.BoxGeometry(1.6, 0.35, 3.2);
    const baseMesh = new THREE.Mesh(baseGeo, darkMat);
    baseMesh.position.y = 0.35;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.visualBody.add(baseMesh);

    // 2. Carrocería Principal
    const bodyGeo = new THREE.BoxGeometry(1.5, 0.45, 3.0);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.65;
    bodyMesh.castShadow = true;
    this.visualBody.add(bodyMesh);

    // 3. Cabina de Vidrio
    const cabinGeo = new THREE.BoxGeometry(1.25, 0.45, 1.6);
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
    cabinMesh.position.set(0, 1.05, -0.15);
    cabinMesh.castShadow = true;
    this.visualBody.add(cabinMesh);

    // 4. Techo
    const roofGeo = new THREE.BoxGeometry(1.28, 0.08, 1.5);
    const roofMesh = new THREE.Mesh(roofGeo, bodyMat);
    roofMesh.position.set(0, 1.3, -0.15);
    this.visualBody.add(roofMesh);

    // 5. Alerón Trasero Deportivo
    const spoilerWingGeo = new THREE.BoxGeometry(1.5, 0.06, 0.35);
    const spoilerWing = new THREE.Mesh(spoilerWingGeo, darkMat);
    spoilerWing.position.set(0, 1.25, -1.4);
    spoilerWing.castShadow = true;
    this.visualBody.add(spoilerWing);

    const spoilerStandL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.15), darkMat);
    spoilerStandL.position.set(-0.55, 1.0, -1.4);
    this.visualBody.add(spoilerStandL);

    const spoilerStandR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.15), darkMat);
    spoilerStandR.position.set(0.55, 1.0, -1.4);
    this.visualBody.add(spoilerStandR);

    // 6. Faros Delanteros con Luces Reales
    const headlightGeo = new THREE.BoxGeometry(0.28, 0.15, 0.08);
    const headlightL = new THREE.Mesh(headlightGeo, lightYellowMat);
    headlightL.position.set(-0.55, 0.65, 1.52);
    this.visualBody.add(headlightL);

    const headlightR = new THREE.Mesh(headlightGeo, lightYellowMat);
    headlightR.position.set(0.55, 0.65, 1.52);
    this.visualBody.add(headlightR);

    // Focos de luz proyectada sobre el asfalto (+Z es el frente del auto)
    this.spotlightL = new THREE.SpotLight(0xfffbeb, 2.5, 24, Math.PI / 6, 0.5, 1);
    this.spotlightL.position.set(-0.55, 0.65, 1.6);
    this.spotlightTargetL = new THREE.Object3D();
    this.spotlightTargetL.position.set(-0.55, 0, 12);
    this.visualBody.add(this.spotlightTargetL);
    this.spotlightL.target = this.spotlightTargetL;
    this.visualBody.add(this.spotlightL);

    this.spotlightR = new THREE.SpotLight(0xfffbeb, 2.5, 24, Math.PI / 6, 0.5, 1);
    this.spotlightR.position.set(0.55, 0.65, 1.6);
    this.spotlightTargetR = new THREE.Object3D();
    this.spotlightTargetR.position.set(0.55, 0, 12);
    this.visualBody.add(this.spotlightTargetR);
    this.spotlightR.target = this.spotlightTargetR;
    this.visualBody.add(this.spotlightR);

    // 7. Luces Traseras de Freno
    const taillightL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), lightRedMat);
    taillightL.position.set(-0.55, 0.65, -1.52);
    this.visualBody.add(taillightL);

    const taillightR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), lightRedMat);
    taillightR.position.set(0.55, 0.65, -1.52);
    this.visualBody.add(taillightR);

    // 8. Ruedas
    this.wheels = [];
    const wheelRadius = 0.38;
    const wheelWidth = 0.32;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.9,
    });

    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth + 0.02, 12);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelPositions = [
      { x: -0.88, y: wheelRadius, z: 1.05, isFront: true },
      { x: 0.88, y: wheelRadius, z: 1.05, isFront: true },
      { x: -0.88, y: wheelRadius, z: -1.05, isFront: false },
      { x: 0.88, y: wheelRadius, z: -1.05, isFront: false },
    ];

    wheelPositions.forEach((pos) => {
      const wheelHub = new THREE.Group();
      wheelHub.position.set(pos.x, pos.y, pos.z);

      const tireMesh = new THREE.Mesh(wheelGeo, tireMat);
      tireMesh.castShadow = true;
      wheelHub.add(tireMesh);

      const rimMesh = new THREE.Mesh(rimGeo, chromeMat);
      wheelHub.add(rimMesh);

      this.visualBody.add(wheelHub);
      this.wheels.push({
        hub: wheelHub,
        tire: tireMesh,
        isFront: pos.isFront,
      });
    });

    // 9. Tubos de escape
    this.exhausts = [
      new THREE.Vector3(-0.35, 0.32, -1.6),
      new THREE.Vector3(0.35, 0.32, -1.6)
    ];

    this.scene.add(this.mesh);
  }

  createPhysics() {
    // Caja física en Cannon.js
    const halfExtents = new CANNON.Vec3(0.85, 0.45, 1.55);
    const boxShape = new CANNON.Box(halfExtents);

    this.body = new CANNON.Body({
      mass: 160,
      shape: boxShape,
      position: new CANNON.Vec3(0, 0.45, 0),
      linearDamping: 0.05,
      angularDamping: 0.99,
    });

    // BLOQUEO TOTAL DE VUELCOS Y REBOTES VERTICALES:
    // El vehículo opera sobre el plano horizontal (X, Z).
    // Anulamos cualquier fuerza o impulso vertical en Cannon.js para que no salte ni penetre el suelo.
    this.body.linearFactor.set(1, 0, 1);
    this.body.angularFactor.set(0, 1, 0);

    this.body.material = new CANNON.Material('carMaterial');
    this.world.addBody(this.body);

    // Choques con físicas realistas: si choca contra una casa o estructura estática, se detiene
    this.isCollidingSolid = false;
    this.solidCooldown = 0;

    this.body.addEventListener('collide', (e) => {
      // Ignorar colisiones con el suelo plano
      if (e.body && (e.body.isGround || e.body.shape instanceof CANNON.Plane)) {
        return;
      }

      const relVelocity = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (relVelocity > 1.2) {
        sound.playImpact(relVelocity / 6);
      }

      // Comprobar si el impacto fue contra una superficie vertical (pared, casa, árbol, barrera)
      // En Cannon.js, si el contacto es vertical, contact.ni.y es cercano a 0
      const isVerticalSurface = Math.abs(e.contact.ni.y) < 0.65;
      const isSolidObstacle = (!e.body || e.body.type === CANNON.Body.STATIC || e.body.mass === 0) && isVerticalSurface;

      if (isSolidObstacle && (!e.body || !e.body.isRamp)) {
        this.isCollidingSolid = true;
        this.solidCooldown = 0.22;

        // Detener el auto en seco con micro-rebote realista
        if (this.speed > 0) {
          this.speed = -Math.min(this.speed * 0.2, 1.6);
        } else if (this.speed < 0) {
          this.speed = Math.min(-this.speed * 0.2, 1.6);
        }

        this.body.velocity.x = 0;
        this.body.velocity.z = 0;
        this.body.velocity.y = 0;
      }
    });
  }

  setupParticles() {
    const particleCount = 45;
    const geo = new THREE.DodecahedronGeometry(0.12, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.6,
    });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(geo, mat.clone());
      p.visible = false;
      this.scene.add(p);
      this.dustParticles.push({
        mesh: p,
        life: 0,
        maxLife: 0.6,
        vel: new THREE.Vector3()
      });
    }
  }

  emitDust(pos, size = 1.0) {
    const p = this.dustParticles.find(item => !item.mesh.visible);
    if (!p) return;

    p.mesh.position.copy(pos);
    p.mesh.scale.setScalar((Math.random() * 0.6 + 0.8) * size);
    p.mesh.visible = true;
    p.life = 0;
    p.maxLife = 0.45 + Math.random() * 0.2;
    p.mesh.material.opacity = 0.55;
    p.vel.set(
      (Math.random() - 0.5) * 0.8,
      Math.random() * 0.6 + 0.2,
      (Math.random() - 0.5) * 0.8
    );
  }

  update(delta, inputs) {
    const isAccelerating = inputs.up || inputs.down;
    const isBraking = inputs.space;

    // Control de Turbo / Boost
    if (this.isBoosting) {
      this.boostTimer -= delta;
      if (this.boostTimer <= 0) {
        this.isBoosting = false;
      }
    }

    const currentMaxSpeed = this.isBoosting ? this.maxSpeed * 1.5 : this.maxSpeed;

    // 1. Aceleración y Freno con colisión física sólida
    if (this.solidCooldown > 0) {
      this.solidCooldown -= delta;
      if (this.solidCooldown <= 0) this.isCollidingSolid = false;
    }

    if (inputs.down || inputs.left || inputs.right) {
      // Reversa o giro permite despegarse libremente de la pared u obstáculo
      this.isCollidingSolid = false;
    }

    if (inputs.down) {
      if (this.speed > 0) {
        this.speed -= this.braking * delta;
      } else {
        this.speed -= this.acceleration * 0.65 * delta;
        if (this.speed < -this.reverseMaxSpeed) this.speed = -this.reverseMaxSpeed;
      }
    } else if (inputs.up) {
      if (!this.isCollidingSolid) {
        this.speed += this.acceleration * delta * (this.isBoosting ? 1.6 : 1.0);
        if (this.speed > currentMaxSpeed) this.speed = currentMaxSpeed;
      } else {
        this.speed = 0;
      }
    } else {
      // Fricción natural
      this.speed *= Math.pow(this.drag, delta * 60);
      if (Math.abs(this.speed) < 0.1) this.speed = 0;
    }

    // Freno de mano / Derrape
    if (isBraking) {
      this.speed *= Math.pow(0.86, delta * 60);
      this.isDrifting = Math.abs(this.speed) > 4;
    } else {
      this.isDrifting = false;
    }

    // 2. Control de Dirección
    let targetSteer = 0;
    if (inputs.left) targetSteer = -this.maxSteeringAngle;
    if (inputs.right) targetSteer = this.maxSteeringAngle;

    this.steering = THREE.MathUtils.lerp(this.steering, targetSteer, this.steerSpeed * delta * 3);

    if (Math.abs(this.speed) > 0.2) {
      const speedRatio = Math.min(Math.abs(this.speed) / 12, 1.0);
      const directionFactor = this.speed >= 0 ? 1 : -1;
      const turnAmount = this.steering * speedRatio * directionFactor * (this.isDrifting ? 1.6 : 1.1) * delta * 2.8;
      this.heading -= turnAmount;
    }

    // 3. Físicas Cannon.js: Avance horizontal sobre carretera con curvas y elevaciones
    const sinH = Math.sin(this.heading);
    const cosH = Math.cos(this.heading);

    this.body.velocity.x = sinH * this.speed;
    this.body.velocity.z = cosH * this.speed;

    // Altura del suelo dinámicamente muestreada para la elevación del asfalto y pasto
    const carX = this.body.position.x;
    const carZ = this.body.position.z;
    const groundHeight = getDriveSurfaceHeight(carX, carZ);

    this.body.position.y = groundHeight + 0.45;
    this.body.velocity.y = 0;
    this.isAirborne = false;

    this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.heading);
    this.body.angularVelocity.set(0, 0, 0);

    // Posición sincronizada exactamente con la superficie del terreno y carretera
    this.mesh.position.x = carX;
    this.mesh.position.z = carZ;
    this.mesh.position.y = groundHeight + this.groundY; // 0.38m, ruedas al ras del asfalto/pasto

    // Calcular inclinación longitudinal (pitch) y transversal (roll) del terreno
    const frontZ = carZ + cosH * 1.2;
    const frontX = carX + sinH * 1.2;
    const rearZ = carZ - cosH * 1.2;
    const rearX = carX - sinH * 1.2;
    const frontY = getDriveSurfaceHeight(frontX, frontZ);
    const rearY = getDriveSurfaceHeight(rearX, rearZ);
    const slopePitch = -Math.atan2(frontY - rearY, 2.4);

    const rightZ = carZ - sinH * 0.8;
    const rightX = carX + cosH * 0.8;
    const leftZ = carZ + sinH * 0.8;
    const leftX = carX - cosH * 0.8;
    const rightY = getDriveSurfaceHeight(rightX, rightZ);
    const leftY = getDriveSurfaceHeight(leftX, leftZ);
    const slopeRoll = Math.atan2(rightY - leftY, 1.6);

    // Aplicar orientación horizontal y pendiente del terreno
    this.mesh.rotation.set(slopePitch, this.heading, slopeRoll, 'YXZ');

    // 4. Inclinación cosmética de suspensión (inercia al girar y acelerar/frenar)
    const targetRoll = -this.steering * (Math.abs(this.speed) / this.maxSpeed) * 0.14;
    const targetPitch = inputs.up ? 0.025 : (inputs.down && this.speed > 0 ? -0.045 : 0);

    this.visualBody.rotation.z = THREE.MathUtils.lerp(this.visualBody.rotation.z, targetRoll, 0.2);
    this.visualBody.rotation.x = THREE.MathUtils.lerp(this.visualBody.rotation.x, targetPitch, 0.2);

    // 5. Giro de ruedas
    const wheelSpinRate = (this.speed * delta * 5) / 0.38;
    this.wheels.forEach(w => {
      w.tire.rotation.x += wheelSpinRate;
      if (w.isFront) {
        w.hub.rotation.y = -this.steering;
      }
    });

    // 6. Partículas de escape
    if (Math.abs(this.speed) > 2) {
      if (inputs.up || this.isDrifting) {
        const leftExhaust = this.exhausts[0].clone().applyMatrix4(this.visualBody.matrixWorld);
        const rightExhaust = this.exhausts[1].clone().applyMatrix4(this.visualBody.matrixWorld);
        this.emitDust(leftExhaust, this.isDrifting ? 1.5 : 0.8);
        this.emitDust(rightExhaust, this.isDrifting ? 1.5 : 0.8);
      }
    }

    this.dustParticles.forEach(p => {
      if (p.mesh.visible) {
        p.life += delta;
        p.mesh.position.addScaledVector(p.vel, delta);
        p.mesh.scale.multiplyScalar(1 + delta * 0.8);
        p.mesh.material.opacity = (1 - p.life / p.maxLife) * 0.5;

        if (p.life >= p.maxLife) {
          p.mesh.visible = false;
        }
      }
    });

    // 7. Audio
    sound.updateEngine(this.speed, isAccelerating, this.isDrifting);
  }

  triggerTurbo() {
    this.isBoosting = true;
    this.boostTimer = 1.4;
    this.speed = Math.max(this.speed * 1.4, 26);
    sound.playTurbo();
  }

  resetPosition(targetPos = new THREE.Vector3(0, 0.45, -10), heading = 0) {
    const groundHeight = getDriveSurfaceHeight(targetPos.x, targetPos.z);
    this.body.position.set(targetPos.x, groundHeight + 0.45, targetPos.z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.heading = heading;
    this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), heading);
    this.speed = 0;
    this.steering = 0;
    this.mesh.position.set(targetPos.x, groundHeight + this.groundY, targetPos.z);
    this.mesh.rotation.set(0, heading, 0, 'YXZ');
    this.visualBody.rotation.set(0, 0, 0);
    this.isAirborne = false;
  }

  getPosition() {
    return this.mesh.position;
  }

  getSpeedKmH() {
    return Math.round(Math.abs(this.speed) * 3.6);
  }
}
