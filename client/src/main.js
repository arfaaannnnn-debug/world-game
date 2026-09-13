import * as THREE from 'three';
import { buildWorld } from './world.js';
import { createHumanoid, animateHumanoid, createNameLabel } from './player.js';
import { createNPCs, updateNPCs } from './npc.js';
import { createVehicles, updateVehicles } from './vehicles.js';
import { createMultiplayerClient } from './multiplayer.js';
import { setupChat } from './chat.js';
import {
  setupMenus, setupHUD, setupPlayersPanel, setupProfileAndInteract,
  setupTeaShop, setupSettings, setupMinimap,
} from './ui.js';

// ---------------------------------------------------------------
// Bootstrapping: show menus first, only build the 3D world once
// the player has entered a username and pressed "Enter World".
// ---------------------------------------------------------------
const menus = setupMenus({ onPlay: startGame });

function startGame(username) {
  document.getElementById('game-container').classList.remove('hidden');
  const game = new Game(username);
  game.init();
}

// =================================================================
// Game class — everything below runs only after the player enters
// =================================================================
class Game {
  constructor(username) {
    this.username = username;
    this.remotePlayers = new Map(); // id -> { mesh, label, target: {x,y,z,ry}, anim }
    this.keys = {};
    this.velocityY = 0;
    this.onGround = true;
    this.yaw = Math.PI; // camera yaw
    this.pitch = 0.35;
    this.cameraDistance = 6;
    this.dragging = false;
    this.lastMoveSent = 0;
    this.nearTeaShop = false;
    this.nearPlayer = null;
    this.dayTime = 8; // hours, 0-24, starts at 8am
    this.clock = new THREE.Clock();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupLocalPlayer();
    this.setupControls();
    this.setupUI();
    this.setupNetworking();
    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  // ---------------- Renderer / Scene ----------------
  setupRenderer() {
    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8fc7e8);
    this.scene.fog = new THREE.Fog(0x8fc7e8, 60, 220);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);

    // Lighting
    this.ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xffffff, 1.1);
    this.sun.position.set(30, 40, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -60;
    this.sun.shadow.camera.right = 60;
    this.sun.shadow.camera.top = 60;
    this.sun.shadow.camera.bottom = -60;
    this.sun.shadow.camera.far = 150;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // World
    const worldData = buildWorld(this.scene);
    this.obstacles = worldData.obstacles;
    this.teaShopPos = worldData.teaShopPos;
    this.streetLights = worldData.streetLights;

    // NPCs + vehicles
    this.npcs = createNPCs(this.scene, 6);
    this.vehicles = createVehicles(this.scene, this.obstacles);
  }

  setupLocalPlayer() {
    this.player = createHumanoid({ shirtColor: 0x3f7ec7 });
    this.player.position.set(0, 0, 30);
    this.scene.add(this.player);
    this.playerPos = this.player.position;
  }

  // ---------------- Input ----------------
  setupControls() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE') this.handleInteract();
      if (e.code === 'Escape') this.toggleEscMenu();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', () => { this.dragging = true; });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      const sensitivity = (this.settings ? this.settings.sensitivity : 5) / 1000;
      this.yaw -= e.movementX * sensitivity * 5;
      this.pitch = Math.max(0.08, Math.min(1.2, this.pitch - e.movementY * sensitivity * 5));
    });
    canvas.addEventListener('wheel', (e) => {
      this.cameraDistance = Math.max(3, Math.min(14, this.cameraDistance + e.deltaY * 0.01));
    });
  }

  toggleEscMenu() {
    const settingsPanel = document.getElementById('settings-panel');
    settingsPanel.classList.toggle('hidden');
  }

  // ---------------- UI wiring ----------------
  setupUI() {
    this.hud = setupHUD(this.username);
    this.settings = setupSettings();

    this.teaShopUI = setupTeaShop();
    this.minimap = setupMinimap(120);

    this.profileUI = setupProfileAndInteract({
      onMessage: (target) => this.chatUI.openPrivateChat(target.id),
    });

    this.playersPanel = setupPlayersPanel({
      onSelectPlayer: (p) => this.profileUI.openProfile(p),
    });
  }

  // ---------------- Networking ----------------
  setupNetworking() {
    this.mp = createMultiplayerClient({
      onInit: (data) => {
        this.myId = data.id;
        data.players.forEach((p) => this.addRemotePlayer(p));
        this.updatePlayerListPanel();
      },
      onPlayerJoined: (p) => {
        this.addRemotePlayer(p);
        this.updatePlayerListPanel();
      },
      onPlayerMoved: (p) => {
        const rp = this.remotePlayers.get(p.id);
        if (rp) {
          rp.target = { x: p.x, y: p.y, z: p.z, ry: p.ry };
          rp.anim = p.anim;
        }
      },
      onPlayerLeft: (p) => {
        this.removeRemotePlayer(p.id);
        this.updatePlayerListPanel();
      },
      onPlayerList: (list) => {
        this.playerListRaw = list.filter((p) => p.id !== this.myId);
        this.updatePlayerListPanel();
      },
      onOnlineCount: (n) => this.hud.setOnlineCount(n),
      onGlobalChat: (msg) => this.chatUI && this.chatUI.onGlobalChat(msg),
      onPrivateMessage: (msg) => this.chatUI && this.chatUI.onPrivateMessage(msg),
      onPrivateMessageSent: (msg) => this.chatUI && this.chatUI.onPrivateMessageSent(msg),
      onJoinError: (err) => menus.showLoginError(err.message),
    });

    this.chatUI = setupChat(this.mp, this.username, (id) => {
      const rp = this.remotePlayers.get(id);
      return rp ? rp.username : null;
    });

    this.mp.join(this.username);
  }

  updatePlayerListPanel() {
    if (!this.playerListRaw) return;
    this.playersPanel.render(this.playerListRaw);
  }

  addRemotePlayer(p) {
    if (this.remotePlayers.has(p.id)) return;
    const mesh = createHumanoid({ shirtColor: 0xc65a3a });
    mesh.position.set(p.x, p.y, p.z);
    const label = createNameLabel(p.username);
    mesh.add(label);
    this.scene.add(mesh);
    this.remotePlayers.set(p.id, {
      id: p.id,
      username: p.username,
      mesh,
      target: { x: p.x, y: p.y, z: p.z, ry: p.ry },
      anim: p.anim || 'idle',
    });
  }

  removeRemotePlayer(id) {
    const rp = this.remotePlayers.get(id);
    if (rp) {
      this.scene.remove(rp.mesh);
      this.remotePlayers.delete(id);
    }
  }

  // ---------------- Interaction ----------------
  handleInteract() {
    if (this.nearTeaShop) {
      if (this.teaShopUI.isOpen()) this.teaShopUI.close();
      else this.teaShopUI.open();
      return;
    }
    if (this.nearPlayer) {
      this.profileUI.openInteractMenu(this.nearPlayer);
    }
  }

  updateInteractionPrompt() {
    const prompt = document.getElementById('interact-prompt');
    const distToShop = this.playerPos.distanceTo(new THREE.Vector3(this.teaShopPos.x, 0, this.teaShopPos.z));
    this.nearTeaShop = distToShop < 6;

    this.nearPlayer = null;
    let minDist = 3.5;
    this.remotePlayers.forEach((rp) => {
      const d = this.playerPos.distanceTo(rp.mesh.position);
      if (d < minDist) {
        minDist = d;
        this.nearPlayer = { id: rp.id, username: rp.username };
      }
    });

    if (this.nearTeaShop || this.nearPlayer) {
      prompt.classList.remove('hidden');
    } else {
      prompt.classList.add('hidden');
    }
  }

  // ---------------- Movement + collision ----------------
  updateMovement(dt) {
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.sin(this.yaw + Math.PI / 2), 0, Math.cos(this.yaw + Math.PI / 2));

    let move = new THREE.Vector3();
    if (this.keys['KeyW']) move.add(forward);
    if (this.keys['KeyS']) move.sub(forward);
    if (this.keys['KeyD']) move.add(right);
    if (this.keys['KeyA']) move.sub(right);

    const running = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'];
    let anim = 'idle';

    if (move.lengthSq() > 0) {
      move.normalize();
      const speed = running ? 6.5 : 3.2;
      const delta = move.clone().multiplyScalar(speed * dt);

      // simple per-axis AABB collision resolution
      this.tryMove(delta.x, 0, 0);
      this.tryMove(0, 0, delta.z);

      this.player.rotation.y = Math.atan2(move.x, move.z);
      anim = running ? 'run' : 'walk';
    }

    // jump / gravity
    if (this.keys['Space'] && this.onGround) {
      this.velocityY = 5.2;
      this.onGround = false;
    }
    this.velocityY -= 14 * dt;
    this.playerPos.y += this.velocityY * dt;
    if (this.playerPos.y <= 0) {
      this.playerPos.y = 0;
      this.velocityY = 0;
      this.onGround = true;
    } else {
      anim = 'jump';
    }

    animateHumanoid(this.player, dt, anim);
    this.currentAnim = anim;

    // throttled network updates (~15 times/sec, only while something changed)
    const now = performance.now();
    if (now - this.lastMoveSent > 66) {
      this.lastMoveSent = now;
      this.mp.sendMove(this.playerPos.x, this.playerPos.y, this.playerPos.z, this.player.rotation.y, anim);
    }
  }

  tryMove(dx, dy, dz) {
    const nextPos = this.playerPos.clone().add(new THREE.Vector3(dx, dy, dz));
    const halfSize = new THREE.Vector3(0.35, 1, 0.35);
    const nextBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(nextPos.x, 1, nextPos.z), halfSize.clone().multiplyScalar(2)
    );
    for (const box of this.obstacles) {
      if (nextBox.intersectsBox(box)) return; // blocked, cancel this move
    }
    // keep player within world bounds
    if (Math.abs(nextPos.x) > 150 || Math.abs(nextPos.z) > 150) return;
    this.playerPos.x = nextPos.x;
    this.playerPos.z = nextPos.z;
  }

  // ---------------- Camera ----------------
  updateCamera() {
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    ).multiplyScalar(this.cameraDistance);

    const desired = this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0)).sub(offset);
    this.camera.position.lerp(desired, 0.18);
    this.camera.lookAt(this.playerPos.clone().add(new THREE.Vector3(0, 1.3, 0)));
  }

  // ---------------- Remote players ----------------
  updateRemotePlayers(dt) {
    this.remotePlayers.forEach((rp) => {
      rp.mesh.position.lerp(new THREE.Vector3(rp.target.x, rp.target.y, rp.target.z), 0.25);
      rp.mesh.rotation.y += (rp.target.ry - rp.mesh.rotation.y) * 0.25;
      animateHumanoid(rp.mesh, dt, rp.anim || 'idle');
    });
  }

  // ---------------- Day / night ----------------
  updateDayNight(dt) {
    this.dayTime = (this.dayTime + dt * 0.05) % 24; // ~8 minute full cycle
    const t = this.dayTime;

    // sun angle: rises at 6, sets at 18
    const sunAngle = ((t - 6) / 12) * Math.PI; // 0..PI across daytime
    const isDay = t > 6 && t < 18;
    const sunHeight = Math.max(0.02, Math.sin(sunAngle));

    this.sun.position.set(Math.cos(sunAngle) * 60, sunHeight * 60 + 5, 30);
    this.sun.target.position.copy(this.playerPos);

    let skyColor, ambientIntensity, sunIntensity, fogColor;
    if (t > 5.5 && t < 7.5) { // sunrise
      skyColor = new THREE.Color(0xffb37a); ambientIntensity = 0.5; sunIntensity = 0.8;
    } else if (t >= 7.5 && t < 17) { // day
      skyColor = new THREE.Color(0x8fc7e8); ambientIntensity = 0.65; sunIntensity = 1.1;
    } else if (t >= 17 && t < 19) { // sunset
      skyColor = new THREE.Color(0xd9713f); ambientIntensity = 0.4; sunIntensity = 0.6;
    } else { // night
      skyColor = new THREE.Color(0x0b1230); ambientIntensity = 0.15; sunIntensity = 0.05;
    }
    fogColor = skyColor;

    this.scene.background = skyColor;
    this.scene.fog.color = fogColor;
    this.ambient.intensity = ambientIntensity;
    this.sun.intensity = sunIntensity;

    const nightOn = !isDay;
    const lampIntensity = nightOn ? 1 : 0;
    this.streetLights.forEach(({ light, bulb }) => {
      light.intensity = lampIntensity;
      bulb.material.emissive = new THREE.Color(nightOn ? 0xfff3c4 : 0x000000);
      bulb.material.emissiveIntensity = nightOn ? 1 : 0;
    });
  }

  // ---------------- Main loop ----------------
  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.1);

    this.updateMovement(dt);
    this.updateCamera();
    this.updateRemotePlayers(dt);
    updateNPCs(this.npcs, dt);
    updateVehicles(this.vehicles, dt);
    this.updateDayNight(dt);
    this.updateInteractionPrompt();
    this.minimap.render({ x: this.playerPos.x, z: this.playerPos.z }, Array.from(this.remotePlayers.values()), this.teaShopPos);

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
