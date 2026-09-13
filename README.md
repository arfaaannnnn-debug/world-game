# My World — 3D Open-World Multiplayer Kerala Town (MVP)

A playable 3D open-world multiplayer game that runs in the browser: Three.js on the
client, Node.js + Express + Socket.IO on the server.

This is a **working MVP**. The humanoid characters, tea shop, NPCs and vehicles are
built from primitive 3D shapes (boxes/spheres/cylinders) rather than downloaded
model files, so the whole thing runs immediately with no external assets — see
"Adding custom GLB/GLTF human models" below to upgrade the visuals later.

## What's included (MVP checklist)

- [x] 3D open-world map (roads, footpaths, houses, restaurant, bus stop, pond, trees, coconut trees, street lights)
- [x] Humanoid player character (head/hair/torso/arms/hands/legs/shoes — not a cube or capsule)
- [x] WASD movement + Shift to run + Space to jump
- [x] Third-person camera (drag mouse to look around, scroll to zoom)
- [x] AABB collision against buildings, trees, lamp posts, vehicles, tea shop, bus stop
- [x] Tea shop ("Chaya Kada") you can walk up to and open a menu with E
- [x] Wandering human NPCs with simple walk/idle/talk AI
- [x] Decorative vehicles (car, auto-rickshaw, bus) with the auto slowly patrolling
- [x] Real-time multiplayer via Socket.IO: see other players walk around live
- [x] Username floating above every player
- [x] Global chat + private 1:1 chat
- [x] Player list, proximity "press E" interact menu, and a profile modal (message / add friend / block)
- [x] Minimap with player + tea shop markers
- [x] Day/night cycle (sunrise → day → sunset → night, street + tea shop lights turn on at night)
- [x] Game HUD (username, online count, controls hint, minimap, chat/players/friends/settings buttons)
- [x] Start menu, How to Play, About, and a login (username) screen
- [x] Settings panel (graphics, shadows, sensitivity, volume) saved to localStorage
- [x] Basic server-side validation (username/message sanitizing, length limits, simple rate limiting)

Friend requests, blocking, and vehicle driving are stubbed on the client for now
(they show confirmation UI but don't persist to the server) — see "Next steps" below.

## Project structure

```text
open-world-game/
├── client/
│   ├── index.html
│   ├── src/
│   │   ├── main.js          # scene setup, game loop, movement, camera, day/night
│   │   ├── player.js        # humanoid builder + procedural animation + name tags
│   │   ├── world.js         # town: roads, buildings, tea shop, trees, lights
│   │   ├── npc.js           # wandering NPC humans
│   │   ├── vehicles.js      # car / auto-rickshaw / bus
│   │   ├── multiplayer.js   # Socket.IO client wrapper
│   │   ├── chat.js          # global + private chat UI logic
│   │   ├── ui.js            # menus, HUD, minimap, panels, modals
│   │   └── styles.css
│   └── assets/              # put your own models/textures/sounds here later
├── server/
│   └── server.js            # Express static server + Socket.IO multiplayer + chat
├── package.json
└── README.md
```

## 1. Install

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
cd open-world-game
npm install
```

## 2. Run the server

```bash
npm run dev
```

You should see:

```text
Open World Game server running at http://localhost:3000
```

## 3. Open the game

Open your browser to:

```text
http://localhost:3000
```

Click **PLAY GAME**, enter a username, click **ENTER WORLD**.

## 4. Test multiplayer with two browser windows

1. Keep the server running.
2. Open `http://localhost:3000` in one browser window, enter as "Rahul".
3. Open a **second** window (or an incognito/private window, or a different
   browser) to the same address, enter as "Anu".
4. Walk one character near the other — you should see:
   - Both characters visible and moving live in both windows.
   - Usernames floating above each character.
   - Online count in the top-right HUD updating.
   - Opening **PLAYERS** panel shows the other username; clicking it opens a profile
     with a **SEND MESSAGE** option.
   - Walking close to the other player shows "Press E to interact" → **Message**
     opens a private chat that delivers instantly.
   - Opening **CHAT** and sending a message shows up for both windows immediately.
5. Close one window — the other window should see that player disappear and the
   online count drop.

## Controls

| Key | Action |
|---|---|
| W / A / S / D | Move |
| Shift | Run |
| Space | Jump |
| Mouse drag | Look around (third-person camera) |
| Mouse wheel | Zoom camera |
| E | Interact (tea shop / nearby player) |
| Esc | Toggle settings panel |

## Adding custom GLB/GLTF human models

Right now `player.js` builds the human character out of primitive shapes so the
game works with zero external assets. To upgrade to a real rigged model:

1. Get a humanoid `.glb` file (e.g. from Mixamo, Sketchfab, or your own export)
   and place it at `client/assets/models/player.glb`.
2. In `client/src/main.js`, import the GLTF loader:
   ```js
   import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
   ```
3. Replace the `createHumanoid(...)` call for the local/remote player with a loader
   call, e.g.:
   ```js
   const loader = new GLTFLoader();
   loader.load('/assets/models/player.glb', (gltf) => {
     this.player = gltf.scene;
     this.scene.add(this.player);
   });
   ```
4. If the model has animation clips (idle/walk/run/jump), use `THREE.AnimationMixer`
   instead of the procedural `animateHumanoid()` function, and swap actions based
   on the same `anim` string ('idle' | 'walk' | 'run' | 'jump' | 'sit' | 'talk')
   that's already being sent over the network in `multiplayer.js`.
5. Do the same for NPCs (`npc.js`) and remote players (`addRemotePlayer` in
   `main.js`) once you're happy with the local player model.

The multiplayer protocol doesn't care what the character looks like — it only
syncs position, rotation and an animation-state string, so this swap is entirely
client-side.

## Deploying online

1. Push this project to a Git repository.
2. Deploy the **whole project** (not just `client/`) to a Node-friendly host that
   supports WebSockets, e.g. Render, Railway, Fly.io, or a VPS:
   - Build command: `npm install`
   - Start command: `npm start`
   - The server already serves the client via `express.static`, so one deployment
     covers both.
3. Set the `PORT` environment variable if your host requires a specific port
   (the server already reads `process.env.PORT`).
4. Socket.IO works over the same HTTP(S) port automatically — no extra
   configuration needed for a single-server deployment.
5. For production, consider adding HTTPS (most hosts provide this automatically)
   and, if you expect more than one server instance, a Socket.IO adapter such as
   `@socket.io/redis-adapter` so multiplayer state is shared across instances.

## Next steps beyond the MVP

- Persist friends/blocks server-side (currently just a client-side confirmation).
- Make vehicles fully drivable (enter/exit, WASD control while inside).
- Swap primitive humanoids for real rigged GLB models with proper animation clips (see above).
- Add footstep/ambient/UI sound effects (section 19 of the original spec) using
  your own royalty-free audio files in `client/assets/sounds/`.
- Add Level of Detail (LOD) and instanced meshes for trees/lamps once the town grows.
- Add authentication so usernames aren't just a per-session claim.
