import { Schema, type, MapSchema } from "@colyseus/schema";

export class UnitState extends Schema {
  @type("string") id = "";
  @type("string") team = "left";
  @type("number") x = 0;
  @type("number") hp = 0;
}

export class TestUnit extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
}

export class MatchState extends Schema {
  @type("string") serverStatus = "booting";
  @type({ map: "string" }) players = new MapSchema<string>();
  @type({ map: UnitState }) units = new MapSchema<UnitState>();
  @type(TestUnit) testUnit = new TestUnit();
  @type("number") leftCastleHp = 300;
  @type("number") rightCastleHp = 300;
}
