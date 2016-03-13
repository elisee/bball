declare namespace Game {
  interface ErrorCallback { (err: string): void; }

  interface GamePub {
    match: Game.MatchPub;
    players: Game.PlayerPub[];
    teams: Game.TeamPub[];
  }

  interface PlayerPub {
    id: string;
    name: string;
    avatar?: AvatarPub;
  }

  interface AvatarPub {
    teamIndex: number;
    score: number;
    x: number;
    z: number;
    jump: number;
    angleX: number;
    angleY: number;
  }

  interface TeamPub {
    score: number;
  }

  interface MatchPub {
    ticksLeft: number;
  }

  interface PlayerMove {
    x: number;
    z: number;
    jump: number;
    angleX: number;
    angleY: number;
    // shoot?: boolean;
  }

  interface TickData {
    playerMoves: { [playerId: string]: PlayerMove; };
  }
}
