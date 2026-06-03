export interface Signal {
  id: string;
  asset: string;
  timeframe: string;
  session: string;
  signal: 'LONG' | 'SHORT' | 'FLAT';
  confidence: number;
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  reasoning: string;
  filters_passed: string[];
  filters_failed: string[];
  vault_context: string;
  timestamp: string;
  outcome?: 'win' | 'loss' | 'pending';
}

export interface MarketAsset {
  symbol: string;
  price: number;
  change24h: number;
  spread: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface AgentState {
  id: string;
  name: string;
  type: 'Main Orchestrator' | 'Sub-Agent';
  role: string;
  status: 'idle' | 'processing' | 'error' | 'offline';
  lastAction: string;
  toolset: string[]; 
  uptime: string;
}

export interface VaultStats {
  sessionNotes: number;      // Episodic (SQLite FTS5)
  persistentProfiles: number; // Semantic
  activeSkills: number;      // Procedural (~/.hermes/skills/)
  recentLearnings: string[];
}
