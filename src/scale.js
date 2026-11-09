// How big things are drawn. The sim keeps its own units (so gameplay is unchanged); the client
// draws the whole world inside a group scaled by WORLD_SCALE, then scales some things back up.
export const WORLD_SCALE = 1 / 3; // the map (ground, path, trees, cliffs, castle) is drawn 3x smaller
export const MODEL_SCALE = 1; // towers, zombies, units and projectiles: 1 = drawn as small as the map
export const PLAYER_SCALE = 1 / WORLD_SCALE; // players are drawn at their original size
