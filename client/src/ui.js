// All the non-3D interface: menus, HUD, minimap, side panels, and modals.

export function setupMenus({ onPlay }) {
  const startMenu = document.getElementById('start-menu');
  const howTo = document.getElementById('how-to-play');
  const about = document.getElementById('about-screen');
  const login = document.getElementById('login-screen');

  document.getElementById('btn-play').addEventListener('click', () => {
    startMenu.classList.add('hidden');
    login.classList.remove('hidden');
  });
  document.getElementById('btn-how').addEventListener('click', () => {
    startMenu.classList.add('hidden');
    howTo.classList.remove('hidden');
  });
  document.getElementById('btn-about').addEventListener('click', () => {
    startMenu.classList.add('hidden');
    about.classList.remove('hidden');
  });
  document.getElementById('btn-back-1').addEventListener('click', () => {
    howTo.classList.add('hidden');
    startMenu.classList.remove('hidden');
  });
  document.getElementById('btn-back-2').addEventListener('click', () => {
    about.classList.add('hidden');
    startMenu.classList.remove('hidden');
  });

  const usernameInput = document.getElementById('username-input');
  const loginError = document.getElementById('login-error');
  const enterBtn = document.getElementById('btn-enter-world');

  function tryEnter() {
    const name = usernameInput.value.trim();
    if (name.length < 1) {
      loginError.textContent = 'Please enter a username.';
      loginError.classList.remove('hidden');
      return;
    }
    if (name.length > 16) {
      loginError.textContent = 'Username must be 16 characters or fewer.';
      loginError.classList.remove('hidden');
      return;
    }
    loginError.classList.add('hidden');
    login.classList.add('hidden');
    onPlay(name);
  }
  enterBtn.addEventListener('click', tryEnter);
  usernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryEnter(); });

  return {
    showLoginError(message) {
      loginError.textContent = message;
      loginError.classList.remove('hidden');
      login.classList.remove('hidden');
      document.getElementById('game-container').classList.add('hidden');
    },
  };
}

export function setupHUD(username) {
  document.getElementById('hud-username').textContent = username;
  const onlineEl = document.getElementById('hud-online');

  // toggle-able side panels
  const panelIds = ['global-chat-panel', 'players-panel', 'friends-panel', 'settings-panel'];
  const toggles = {
    'btn-toggle-chat': 'global-chat-panel',
    'btn-toggle-players': 'players-panel',
    'btn-toggle-friends': 'friends-panel',
    'btn-toggle-settings': 'settings-panel',
  };
  Object.entries(toggles).forEach(([btnId, panelId]) => {
    document.getElementById(btnId).addEventListener('click', () => {
      const panel = document.getElementById(panelId);
      const wasHidden = panel.classList.contains('hidden');
      panelIds.forEach((id) => document.getElementById(id).classList.add('hidden'));
      if (wasHidden) panel.classList.remove('hidden');
    });
  });
  document.querySelectorAll('.panel-close[data-close]').forEach((el) => {
    el.addEventListener('click', () => {
      document.getElementById(el.dataset.close).classList.add('hidden');
    });
  });

  return {
    setOnlineCount(n) {
      onlineEl.textContent = n;
    },
  };
}

export function setupPlayersPanel({ onSelectPlayer }) {
  const listEl = document.getElementById('players-list');
  return {
    render(players) {
      listEl.innerHTML = '';
      if (players.length === 0) {
        listEl.innerHTML = '<div class="empty-note">No other players online yet.</div>';
        return;
      }
      players.forEach((p) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `<span class="online-dot"></span> ${escapeHtml(p.username)}`;
        item.addEventListener('click', () => onSelectPlayer(p));
        listEl.appendChild(item);
      });
    },
  };
}

export function setupProfileAndInteract({ onMessage }) {
  const interactMenu = document.getElementById('player-interact-menu');
  const profileModal = document.getElementById('profile-modal');
  const piName = document.getElementById('pi-name');
  const profileUsername = document.getElementById('profile-username');
  let currentTarget = null;

  document.getElementById('btn-pi-message').addEventListener('click', () => {
    interactMenu.classList.add('hidden');
    if (currentTarget) onMessage(currentTarget);
  });
  document.getElementById('btn-pi-profile').addEventListener('click', () => {
    interactMenu.classList.add('hidden');
    if (currentTarget) openProfile(currentTarget);
  });
  document.getElementById('btn-pi-close').addEventListener('click', () => interactMenu.classList.add('hidden'));

  document.getElementById('btn-profile-message').addEventListener('click', () => {
    profileModal.classList.add('hidden');
    if (currentTarget) onMessage(currentTarget);
  });
  document.getElementById('btn-profile-friend').addEventListener('click', () => {
    alert(`Friend request sent to ${currentTarget ? currentTarget.username : 'player'}.`);
  });
  document.getElementById('btn-profile-block').addEventListener('click', () => {
    profileModal.classList.add('hidden');
    alert(`${currentTarget ? currentTarget.username : 'Player'} has been blocked.`);
  });
  document.getElementById('btn-profile-close').addEventListener('click', () => profileModal.classList.add('hidden'));

  function openProfile(target) {
    currentTarget = target;
    profileUsername.textContent = target.username;
    profileModal.classList.remove('hidden');
  }

  return {
    openInteractMenu(target) {
      currentTarget = target;
      piName.textContent = target.username;
      interactMenu.classList.remove('hidden');
    },
    openProfile,
    closeAll() {
      interactMenu.classList.add('hidden');
      profileModal.classList.add('hidden');
    },
  };
}

export function setupTeaShop() {
  const menu = document.getElementById('tea-shop-menu');
  const toast = document.getElementById('shop-toast');
  document.getElementById('btn-close-shop').addEventListener('click', () => menu.classList.add('hidden'));
  document.getElementById('btn-buy').addEventListener('click', () => {
    toast.textContent = 'Order placed! Enjoy your tea. ☕';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
  });
  return {
    open() { menu.classList.remove('hidden'); },
    close() { menu.classList.add('hidden'); },
    isOpen() { return !menu.classList.contains('hidden'); },
  };
}

export function setupSettings() {
  const graphics = document.getElementById('set-graphics');
  const shadows = document.getElementById('set-shadows');
  const sensitivity = document.getElementById('set-sensitivity');
  const volume = document.getElementById('set-volume');

  const saved = JSON.parse(localStorage.getItem('myworld-settings') || '{}');
  if (saved.graphics) graphics.value = saved.graphics;
  if (typeof saved.shadows === 'boolean') shadows.checked = saved.shadows;
  if (saved.sensitivity) sensitivity.value = saved.sensitivity;
  if (saved.volume !== undefined) volume.value = saved.volume;

  const state = {
    graphics: graphics.value,
    shadows: shadows.checked,
    sensitivity: Number(sensitivity.value),
    volume: Number(volume.value),
  };

  function persist() {
    localStorage.setItem('myworld-settings', JSON.stringify(state));
  }

  graphics.addEventListener('change', () => { state.graphics = graphics.value; persist(); });
  shadows.addEventListener('change', () => { state.shadows = shadows.checked; persist(); });
  sensitivity.addEventListener('input', () => { state.sensitivity = Number(sensitivity.value); persist(); });
  volume.addEventListener('input', () => { state.volume = Number(volume.value); persist(); });

  return state;
}

export function setupMinimap(worldHalfSize = 100) {
  const canvas = document.getElementById('minimap');
  const ctx = canvas.getContext('2d');
  const size = canvas.width;

  function worldToMap(x, z) {
    return {
      mx: size / 2 + (x / worldHalfSize) * (size / 2),
      my: size / 2 + (z / worldHalfSize) * (size / 2),
    };
  }

  return {
    render(player, remotePlayers, teaShopPos) {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(20,28,20,0.9)';
      ctx.fillRect(0, 0, size, size);

      // roads
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size);
      ctx.moveTo(0, worldToMap(0, 20).my); ctx.lineTo(size, worldToMap(0, 20).my);
      ctx.stroke();

      // tea shop
      const shop = worldToMap(teaShopPos.x, teaShopPos.z);
      ctx.fillStyle = '#ffb547';
      drawStar(ctx, shop.mx, shop.my, 5);

      // remote players
      ctx.fillStyle = '#4ad0c9';
      remotePlayers.forEach((p) => {
        const { mx, my } = worldToMap(p.mesh.position.x, p.mesh.position.z);
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // local player
      const { mx, my } = worldToMap(player.x, player.z);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

function drawStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
