"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushRealtimeEvent = exports.registerConnection = void 0;
const connections = new Map();
const registerConnection = (userId, connection) => {
    const existing = connections.get(userId) ?? new Set();
    existing.add(connection);
    connections.set(userId, existing);
    connection.socket.on("close", () => {
        const list = connections.get(userId);
        if (!list)
            return;
        list.delete(connection);
        if (list.size === 0)
            connections.delete(userId);
    });
};
exports.registerConnection = registerConnection;
const pushRealtimeEvent = (userId, event, payload) => {
    const list = connections.get(userId);
    if (!list?.size)
        return;
    const data = JSON.stringify({ event, payload, at: new Date().toISOString() });
    list.forEach((conn) => conn.socket.readyState === conn.socket.OPEN && conn.socket.send(data));
};
exports.pushRealtimeEvent = pushRealtimeEvent;
