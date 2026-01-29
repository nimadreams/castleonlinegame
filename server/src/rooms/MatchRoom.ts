import { Room, Client } from "colyseus";
import { MatchState, UnitState } from "../schemas/MatchState";
import { config } from "../config/config";

export class MatchRoom extends Room<MatchState> {
  private unitCounter = 0;

  onCreate(): void {
    this.setState(new MatchState());
    this.state.serverStatus = "ready";
    this.state.testUnit.x = 640;
    this.state.testUnit.y = 360;
    this.setSimulationInterval((delta) => this.update(delta), 1000 / config.tickRate);

    this.onMessage("spawn_unit", (client) => {
      this.spawnUnit(client.sessionId);
    });

    this.onMessage("move", (_, payload: { x?: number; y?: number }) => {
      const x = typeof payload?.x === "number" ? payload.x : null;
      const y = typeof payload?.y === "number" ? payload.y : null;

      if (x === null || y === null) {
        return;
      }

      this.state.testUnit.x = Math.max(0, Math.min(1280, x));
      this.state.testUnit.y = Math.max(0, Math.min(720, y));
      this.state.serverStatus = "unit_moved";
    });
  }

  onJoin(client: Client): void {
    const team = this.clients.length % 2 === 1 ? "left" : "right";
    this.state.players.set(client.sessionId, team);
    this.state.serverStatus = "player_joined";
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
  }

  private spawnUnit(sessionId: string): void {
    const team = this.state.players.get(sessionId);
    if (!team) {
      return;
    }

    const unitId = `u_${this.unitCounter++}`;
    const unit = new UnitState();
    unit.id = unitId;
    unit.team = team;
    unit.x = team === "left" ? 160 : 1120;
    unit.hp = 40;

    this.state.units.set(unitId, unit);
  }

  private update(deltaMs: number): void {
    const delta = deltaMs / 1000;
    const speed = 80;

    for (const unit of this.state.units.values()) {
      unit.x += (unit.team === "left" ? 1 : -1) * speed * delta;

      if (unit.team === "left" && unit.x >= 1120) {
        this.state.rightCastleHp = Math.max(0, this.state.rightCastleHp - 2);
      }

      if (unit.team === "right" && unit.x <= 160) {
        this.state.leftCastleHp = Math.max(0, this.state.leftCastleHp - 2);
      }
    }
  }
}
