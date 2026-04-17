interface SocketLike {
  socket: {
    on: (event: string, cb: () => void) => void;
    readyState: number;
    OPEN: number;
    send: (payload: string) => void;
  };
}

type UserConnections = Map<string, Set<SocketLike>>;
const connections: UserConnections = new Map();

export const registerConnection = (userId: string, connection: SocketLike): void => {
  const existing = connections.get(userId) ?? new Set<SocketLike>();
  existing.add(connection);
  connections.set(userId, existing);

  connection.socket.on("close", () => {
    const list = connections.get(userId);
    if (!list) return;
    list.delete(connection);
    if (list.size === 0) connections.delete(userId);
  });
};

export const pushRealtimeEvent = (userId: string, event: string, payload: unknown): void => {
  const list = connections.get(userId);
  if (!list?.size) return;
  const data = JSON.stringify({ event, payload, at: new Date().toISOString() });
  list.forEach((conn) => conn.socket.readyState === conn.socket.OPEN && conn.socket.send(data));
};
