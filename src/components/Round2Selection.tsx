import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { confirmRound2Interest } from '../services/auctionSupabaseService';

interface UnsoldPlayer {
  player_id: string;
  name: string;
  role: string;
  team: string;
  basePrice: number;
}

export function Round2Selection({ round2Id, teamId, onConfirmed }: { round2Id: string, teamId: string, onConfirmed: () => void }) {
  const [unsoldPlayers, setUnsoldPlayers] = useState<UnsoldPlayer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    async function loadUnsold() {
      setLoading(true);
      const { data, error } = await supabase
        .from('auction_round_players')
        .select(`
          player_id,
          players ( name, role, team, basePrice )
        `)
        .eq('round_id', round2Id)
        .eq('status', 'PENDING');
      
      if (!error && data) {
        setUnsoldPlayers(data.map((d: any) => ({
          player_id: d.player_id,
          name: d.players.name,
          role: d.players.role,
          team: d.players.team,
          basePrice: d.players.basePrice,
        })));
      }
      setLoading(false);
    }
    loadUnsold();
  }, [round2Id]);

  const handleToggle = (playerId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(playerId)) newSet.delete(playerId);
    else newSet.add(playerId);
    setSelectedIds(newSet);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await confirmRound2Interest(round2Id, teamId, Array.from(selectedIds));
      onConfirmed();
    } catch (e) {
      console.error(e);
      alert('Failed to save selections');
    }
    setSaving(false);
  };

  const filtered = unsoldPlayers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (roleFilter ? p.role === roleFilter : true)
  );

  if (loading) return <div className="text-white">Loading unsold players...</div>;

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-amber-500 mb-4">Unsold Players - Round 2 Selection</h2>
      <p className="mb-6 text-gray-300">Pick the players you'd like re-auctioned. Only selected players will appear in Round 2.</p>
      
      <div className="flex gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Search players..." 
          className="bg-gray-800 border border-gray-700 px-4 py-2 rounded focus:border-amber-500 outline-none flex-1"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select 
          className="bg-gray-800 border border-gray-700 px-4 py-2 rounded focus:border-amber-500 outline-none"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="BATTER">Batter</option>
          <option value="BOWLER">Bowler</option>
          <option value="ALL_ROUNDER">All Rounder</option>
          <option value="WICKETKEEPER">Wicket Keeper</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 mb-6">
        <table className="w-full text-left">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-3 w-12"><input type="checkbox" onChange={(e) => {
                if (e.target.checked) setSelectedIds(new Set(filtered.map(p => p.player_id)));
                else setSelectedIds(new Set());
              }} checked={filtered.length > 0 && selectedIds.size === filtered.length} /></th>
              <th className="p-3">Player</th>
              <th className="p-3">Role</th>
              <th className="p-3">Base Price</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.player_id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="p-3">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(p.player_id)}
                    onChange={() => handleToggle(p.player_id)}
                  />
                </td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-gray-400">{p.role}</td>
                <td className="p-3 text-amber-500">₹{p.basePrice}L</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">No players found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleConfirm}
          disabled={saving}
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : `Confirm Selection (${selectedIds.size})`}
        </button>
      </div>
    </div>
  );
}
