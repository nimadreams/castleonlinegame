import { Client, type Room } from "@colyseus/sdk";

export interface MatchState {
  serverStatus: string;
  testUnit: {
    x: number;
    y: number;
  };
}

export class ClientNetwork {
  private client: Client | null = null;
  private room: Room<unknown, MatchState> | null = null;

  async connect(endpoint = "ws://localhost:2567", roomName = "match"): Promise<Room<unknown, MatchState>> {
    this.client = new Client(endpoint);
    this.room = await this.client.joinOrCreate(roomName);
    return this.room;
  }

  onStateChange(callback: (state: MatchState) => void): void {
    if (!this.room) {
      return;
    }

    this.room.onStateChange(callback);
  }

  send(type: string, payload?: unknown): void {
    if (!this.room) {
      return;
    }

    this.room.send(type, payload);
  }

  getRoom(): Room<unknown, MatchState> | null {
    return this.room;
  }
}
