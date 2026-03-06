/**
 * src/socket.js
 *
 * Singleton that holds the Socket.io `io` instance.
 * Created once in server.js, then imported by any controller that needs to emit.
 *
 * Usage in controllers:
 *   const { getIO } = require("../socket");
 *   getIO().to(`coaching:${coachingId}`).emit("test:attempted", payload);
 */

let _io = null;

/**
 * Called ONCE from server.js after creating the http server.
 * @param {import("socket.io").Server} io
 */
function setIO(io) {
  _io = io;
}

/**
 * Returns the io instance. Safe to call from anywhere after server starts.
 * Returns a no-op object if socket hasn't been initialised yet (e.g. in tests).
 */
function getIO() {
  if (!_io) {
    // Return a safe no-op so controllers don't crash if called before socket init
    return { to: () => ({ emit: () => {} }) };
  }
  return _io;
}

module.exports = { setIO, getIO };
