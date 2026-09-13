import * as THREE from 'three';

// MVP vehicles are simple low-poly stand-ins built from primitives.
// They are decorative/static for now (see project spec section 17) —
// `updateVehicles` already moves the auto-rickshaw slowly back and forth
// as a starting point for making the rest fully drivable later.
export function createVehicles(scene, obstacles) {
  const vehicles = [];

  vehicles.push(buildCar(scene, obstacles, -9, -15, 0xb23a3a));
  vehicles.push(buildCar(scene, obstacles, 9, 5, 0x3a6db2));
  vehicles.push(buildAutoRickshaw(scene, obstacles, -9, 35));
  vehicles.push(buildBus(scene, obstacles, 0, -70));

  return vehicles;
}

function buildCar(scene, obstacles, x, z, color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.6, 3.4),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 })
  );
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.5, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 })
  );
  cabin.position.set(0, 1.05, -0.2);
  group.add(cabin);

  addWheels(group, 1.7, 3.0);

  group.position.set(x, 0, z);
  group.rotation.y = Math.PI / 2;
  scene.add(group);
  obstacles.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 0.6, z), new THREE.Vector3(3.4, 1.2, 1.8)));
  return { group, type: 'car' };
}

function buildAutoRickshaw(scene, obstacles, x, z) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.4, 2),
    new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.6 })
  );
  body.position.y = 0.9;
  body.castShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.1, 12, 1, false, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x1c1c1c })
  );
  roof.rotation.z = Math.PI / 2;
  roof.position.set(0, 1.65, 0);
  group.add(roof);

  addWheels(group, 1.0, 1.6, 3);

  group.position.set(x, 0, z);
  scene.add(group);
  obstacles.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 0.9, z), new THREE.Vector3(1.2, 1.8, 2)));
  return { group, type: 'auto', basePos: new THREE.Vector3(x, 0, z), t: Math.random() * Math.PI * 2 };
}

function buildBus(scene, obstacles, x, z) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x3f8f5c, roughness: 0.5 })
  );
  body.position.y = 1.3;
  body.castShadow = true;
  group.add(body);

  addWheels(group, 2.2, 6, 4);

  group.position.set(x, 0, z);
  group.rotation.y = Math.PI / 2;
  scene.add(group);
  obstacles.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 1.3, z), new THREE.Vector3(8, 2.6, 2.4)));
  return { group, type: 'bus' };
}

function addWheels(group, trackWidth, wheelBase, count = 4) {
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.25, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const positions = count === 3
    ? [[-trackWidth / 2, wheelBase / 2], [trackWidth / 2, wheelBase / 2], [0, -wheelBase / 2]]
    : [[-trackWidth / 2, wheelBase / 2], [trackWidth / 2, wheelBase / 2], [-trackWidth / 2, -wheelBase / 2], [trackWidth / 2, -wheelBase / 2]];

  positions.forEach(([x, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.3, z);
    wheel.castShadow = true;
    group.add(wheel);
  });
}

// Lets the auto-rickshaw putter back and forth a little; everything else stays static for MVP.
export function updateVehicles(vehicles, dt) {
  vehicles.forEach((v) => {
    if (v.type === 'auto') {
      v.t += dt * 0.4;
      v.group.position.x = v.basePos.x + Math.sin(v.t) * 4;
      v.group.rotation.y = Math.sin(v.t) > 0 ? 0 : Math.PI;
    }
  });
}
