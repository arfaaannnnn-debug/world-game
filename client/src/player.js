import * as THREE from 'three';

// Builds a simple but clearly-human character out of primitives:
// head, hair, torso, arms, hands, legs, shoes. Not a cube, not a capsule.
// This is a placeholder humanoid — swap `characterGroup` for a loaded
// GLTF/GLB model later (see README "Adding custom GLB/GLTF human models").
export function createHumanoid({ shirtColor = 0x3f7ec7, pantsColor = 0x2b2b34, skinColor = 0xd8a879, hairColor = 0x2a1e17 } = {}) {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.6 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.28), shirtMat);
  torso.position.y = 1.1;
  torso.castShadow = true;
  root.add(torso);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), skinMat);
  head.position.y = 1.62;
  head.castShadow = true;
  root.add(head);

  // Hair
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.8), hairMat);
  hair.position.y = 1.68;
  root.add(hair);

  // Face detail (simple nose bump so it doesn't look like a plain ball)
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), skinMat);
  nose.position.set(0, 1.6, 0.21);
  root.add(nose);

  // Arms (pivoted groups so they can swing)
  const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
  const handGeo = new THREE.SphereGeometry(0.08, 8, 8);

  function makeArm(sign) {
    const armPivot = new THREE.Group();
    armPivot.position.set(sign * 0.32, 1.4, 0);
    const arm = new THREE.Mesh(armGeo, shirtMat);
    arm.position.y = -0.27;
    arm.castShadow = true;
    armPivot.add(arm);
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.y = -0.58;
    armPivot.add(hand);
    return armPivot;
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  root.add(leftArm, rightArm);

  // Legs (pivoted groups so they can swing)
  const legGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
  const shoeGeo = new THREE.BoxGeometry(0.2, 0.12, 0.28);

  function makeLeg(sign) {
    const legPivot = new THREE.Group();
    legPivot.position.set(sign * 0.13, 0.78, 0);
    const leg = new THREE.Mesh(legGeo, pantsMat);
    leg.position.y = -0.3;
    leg.castShadow = true;
    legPivot.add(leg);
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(0, -0.62, 0.05);
    shoe.castShadow = true;
    legPivot.add(shoe);
    return legPivot;
  }
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  root.add(leftLeg, rightLeg);

  root.userData.parts = { head, torso, leftArm, rightArm, leftLeg, rightLeg };
  root.userData.animPhase = Math.random() * Math.PI * 2;
  root.userData.currentAnim = 'idle';

  return root;
}

// Advances a humanoid's procedural animation. speedFactor ~0 idle, ~1 walk, ~1.8 run
export function animateHumanoid(humanoid, dt, anim) {
  const { leftArm, rightArm, leftLeg, rightLeg, torso, head } = humanoid.userData.parts;
  humanoid.userData.animPhase += dt * (anim === 'run' ? 10 : anim === 'walk' ? 6 : 2);
  const phase = humanoid.userData.animPhase;

  if (anim === 'walk' || anim === 'run') {
    const amp = anim === 'run' ? 0.9 : 0.55;
    leftArm.rotation.x = Math.sin(phase) * amp;
    rightArm.rotation.x = -Math.sin(phase) * amp;
    leftLeg.rotation.x = -Math.sin(phase) * amp;
    rightLeg.rotation.x = Math.sin(phase) * amp;
    torso.position.y = 1.1 + Math.abs(Math.sin(phase * 2)) * 0.02;
    head.position.y = 1.62 + Math.abs(Math.sin(phase * 2)) * 0.02;
  } else if (anim === 'jump') {
    leftArm.rotation.x = -0.6;
    rightArm.rotation.x = -0.6;
    leftLeg.rotation.x = 0.3;
    rightLeg.rotation.x = 0.3;
  } else if (anim === 'sit') {
    leftLeg.rotation.x = -Math.PI / 2;
    rightLeg.rotation.x = -Math.PI / 2;
    leftArm.rotation.x = 0;
    rightArm.rotation.x = 0;
  } else if (anim === 'talk') {
    rightArm.rotation.x = -0.4 + Math.sin(phase * 3) * 0.15;
    leftArm.rotation.x = 0;
    leftLeg.rotation.x = 0;
    rightLeg.rotation.x = 0;
  } else {
    // idle: gentle breathing bob
    const idle = Math.sin(phase) * 0.03;
    torso.position.y = 1.1 + idle;
    head.position.y = 1.62 + idle;
    leftArm.rotation.x = idle * 0.5;
    rightArm.rotation.x = -idle * 0.5;
    leftLeg.rotation.x = 0;
    rightLeg.rotation.x = 0;
  }
}

// Simple floating username label using a canvas sprite
export function createNameLabel(username) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 32px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 8, 8, 240, 48, 12);
  ctx.fill();
  ctx.fillStyle = '#ffb547';
  ctx.fillText(username.slice(0, 16), 128, 40);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.4, 0.35, 1);
  sprite.position.y = 2.1;
  sprite.renderOrder = 999;
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
