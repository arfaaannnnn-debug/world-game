// Thin wrapper around the Socket.IO client. `io()` is provided globally
// because index.html loads /socket.io/socket.io.js before this module.
export function createMultiplayerClient({ onInit, onPlayerJoined, onPlayerMoved, onPlayerLeft, onPlayerList, onOnlineCount, onGlobalChat, onPrivateMessage, onPrivateMessageSent, onJoinError }) {
  const socket = window.io();

  socket.on('init', (data) => onInit && onInit(data));
  socket.on('player-joined', (p) => onPlayerJoined && onPlayerJoined(p));
  socket.on('player-moved', (p) => onPlayerMoved && onPlayerMoved(p));
  socket.on('player-left', (p) => onPlayerLeft && onPlayerLeft(p));
  socket.on('player-list', (list) => onPlayerList && onPlayerList(list));
  socket.on('online-count', (n) => onOnlineCount && onOnlineCount(n));
  socket.on('global-chat', (msg) => onGlobalChat && onGlobalChat(msg));
  socket.on('private-message', (msg) => onPrivateMessage && onPrivateMessage(msg));
  socket.on('private-message-sent', (msg) => onPrivateMessageSent && onPrivateMessageSent(msg));
  socket.on('join-error', (err) => onJoinError && onJoinError(err));

  return {
    socket,
    join(username) {
      socket.emit('join', { username });
    },
    sendMove(x, y, z, ry, anim) {
      socket.emit('move', { x, y, z, ry, anim });
    },
    sendGlobalChat(message) {
      socket.emit('global-chat', { message });
    },
    sendPrivateMessage(targetId, message) {
      socket.emit('private-message', { targetId, message });
    },
    get id() {
      return socket.id;
    },
  };
}
