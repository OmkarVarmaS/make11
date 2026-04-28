/**
 * Sum real fantasy points for a roster.
 * Returns 0 for any player whose name is not in realPointsMap.
 * Nothing is fabricated — scores only appear after the admin uploads them.
 */
export const calculateTeamScore = (roster: any[], realPointsMap?: Record<string, number>) => {
  if (!roster || roster.length === 0) return 0;
  if (!realPointsMap || Object.keys(realPointsMap).length === 0) return 0;
  return roster.reduce((sum, player) => sum + (realPointsMap[player.name] ?? 0), 0);
};

/**
 * Points for a single player.
 * Returns 0 until the admin uploads a score for this player.
 */
export const getPlayerPoints = (player: any, realPointsMap?: Record<string, number>) => {
  if (!realPointsMap) return 0;
  return realPointsMap[player.name] ?? 0;
};

/** @deprecated use getPlayerPoints */
export const getPlayerMockPoints = getPlayerPoints;
