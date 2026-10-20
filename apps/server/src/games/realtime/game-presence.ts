// Кто сейчас в лобби игры. В памяти процесса: сервер один (один контейнер), общего
// хранилища не нужно; после перезапуска клиенты переподключаются и заполняют его заново.
// Пользователь в сети, пока открыт хотя бы один его сокет: вкладок может быть несколько.
export class GamePresence {
  // игра → пользователь → его сокеты в комнате игры
  private readonly games = new Map<string, Map<string, Set<string>>>();

  // true — пользователь только что появился в лобби.
  add(gameId: string, userId: string, socketId: string): boolean {
    let users = this.games.get(gameId);
    if (!users) {
      users = new Map();
      this.games.set(gameId, users);
    }
    let sockets = users.get(userId);
    const appeared = !sockets;
    if (!sockets) {
      sockets = new Set();
      users.set(userId, sockets);
    }
    sockets.add(socketId);
    return appeared;
  }

  // true — у пользователя не осталось сокетов в лобби, он ушёл.
  remove(gameId: string, userId: string, socketId: string): boolean {
    const users = this.games.get(gameId);
    const sockets = users?.get(userId);
    if (!users || !sockets?.delete(socketId)) return false;
    if (sockets.size > 0) return false;
    users.delete(userId);
    if (users.size === 0) this.games.delete(gameId);
    return true;
  }

  online(gameId: string): string[] {
    return [...(this.games.get(gameId)?.keys() ?? [])];
  }

  forget(gameId: string): void {
    this.games.delete(gameId);
  }
}
