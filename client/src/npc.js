import * as THREE from 'three';
import { createHumanoid, animateHumanoid } from './player.js';

const NPC_COLORS = [
  { shirtColor: 0xc65a3a, pantsColor: 0x35322c },
  { shirtColor: 0x4a8f5c, pantsColor: 0x27292b },
  { shirtColor: 0xd7b23a, pantsColor: 0x2b2b34 },
  { shirtColor: 0x8b5fbf, pantsColor: 0x1e1e24 },
];

// Each NPC patrols between a small set of waypoints, pausing occasionally
// (walk -> stand -> walk...) to feel more alive than a static prop.
export function createNPCs(scene, count = 6) {
  const npcs = [];
  for (let i = 0; i < count; i++) {
    const colors = NPC_COLORS[i % NPC_COLORS.length];
    const humanoid = createHumanoid(colors);
    scene.add(humanoid);

    const baseX = (Math.random() - 0.5) * 30;
    const baseZ = (Math.random() - 0.5) * 40 + 5;
    const waypoints = [
      new THREE.Vector3(baseX, 0, baseZ),
      new THREE.Vector3(baseX + (Math.random() * 8 - 4), 0, baseZ + (Math.random() * 8 - 4)),
    ];

    humanoid.position.copy(waypoints[0]);

    npcs.push({
      humanoid,
      waypoints,
      targetIndex: 1,
      state: 'walk', // 'walk' | 'idle'
      stateTimer: Math.random() * 3,
      speed: 0.8 + Math.random() * 0.4,
    });
  }
  return npcs;
}

export function updateNPCs(npcs, dt) {
  npcs.forEach((npc) => {
    npc.stateTimer -= dt;

    if (npc.state === 'idle') {
      animateHumanoid(npc.humanoid, dt, Math.random() < 0.3 ? 'talk' : 'idle');
      if (npc.stateTimer <= 0) {
        npc.state = 'walk';
        npc.stateTimer = 4 + Math.random() * 4;
      }
      return;
    }

    // walking towards current target waypoint
    const target = npc.waypoints[npc.targetIndex];
    const dir = new THREE.Vector3().subVectors(target, npc.humanoid.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 0.15 || npc.stateTimer <= 0) {
      npc.targetIndex = (npc.targetIndex + 1) % npc.waypoints.length;
      npc.state = 'idle';
      npc.stateTimer = 2 + Math.random() * 3;
      animateHumanoid(npc.humanoid, dt, 'idle');
      return;
    }

    dir.normalize();
    npc.humanoid.position.addScaledVector(dir, npc.speed * dt);
    npc.humanoid.rotation.y = Math.atan2(dir.x, dir.z);
    animateHumanoid(npc.humanoid, dt, 'walk');
  });
}
