// Handles the global chat panel and the private chat window.
// `mp` is the multiplayer client from multiplayer.js.
// `getUsername(id)` resolves a socket id to a display name for private chat headers.

export function setupChat(mp, myUsername, getUsername) {
  const globalLog = document.getElementById('global-chat-log');
  const globalInput = document.getElementById('global-chat-input');
  const globalSendBtn = document.getElementById('btn-global-send');

  const privatePanel = document.getElementById('private-chat-panel');
  const privateLog = document.getElementById('private-chat-log');
  const privateInput = document.getElementById('private-chat-input');
  const privateSendBtn = document.getElementById('btn-private-send');
  const privateUsernameEl = document.getElementById('pc-username');
  const pcClose = document.getElementById('pc-close');

  let activePrivateChatId = null;
  const unread = new Set();

  function appendLine(container, who, message, isMe) {
    const line = document.createElement('div');
    line.className = 'chat-line' + (isMe ? ' me' : '');
    const whoSpan = document.createElement('span');
    whoSpan.className = 'who';
    whoSpan.textContent = who + ': ';
    line.appendChild(whoSpan);
    line.appendChild(document.createTextNode(message));
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
  }

  function sendGlobal() {
    const msg = globalInput.value.trim();
    if (!msg) return;
    mp.sendGlobalChat(msg);
    globalInput.value = '';
  }
  globalSendBtn.addEventListener('click', sendGlobal);
  globalInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendGlobal(); });

  function openPrivateChat(targetId) {
    activePrivateChatId = targetId;
    unread.delete(targetId);
    privateUsernameEl.textContent = getUsername(targetId) || 'Player';
    privatePanel.classList.remove('hidden');
    privateInput.focus();
  }

  function sendPrivate() {
    const msg = privateInput.value.trim();
    if (!msg || !activePrivateChatId) return;
    mp.sendPrivateMessage(activePrivateChatId, msg);
    privateInput.value = '';
  }
  privateSendBtn.addEventListener('click', sendPrivate);
  privateInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendPrivate(); });
  pcClose.addEventListener('click', () => { privatePanel.classList.add('hidden'); activePrivateChatId = null; });

  return {
    onGlobalChat(msg) {
      appendLine(globalLog, msg.username, msg.message, msg.username === myUsername);
    },
    onPrivateMessage(msg) {
      if (activePrivateChatId === msg.fromId) {
        appendLine(privateLog, msg.fromUsername, msg.message, false);
      } else {
        unread.add(msg.fromId);
      }
    },
    onPrivateMessageSent(msg) {
      if (activePrivateChatId === msg.toId) {
        appendLine(privateLog, 'You', msg.message, true);
      }
    },
    openPrivateChat,
    hasUnreadFrom(id) {
      return unread.has(id);
    },
  };
}
