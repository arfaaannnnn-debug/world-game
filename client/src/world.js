import * as THREE from 'three';

// Simple color palette to keep the town feeling warm and Kerala-ish
const COLORS = {
  ground: 0x6b8f4e,
  road: 0x3a3a3d,
  footpath: 0x9c9484,
  wallLight: 0xe8dcc0,
  wallTerracotta: 0xb5654a,
  roofRed: 0x8a3b2b,
  roofBrown: 0x5c3d2e,
  teaShopWall: 0xdcae5b,
  teaShopRoof: 0x7a3324,
  trunk: 0x6b4a2b,
  leaves: 0x2f6e3a,
  coconutTrunk: 0x8a7355,
  water: 0x2f6f8f,
};

export function buildWorld(scene) {
  const obstacles = []; // array of THREE.Box3 for simple AABB collision
  const group = new THREE.Group();
  scene.add(group);

  // ---------- Ground ----------
  const groundGeo = new THREE.PlaneGeometry(400, 400, 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // ---------- Roads (simple cross layout) ----------
  const roadMat = new THREE.MeshStandardMaterial({ color: COLORS.road, roughness: 0.9 });
  const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(10, 300), roadMat);
  mainRoad.rotation.x = -Math.PI / 2;
  mainRoad.position.set(0, 0.01, 0);
  mainRoad.receiveShadow = true;
  group.add(mainRoad);

  const crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(300, 10), roadMat);
  crossRoad.rotation.x = -Math.PI / 2;
  crossRoad.position.set(0, 0.01, 20);
  crossRoad.receiveShadow = true;
  group.add(crossRoad);

  // Footpaths along the main road
  const footpathMat = new THREE.MeshStandardMaterial({ color: COLORS.footpath, roughness: 1 });
  [-1, 1].forEach((side) => {
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(3, 300), footpathMat);
    fp.rotation.x = -Math.PI / 2;
    fp.position.set(side * 7, 0.015, 0);
    fp.receiveShadow = true;
    group.add(fp);
  });

  // ---------- Helper: box building ----------
  function addBuilding(x, z, w, h, d, wallColor, roofColor, rotationY = 0) {
    const bGroup = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wall.position.y = h / 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    bGroup.add(wall);

    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.75, h * 0.5, 4), roofMat);
    roof.position.y = h + (h * 0.25);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    bGroup.add(roof);

    bGroup.position.set(x, 0, z);
    bGroup.rotation.y = rotationY;
    group.add(bGroup);

    // register collision box (approx, ignoring rotation for simplicity on axis-aligned buildings)
    const box = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, h / 2, z),
      new THREE.Vector3(w, h, d)
    );
    obstacles.push(box);
    return bGroup;
  }

  // A little row of houses and shops along the main road
  addBuilding(-16, -40, 10, 6, 10, COLORS.wallLight, COLORS.roofRed);
  addBuilding(-16, -20, 8, 5, 8, COLORS.wallTerracotta, COLORS.roofBrown);
  addBuilding(16, -50, 9, 6, 9, COLORS.wallLight, COLORS.roofBrown);
  addBuilding(16, -30, 8, 5, 8, COLORS.wallTerracotta, COLORS.roofRed);
  addBuilding(-16, 45, 10, 7, 10, COLORS.wallLight, COLORS.roofRed);
  addBuilding(16, 55, 9, 6, 9, COLORS.wallTerracotta, COLORS.roofBrown);

  // ---------- Tea Shop ----------
  const teaShopPos = new THREE.Vector3(14, 0, 10);
  buildTeaShop(group, obstacles, teaShopPos);

  // ---------- Bus stop ----------
  buildBusStop(group, obstacles, new THREE.Vector3(-14, 0, 20));

  // ---------- Trees + coconut trees ----------
  const treePositions = [
    [-25, -10], [-25, 10], [25, -20], [25, 25], [-30, 40], [30, -45],
    [-8, -60], [8, 65], [-22, 70], [22, -70],
  ];
  treePositions.forEach(([x, z], i) => {
    if (i % 2 === 0) addTree(group, obstacles, x, z);
    else addCoconutTree(group, obstacles, x, z);
  });

  // ---------- Street lights ----------
  const lampPositions = [[-7, -30], [7, -30], [-7, 0], [7, 0], [-7, 30], [7, 30]];
  const streetLights = [];
  lampPositions.forEach(([x, z]) => {
    streetLights.push(addStreetLight(group, obstacles, x, z));
  });

  // ---------- Small restaurant ----------
  addBuilding(-16, 0, 9, 5, 9, 0xd8c9a3, 0x6b3a2a);

  // ---------- Decorative pond ----------
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(6, 24),
    new THREE.MeshStandardMaterial({ color: COLORS.water, roughness: 0.2, metalness: 0.3 })
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(28, 0.02, 45);
  group.add(pond);

  return { group, obstacles, teaShopPos, streetLights };
}

function addTree(group, obstacles, x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 3, 8),
    new THREE.MeshStandardMaterial({ color: COLORS.trunk, roughness: 1 })
  );
  trunk.position.set(x, 1.5, z);
  trunk.castShadow = true;
  group.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 8, 8),
    new THREE.MeshStandardMaterial({ color: COLORS.leaves, roughness: 1 })
  );
  leaves.position.set(x, 4, z);
  leaves.castShadow = true;
  group.add(leaves);

  obstacles.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 1.5, z), new THREE.Vector3(1, 3, 1)));
}

function addCoconutTree(group, obstacles, x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.35, 7, 8),
    new THREE.MeshStandardMaterial({ color: COLORS.coconutTrunk, roughness: 1 })
  );
  trunk.position.set(x, 3.5, z);
  trunk.rotation.z = 0.08;
  trunk.castShadow = true;
  group.add(trunk);

  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 3, 4),
      new THREE.MeshStandardMaterial({ color: COLORS.leaves, roughness: 1 })
    );
    frond.position.set(x, 7, z);
    frond.rotation.z = Math.PI / 2.3;
    frond.rotation.y = (i / 6) * Math.PI * 2;
    frond.castShadow = true;
    group.add(frond);
  }

  obstacles.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 3.5, z), new THREE.Vector3(0.8, 7, 0.8)));
}

function addStreetLight(group, obstacles, x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  pole.position.set(x, 2, z);
  pole.castShadow = true;
  group.add(pole);

  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0x000000 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), bulbMat);
  bulb.position.set(x, 4.1, z);
  group.add(bulb);

  const light = new THREE.PointLight(0xffdca8, 0, 10, 2);
  light.position.set(x, 4.1, z);
  group.add(light);

  obstacles.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 2, z), new THREE.Vector3(0.3, 4, 0.3)));

  return { bulb, light };
}

function buildTeaShop(group, obstacles, pos) {
  const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.teaShopWall, roughness: 0.85 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 6), wallMat);
  wall.position.set(pos.x, 2, pos.z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.4, 7),
    new THREE.MeshStandardMaterial({ color: COLORS.teaShopRoof })
  );
  roof.position.set(pos.x, 4.3, pos.z);
  roof.castShadow = true;
  group.add(roof);

  // Signboard
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.8, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  );
  sign.position.set(pos.x, 4.6, pos.z - 3.05);
  group.add(sign);

  // Counter inside
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x4a3325 })
  );
  counter.position.set(pos.x, 0.5, pos.z - 1.5);
  counter.castShadow = true;
  group.add(counter);

  // Tables + chairs outside
  for (let i = -1; i <= 1; i += 2) {
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.7, 10),
      new THREE.MeshStandardMaterial({ color: 0x3d2a1c })
    );
    table.position.set(pos.x + i * 3, 0.35, pos.z + 4);
    table.castShadow = true;
    group.add(table);

    for (let a = 0; a < 2; a++) {
      const chair = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.6, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x22160e })
      );
      chair.position.set(pos.x + i * 3 + (a === 0 ? -0.9 : 0.9), 0.3, pos.z + 4);
      chair.castShadow = true;
      group.add(chair);
    }
  }

  // warm light glow at night
  const shopLight = new THREE.PointLight(0xffcf8a, 0.6, 12, 2);
  shopLight.position.set(pos.x, 3, pos.z);
  group.add(shopLight);

  obstacles.push(new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(pos.x, 2, pos.z), new THREE.Vector3(8, 4, 6)
  ));

  return { shopLight };
}

function buildBusStop(group, obstacles, pos) {
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.2, 2),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  roof.position.set(pos.x, 2.4, pos.z);
  roof.castShadow = true;
  group.add(roof);

  [-1.8, 1.8].forEach((dx) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    pole.position.set(pos.x + dx, 1.2, pos.z - 0.8);
    group.add(pole);
  });

  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.4, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2b })
  );
  bench.position.set(pos.x, 0.5, pos.z);
  bench.castShadow = true;
  group.add(bench);

  obstacles.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(pos.x, 1, pos.z), new THREE.Vector3(4, 2, 2)));
}
