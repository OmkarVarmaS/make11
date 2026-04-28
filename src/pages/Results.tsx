import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, Info, Heart, ChevronLeft, Download } from 'lucide-react';
import { dbService, TEAM_COLORS } from '../services/db';
import { calculateTeamScore, getPlayerMockPoints } from '../utils/score';
import PointsModal from '../components/PointsModal';

const fmt = (l: number) => {
  if (l >= 100) return `₹${(l / 100).toFixed(l % 100 === 0 ? 0 : 2)}Cr`;
  return `₹${l}L`;
};
const fmtPurse = (l: number) => {
  if (l >= 100) return `₹${(l / 100).toFixed(l % 100 === 0 ? 0 : 1)}Cr`;
  return `₹${l}L`;
};

const Results = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();


  const [room, setRoom] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [awards, setAwards] = useState<any>({});
  const [showPoints, setShowPoints] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [realPoints, setRealPoints] = useState<Record<string, number>>({});




  const rebuildLeaderboard = (r: any, pointsMap: Record<string, number>) => {
    const participants = r.participants || [];
    const targetSize = r.teamSize || 20;
    const ranked = participants.map((p: any) => {
      const roster = p.roster || [];
      const uniqueTeams = new Set(roster.map((pl: any) => pl.team)).size;
      const squadScore = Math.floor(Math.min((roster.length / targetSize) * 50 + (uniqueTeams * 2) + 20, 99));
      return { ...p, score: squadScore, fantasyPoints: calculateTeamScore(roster, pointsMap) };
    }).sort((a: any, b: any) => b.score - a.score);
    setLeaderboard(ranked);

    let mostExpensive: any = null, highestPrice = -1;
    let biggestBiddingWar: any = null, highestBids = -1;
    let bestValue: any = null, bestRatio = -1;
    let arcTeam: any = null, maxArc = -1;
    ranked.forEach((team: any) => {
      let arcCount = 0;
      (team.roster || []).forEach((player: any) => {
        if (player.role === 'ALL-ROUNDER') arcCount++;
        const price = player.soldFor || 0;
        if (price > highestPrice) { highestPrice = price; mostExpensive = { player, teamName: team.name }; }
        const bids = player.bidCount || (Math.floor((price - (player.basePrice || 20)) / 40) + 1);
        const finalBids = Math.max(bids, 1);
        if (finalBids > highestBids) { highestBids = finalBids; biggestBiddingWar = { player, bids: finalBids }; }
        const ratio = ((player.basePrice || 20) * 10) / (price + 5);
        if (ratio > bestRatio && price > 0) { bestRatio = ratio; bestValue = { player, teamName: team.name }; }
      });
      if (arcCount > maxArc) { maxArc = arcCount; arcTeam = { team, count: arcCount }; }
    });
    const budgetKing = ranked.slice().sort((a: any, b: any) => (b.purse || 0) - (a.purse || 0))[0];
    setAwards({ mostExpensive, biggestBiddingWar, bestValue, budgetKing, allRounderCollector: arcTeam });
  };


  useEffect(() => {
    const load = async () => {
      if (!roomId) return;
      const r = await dbService.getRoom(roomId);
      if (!r) return;
      setRoom(r);
      // Load cumulative points stored in the room (start at 0, grow as admin uploads)
      const pointsMap = await dbService.getPlayerPoints(roomId);
      setRealPoints(pointsMap);

      rebuildLeaderboard(r, pointsMap);
    };
    load();
  }, [roomId]);

  if (!room) return null;

  const winner = leaderboard.length > 0 ? leaderboard[0] : null;

  return (
    <div className="results-page" style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'white', padding: '3rem 1.5rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ width: '40px', height: '4px', background: 'var(--accent-primary)', margin: '0 auto 1.5rem', borderRadius: '4px' }}></div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '-0.02em', margin: '0 0 0.5rem 0' }}>Auction Complete</h1>
          <div style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em', fontSize: '1rem', textTransform: 'uppercase', fontWeight: 600 }}>{room.roomName || roomId}</div>

          {winner && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(235, 208, 92, 0.08)', border: '1px solid rgba(235, 208, 92, 0.25)', padding: '0.75rem 1.5rem', borderRadius: '40px', marginTop: '2rem' }}>
              <span style={{ color: 'var(--accent-primary)' }}>★</span>
              <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.1rem' }}>{winner.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontWeight: 600 }}>{winner.score}/100</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2.5rem', fontSize: '0.875rem' }}>
            <div onClick={() => setShowPoints(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }} className="hover-white">
              <Info size={14} /> How Points Are Calculated
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <Heart size={14} color="var(--danger)" fill="var(--danger)" /> Enjoying this? Consider supporting the project
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.15em' }}>LEADERBOARD</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {leaderboard.map((team, idx) => {
              const isWin = idx === 0;
              const expanded = expandedTeam === team.name;
              return (
                <div key={team.name} style={{ background: isWin ? 'rgba(235, 208, 92, 0.05)' : 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: isWin ? 'rgba(235, 208, 92, 0.3)' : 'var(--border-highlight)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div className="results-leaderboard-row" onClick={() => setExpandedTeam(expanded ? null : team.name)}
                    style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: isWin ? 'var(--accent-primary)' : 'rgba(255,255,255,0.3)' }}>#{idx + 1}</span>
                      <div>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: 'white' }}>{team.name}</h3>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', letterSpacing: '0.05em' }}>
                          <span>{team.slotsUsed || 0} players</span> <span style={{ opacity: 0.3 }}>|</span>
                          <span>{fmtPurse(15000 - (team.purse || 15000))} spent</span> <span style={{ opacity: 0.3 }}>|</span>
                          <span>{fmtPurse(team.purse || 0)} left</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{team.score} <span style={{ fontSize: '1rem', color: 'var(--accent-primary)' }}>/100</span></span>
                      <ChevronDown size={20} color="var(--text-secondary)" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                    </div>
                  </div>

                  {expanded && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--border-highlight)', padding: '1rem 2rem' }}>
                      {(() => {
                        const roster = team.roster || [];
                        const wkCount = roster.filter((p: any) => p.role === 'WICKETKEEPER').length;
                        const arCount = roster.filter((p: any) => p.role === 'ALL_ROUNDER').length;
                        const batCount = roster.filter((p: any) => p.role === 'BATTER').length;
                        const bowlCount = roster.filter((p: any) => p.role === 'BOWLER').length;
                        const uniqueTeams = new Set(roster.map((p: any) => p.team)).size;
                        const totalSpent = roster.reduce((acc: any, p: any) => acc + (p.soldFor || 0), 0);
                        
                        const maxPricePlayer = roster.length > 0 ? [...roster].sort((a,b) => b.soldFor - a.soldFor)[0] : null;
                        const bestValuePlayer = roster.length > 0 ? [...roster].sort((a,b) => {
                          const ap = getPlayerMockPoints(a, realPoints);
                          const bp = getPlayerMockPoints(b, realPoints);
                          return (bp/(b.soldFor||1)) - (ap/(a.soldFor||1));
                        })[0] : null;
                        
                        const roleColor = (role: string) => {
                          if (role === 'BATTER') return '#facc15';
                          if (role === 'BOWLER') return '#60a5fa';
                          if (role === 'ALL_ROUNDER') return '#4ade80';
                          if (role === 'WICKETKEEPER') return '#c084fc';
                          return 'white';
                        };
                        
                        const roleBadge = (role: string) => {
                          if (role === 'BATTER') return 'BAT';
                          if (role === 'BOWLER') return 'BOWL';
                          if (role === 'ALL_ROUNDER') return 'AR';
                          if (role === 'WICKETKEEPER') return 'WK';
                          return role;
                        };

                        const targetSize = room.teamSize || 20;
                        const completeness = Math.min((roster.length / targetSize) * 100, 100);
                        const valueEff = (roster.reduce((a:any,p:any)=>a+(p.score||0),0) / Math.max(totalSpent, 1)) * 100;
                        const valueEffScore = Math.min((valueEff / 10) * 100, 100);
                        const purseMgmt = ((15000 - totalSpent) / 15000) * 100;
                        const squadScore = team.score; // Use pre-calculated score
                        
                        return (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                              {roster.map((p: any, i: number) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: TEAM_COLORS[p.team] || roleColor(p.role) }} />
                                    <span style={{ fontSize: '1rem', fontWeight: 600 }}>{p.name}</span>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, background: `${roleColor(p.role)}25`, color: roleColor(p.role), padding: '0.15rem 0.4rem', borderRadius: '4px', letterSpacing: '0.05em' }}>{roleBadge(p.role)}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <span style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 800, fontFamily: 'monospace' }}>{getPlayerMockPoints(p, realPoints)} pts</span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', width: '60px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(p.soldFor)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div style={{ paddingTop: '1.5rem' }}>
                              {/* Dots line summary */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: roleColor('WICKETKEEPER') }}/>{wkCount} Wicketkeeper</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: roleColor('ALL_ROUNDER') }}/>{arCount} All-Rounder</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: roleColor('BATTER') }}/>{batCount} Batsman</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: roleColor('BOWLER') }}/>{bowlCount} Bowler</div>
                                <span style={{ marginLeft: '0.5rem' }}>from {uniqueTeams} teams</span>
                              </div>

                              {/* Progress Bars */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <span style={{ width: '110px' }}>Completeness</span>
                                  <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}><div style={{ width: `${completeness}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '2px' }}/></div>
                                  <span style={{ width: '40px', textAlign: 'right' }}>{roster.length}/{targetSize}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <span style={{ width: '110px' }}>Role Balance</span>
                                  <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}><div style={{ width: `100%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '2px' }}/></div>
                                  <span style={{ width: '40px', textAlign: 'right' }}>25/25</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <span style={{ width: '110px' }}>Value Efficiency</span>
                                  <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}><div style={{ width: `${valueEffScore}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '2px' }}/></div>
                                  <span style={{ width: '40px', textAlign: 'right' }}>{(valueEff/10).toFixed(1)}/25</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <span style={{ width: '110px' }}>Purse Mgmt</span>
                                  <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}><div style={{ width: `${purseMgmt}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '2px' }}/></div>
                                  <span style={{ width: '40px', textAlign: 'right' }}>{(purseMgmt/100 * 15).toFixed(1)}/15</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <span style={{ width: '110px' }}>Diversity</span>
                                  <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}><div style={{ width: `${(uniqueTeams/15)*100}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '2px' }}/></div>
                                  <span style={{ width: '40px', textAlign: 'right' }}>{uniqueTeams}/15</span>
                                </div>
                              </div>

                              {/* Most Expensive & Best value */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                                <div><strong style={{ color: 'white' }}>Most expensive:</strong> {maxPricePlayer?.name} — {fmt(maxPricePlayer?.soldFor || 0)}</div>
                                <div><strong style={{ color: 'white' }}>Best value:</strong> {bestValuePlayer?.name} — {fmt(bestValuePlayer?.soldFor || 0)} <span style={{ opacity: 0.5 }}>(base {fmt(bestValuePlayer?.basePrice || 0)})</span></div>
                              </div>
                              
                              {/* Bottom Totals */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{roster.length}/{targetSize} players</span>
                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                  <span style={{ color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.9rem' }}>{squadScore}/100</span>
                                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.9rem' }}>{fmtPurse(totalSpent)}</span>
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Awards */}
        <div style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.15em' }}>AWARDS</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          </div>
          
          <div className="results-awards-scroll custom-scrollbar" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
            {/* Best Value Pick */}
            {awards.bestValue && (
              <div style={{ minWidth: '240px', background: 'var(--bg-panel)', border: '1px solid var(--border-highlight)', borderRadius: '12px', padding: '1.5rem flex 1' }}>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '1rem', textTransform: 'uppercase' }}>BEST VALUE PICK</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{awards.bestValue.player.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'white', fontWeight: 600 }}>{fmt(awards.bestValue.player.soldFor)}</span>
                    <span style={{ opacity: 0.5, marginLeft: '0.5rem' }}>(base {fmt(awards.bestValue.player.basePrice)})</span>
                  </div>
                </div>
              </div>
            )}
            {/* Most Expensive */}
            {awards.mostExpensive && (
               <div style={{ minWidth: '240px', background: 'var(--bg-panel)', border: '1px solid var(--border-highlight)', borderRadius: '12px', padding: '1.5rem' }}>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '1rem', textTransform: 'uppercase' }}>MOST EXPENSIVE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{awards.mostExpensive.player.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sold for <span style={{ color: 'white', fontWeight: 600 }}>{fmt(awards.mostExpensive.player.soldFor)}</span></div>
               </div>
            )}
            {/* Biggest Bidding War */}
            {awards.biggestBiddingWar && (
               <div style={{ minWidth: '240px', background: 'var(--bg-panel)', border: '1px solid var(--border-highlight)', borderRadius: '12px', padding: '1.5rem' }}>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '1rem', textTransform: 'uppercase' }}>BIGGEST BIDDING WAR</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{awards.biggestBiddingWar.player.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{awards.biggestBiddingWar.bids} bids placed</div>
               </div>
            )}
            {/* Budget King */}
            {awards.budgetKing && (
               <div style={{ minWidth: '240px', background: 'var(--bg-panel)', border: '1px solid var(--border-highlight)', borderRadius: '12px', padding: '1.5rem' }}>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '1rem', textTransform: 'uppercase' }}>BUDGET KING</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>{awards.budgetKing.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{fmtPurse(awards.budgetKing.purse)} remaining</div>
               </div>
            )}
             {/* All-Rounder Collector */}
             {awards.allRounderCollector && awards.allRounderCollector.count > 0 && (
               <div style={{ minWidth: '240px', background: 'var(--bg-panel)', border: '1px solid var(--border-highlight)', borderRadius: '12px', padding: '1.5rem' }}>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '1rem', textTransform: 'uppercase' }}>ALL-ROUNDER COLLECTOR</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>{awards.allRounderCollector.team.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{awards.allRounderCollector.count} all-rounders</div>
               </div>
            )}
          </div>
        </div>

        {/* How it works info box */}
        <div style={{ background: 'rgba(235, 208, 92, 0.05)', border: '1px solid rgba(235, 208, 92, 0.2)', borderRadius: '12px', padding: '2rem', marginBottom: '2.5rem' }}>
           <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', lineHeight: 1.6 }}>
             <strong style={{ color: 'var(--accent-primary)' }}>How it works:</strong> Points are based on real player performances in scheduled matches. Your leaderboard updates automatically as matches are played.
           </p>
           <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
             Fantasy points update as match data is processed. Come back to this room anytime to check the latest standings.
           </p>
        </div>

        {/* Actions removed */}

        <button 
          className="btn"
          style={{ width: '100%', padding: '1.25rem', background: 'rgba(235, 208, 92, 0.15)', color: 'white', border: 'none', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: 700, marginBottom: '2rem', cursor: 'pointer' }}
        >
           <Download size={20} /> Download Excel
        </button>

        <div 
          onClick={() => navigate('/home')}
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 500 }}
        >
          <ChevronLeft size={18} /> Back to Home
        </div>

      </div>

      {showPoints && <PointsModal isOpen={showPoints} onClose={() => setShowPoints(false)} />}
    </div>
  );
};

export default Results;
