import { format } from 'date-fns';
import { BrainCircuit, Database, Terminal, Cpu, AlertTriangle, Activity, ServerCrash, RefreshCw, MessageSquare, X, Send } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import type { Signal, AgentState, VaultStats, MarketAsset } from './types';

// Utility for merging tailwind classes nicely
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function AgentCard({ agent }: { agent: AgentState }) {
  const isProcessing = agent.status === 'processing';
  const isMain = agent.type === 'Main Orchestrator';
  
  return (
    <div className={cn(
      "p-4 rounded-xl border flex flex-col gap-3 shadow-lg relative",
      isMain ? "bg-[#0a0d14] border-[#f27d26]/30" : "bg-black/40 border-[#ffffff10]"
    )}>
      {isProcessing && <div className="absolute top-0 right-0 p-2"><div className={cn("w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px]", isMain ? "bg-[#f27d26] shadow-[#f27d26]" : "bg-[#38bdf8] shadow-[#38bdf8]")} /></div>}
      <div className="flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg flex items-center justify-center", 
            isProcessing && isMain ? "bg-[#f27d26]/20 text-[#f27d26]" : 
            isProcessing && !isMain ? "bg-[#38bdf8]/20 text-[#38bdf8]" : 
            "bg-white/5 text-[#64748b]")}>
            {isMain ? <BrainCircuit size={16} /> : <Cpu size={16} />}
          </div>
          <div>
            <h3 className={cn("text-sm font-bold", isMain ? "text-[#f27d26]" : "text-[#e0e6ed]")}>{agent.name}</h3>
            <p className="text-[10px] uppercase tracking-widest text-[#64748b]">{agent.type} • {agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pr-2">
          <span className="text-[10px] font-mono text-[#64748b] uppercase">{agent.status}</span>
        </div>
      </div>
      
      {agent.toolset && agent.toolset.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 z-10">
          {agent.toolset.map(tool => (
            <span key={tool} className="text-[9px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded font-mono text-[#94a3b8] uppercase tracking-wider">
              {tool}
            </span>
          ))}
        </div>
      )}

      <div className="bg-black/60 p-2 rounded-lg border border-white/5 z-10 mt-1">
        <p className="text-[10px] font-mono text-[#94a3b8] truncate">
          <span className={cn("[EXEC]", isMain ? "text-[#f27d26]" : "text-[#38bdf8]")}>[EXEC]</span> &gt; {agent.lastAction || 'Waiting for tasks...'}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [time, setTime] = useState(new Date());
  
  // Real data state
  const [signals, setSignals] = useState<Signal[]>([]);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [vault, setVault] = useState<VaultStats | null>(null);
  const [equityData, setEquityData] = useState<any[]>([]);
  const [market, setMarket] = useState<MarketAsset[]>([]);
  const [autoTrade, setAutoTrade] = useState(false);
  
  // Connection state
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [backendUrl, setBackendUrl] = useState(import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000');

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'hermes', content: string, timestamp: Date}[]>([
    { role: 'hermes', content: 'Hermes Orchestrator online. How can I assist with your trading system today?', timestamp: new Date() }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleAutoTrade = async () => {
    const newState = !autoTrade;
    setAutoTrade(newState); // Optimistic UI
    try {
      await fetch(`${backendUrl}/api/trading/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_trade: newState })
      });
    } catch(err) {
      console.error('Failed to toggle auto trade');
      setAutoTrade(!newState); // Revert on failure
    }
  };

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = { role: 'user' as const, content: chatInput, timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);
    setChatInput('');

    if (status === 'connected') {
      try {
        const res = await fetch(`${backendUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: newMsg.content })
        });
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'hermes', content: data.reply, timestamp: new Date() }]);
      } catch (err) {
        setMessages(prev => [...prev, { role: 'hermes', content: 'Error: Connection to Hermes backend failed.', timestamp: new Date() }]);
      }
    } else {
      // Mock response for simulation mode
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'hermes', 
          content: 'SYSTEM OFFLINE: I am running in simulation mode. Connect the Python Hermes backend to enable live natural language execution.', 
          timestamp: new Date() 
        }]);
      }, 600);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        // Fetch health check first
        const healthRes = await fetch(`${backendUrl}/api/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!healthRes.ok) throw new Error(`Backend returned status: ${healthRes.status}`);
        
        // If healthy, fetch the real data
        const [signalsRes, agentsRes, vaultRes, equityRes, marketRes, configRes] = await Promise.all([
          fetch(`${backendUrl}/api/signals`),
          fetch(`${backendUrl}/api/agents`),
          fetch(`${backendUrl}/api/vault`),
          fetch(`${backendUrl}/api/equity`),
          fetch(`${backendUrl}/api/market`),
          fetch(`${backendUrl}/api/trading/config`)
        ]);

        if (signalsRes.ok) setSignals(await signalsRes.json());
        if (agentsRes.ok) setAgents(await agentsRes.json());
        if (vaultRes.ok) setVault(await vaultRes.json());
        if (equityRes.ok) setEquityData(await equityRes.json());
        if (marketRes.ok) setMarket(await marketRes.json());
        if (configRes.ok) {
           const conf = await configRes.json();
           setAutoTrade(conf.auto_trade);
        }
        
        setStatus('connected');
        setErrorMsg('');
      } catch (err: any) {
        setStatus('error');
        if (err.name === 'AbortError') {
          setErrorMsg(`Connection timed out attempting to reach backend at: ${backendUrl}`);
        } else {
          setErrorMsg(err.message || 'Failed to connect to the Hermes API backend.');
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, [backendUrl]);

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col gap-6 max-w-[1600px] mx-auto select-none bg-[#05070a] text-[#e0e6ed] relative">
      
      {/* Error Overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 z-50 bg-[#05070a]/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#0a0d14] border border-red-500/30 rounded-2xl p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(220,38,38,0.15)] flex flex-col gap-6">
            <div className="flex items-start gap-4 text-red-400">
              <ServerCrash className="w-10 h-10 shrink-0" />
              <div>
                <h2 className="text-xl font-bold mb-1 uppercase tracking-tight">System Offline: API Connection Failed</h2>
                <p className="text-sm text-red-400/80 font-mono">{errorMsg}</p>
              </div>
            </div>
            
            <div className="bg-black/40 border border-white/5 rounded-xl p-5 text-sm space-y-4">
              <div>
                <h3 className="font-bold text-white mb-2 text-xs uppercase tracking-widest flex items-center gap-2">
                  <Activity size={14} className="text-[#38bdf8]" />
                  Required Local Setup to Provide Live Data
                </h3>
                <p className="text-[#94a3b8] mb-3">This dashboard acts as a frontend for your local Hermes Agent node. You must run the data-providing backend:</p>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-3 text-emerald-400 text-sm">
                  <strong>💡 MT5 Expert Advisors Generated!</strong> Check the <code className="text-white bg-black/30 px-1 py-0.5 rounded">/mt5_ea/</code> directory we just created in your project! We generated both the <code className="text-white">ZeroMQ</code> and <code className="text-white">Native HTTP</code> EAs to attach to your MetaTrader 5 charts.
                </div>
                <ol className="list-decimal list-inside space-y-3 text-[#94a3b8] font-mono text-xs">
                  <li>
                    <strong className="text-white">API Server with CORS:</strong>
                    <p className="pl-4 mt-1">Start your Flask wrapper that exposes <code className="text-[#38bdf8]">~/.hermes/state.db</code> and trading signals over HTTP. It MUST use <code className="text-emerald-400">flask-cors</code> to allow requests from this browser.</p>
                  </li>
                  <li>
                    <strong className="text-white">MT5 ZeroMQ Bridge:</strong>
                    <p className="pl-4 mt-1">Run the ZMQ execution relay for live trade dispatching.</p>
                  </li>
                  <li>
                    <strong className="text-white">Hermes System Agent:</strong>
                    <p className="pl-4 mt-1">Ensure the core orchestration agent is active in your terminal or on your VPS running the ReAct loop.</p>
                  </li>
                </ol>
              </div>
              
              <div className="pt-4 border-t border-white/5">
                <label className="text-xs uppercase tracking-widest text-[#64748b] mb-2 block">Configure Backend URL</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-[#38bdf8] focus:outline-none transition-colors"
                  />
                  <button onClick={() => setStatus('connecting')} className="bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/30 px-4 rounded-lg flex items-center justify-center hover:bg-[#38bdf8]/20 transition-colors">
                    <RefreshCw size={16} className={cn(status === 'connecting' && "animate-spin")} />
                  </button>
                </div>
                <p className="text-[10px] text-[#64748b] mt-2">Also set <code className="text-[#38bdf8]">VITE_BACKEND_URL</code> in your `.env` file to persist this setting.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-center mb-2 border-b border-[#ffffff10] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#f27d26] to-[#ff4e00] rounded-lg shadow-[0_0_15px_rgba(242,125,38,0.4)] flex items-center justify-center">
            <span className="text-black font-bold text-lg leading-none mt-0.5">H</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase italic">Hermes <span className="text-[#f27d26]">Orchestrator</span></h1>
            <p className="text-[10px] text-[#64748b] tracking-widest uppercase">Autonomous Trading Brain v3.5-LLAMA</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#64748b] uppercase">System Time</span>
            <span className="text-xs font-mono text-[#00f2ff]">{format(time, 'HH:mm:ss')} UTC</span>
          </div>
          <div className="flex flex-col items-end border-l border-[#ffffff10] pl-6 hidden md:flex">
            <span className="text-[10px] text-[#64748b] uppercase">System Status</span>
            
            {status === 'connected' ? (
              <span className="text-xs font-mono text-[#00ff9d] flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff9d] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff9d]"></span>
                </span>
                ACTIVE // REACT_LOOP_RUNNING
              </span>
            ) : status === 'connecting' ? (
              <span className="text-xs font-mono text-amber-500 flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin" />
                CONNECTING...
              </span>
            ) : (
              <span className="text-xs font-mono text-red-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                OFFLINE // AWAITING_BACKEND
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 filter transition-all duration-500">
        
        {/* Left Column - Agents & Systems */}
        <div className="lg:col-span-3 flex flex-col gap-6 min-h-0">
          <section className="flex flex-col gap-3 min-h-0">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-[11px] font-bold text-[#64748b] uppercase flex items-center gap-2">
                <span className="w-1 h-3 bg-[#f27d26]"></span> Agent Delegation
              </h2>
              <span className="text-[9px] font-mono text-[#64748b] bg-white/5 px-2 py-0.5 rounded border border-white/10">Max 3 Sub-Agents</span>
            </div>
            <div className="flex flex-col gap-3">
              {agents.length > 0 ? agents.map(a => <AgentCard key={a.id} agent={a} />) : (
                <div className="p-4 rounded-xl bg-[#0a0d14] border border-[#ffffff10] text-[#64748b] text-xs font-mono text-center flex flex-col items-center justify-center gap-2 relative overflow-hidden h-[300px]">
                  <RefreshCw size={24} className="animate-spin text-[#ffffff10]" />
                  Awaiting agent telemetry...
                </div>
              )}
            </div>
          </section>
          
          <section className="flex flex-col gap-3 min-h-0">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-[11px] font-bold text-[#64748b] uppercase flex items-center gap-2">
                <span className="w-1 h-3 bg-[#eab308]"></span> Market Watch
              </h2>
            </div>
            <div className="bg-[#0a0d14] border border-[#ffffff10] rounded-xl p-3 shadow-xl flex flex-col gap-2 min-h-[160px]">
              {market.length > 0 ? (
                market.map(m => (
                  <div key={m.symbol} className="flex justify-between items-center p-2.5 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white mb-0.5">{m.symbol}</p>
                      <p className="text-[9px] text-[#64748b] uppercase">Spread: {m.spread.toFixed(1)}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-xs font-mono font-bold", m.trend === 'up' ? "text-[#00ff9d]" : "text-red-400")}>{m.price}</p>
                      <p className={cn("text-[9px] font-mono", m.change24h > 0 ? "text-[#00ff9d]" : "text-red-400")}>
                        {m.change24h > 0 ? '+' : ''}{m.change24h.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#64748b] text-[10px] uppercase font-mono gap-2">
                  <Activity size={24} className="opacity-20 animate-pulse" />
                  Awaiting Price Feed...
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-bold text-[#64748b] uppercase mt-2 mb-1 flex items-center gap-2">
              <span className="w-1 h-3 bg-[#38bdf8]"></span> Hermes Three-Layer Memory
            </h2>
            <div className="bg-[#0a0d14] border border-[#ffffff10] rounded-xl p-4 flex flex-col shadow-xl min-h-[220px]">
              {vault ? (
                <>
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-[10px] text-[#64748b] uppercase tracking-widest mb-1">~/.hermes/ directory</p>
                      <p className="text-xl font-bold font-mono text-[#e0e6ed]">SYNCED</p>
                    </div>
                    <div className="text-[10px] text-[#00ff9d] bg-[#00ff9d]/10 border border-[#00ff9d]/20 px-2 py-1 rounded-full font-mono">FTS5 Indexed</div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#94a3b8]">Session Memory (Episodic)</p>
                          <p className="text-[9px] text-[#64748b] mt-0.5">SQLite FTS5 Local DB</p>
                        </div>
                        <span className="font-mono text-[#38bdf8] text-sm">{vault.sessionNotes}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#94a3b8]">Persistent Memory (Semantic)</p>
                          <p className="text-[9px] text-[#64748b] mt-0.5">User Profile & Preferences</p>
                        </div>
                        <span className="font-mono text-[#a855f7] text-sm">{vault.persistentProfiles}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#94a3b8]">Skill Memory (Procedural)</p>
                          <p className="text-[9px] text-[#64748b] mt-0.5">Auto-managed Markdown Skills</p>
                        </div>
                        <span className="font-mono text-[#00ff9d] text-sm">{vault.activeSkills}</span>
                      </div>
                    </div>

                    {vault.recentLearnings && vault.recentLearnings.length > 0 && (
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] uppercase tracking-wider text-[#64748b] mb-2">Recent Skill Generations</p>
                        <ul className="space-y-2">
                          {vault.recentLearnings.map(lesson => (
                            <li key={lesson} className="text-[10px] font-mono text-[#94a3b8] flex items-start p-2 bg-white/5 rounded border border-white/5">
                              <span className="text-[#f27d26] font-bold">[[{lesson}]]</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-[#64748b] text-xs font-mono gap-2">
                    <Database size={24} className="opacity-20 mb-1" />
                    Connecting to Hermes Storage...
                  </div>
              )}
            </div>
          </section>
        </div>

        {/* Middle Column - Signals */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <section className="flex-1 flex flex-col gap-3">
            <h2 className="text-[11px] font-bold text-[#64748b] uppercase mb-1 flex items-center gap-2">
              <span className="w-1 h-3 bg-[#eab308]"></span> Live Signal Stream
            </h2>
            <div className="flex-1 flex flex-col gap-4">
              {signals.length > 0 ? signals.map((sig, i) => (
                <div key={sig.id} className="bg-[#0a0d14] border border-[#ffffff10] rounded-2xl p-6 relative overflow-hidden flex flex-col shadow-2xl transition-all duration-300">
                  {i === 0 && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(242,125,38,0.08),transparent_70%)] pointer-events-none"></div>}
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-mono font-bold text-white flex items-center gap-3">
                          {sig.asset} <span className="text-[#64748b]">/</span> <span className={sig.signal === 'LONG' ? "text-[#00ff9d]" : sig.signal === 'SHORT' ? "text-red-400" : "text-[#94a3b8]"}>{sig.signal}</span>
                        </h3>
                        <p className="text-xs text-[#64748b] font-mono mt-1">SESSION: {sig.session?.toUpperCase() || 'UNKNOWN'} • TF: {sig.timeframe}</p>
                      </div>
                      <div className={cn("px-3 py-1 rounded-full",
                        sig.confidence >= 0.7 ? "bg-[#00ff9d20] border border-[#00ff9d40] text-[#00ff9d]" : 
                        sig.confidence >= 0.5 ? "bg-[#eab30820] border border-[#eab30840] text-[#eab308]" : 
                        "bg-white/5 border border-[#ffffff10] text-[#94a3b8]")}>
                        <span className="text-[10px] font-bold tracking-tighter">CONFIDENCE: {(sig.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center bg-black/40 rounded-xl p-5 font-mono text-[13px] border border-white/5">
                      <pre className="text-[#38bdf8] whitespace-pre-wrap">
{"{\n  "}
<span className="text-[#94a3b8]">"asset":</span> <span className="text-[#f27d26]">"{sig.asset}"</span>{",\n  "}
<span className="text-[#94a3b8]">"signal":</span> <span className="text-[#f27d26]">"{sig.signal}"</span>{",\n  "}
<span className="text-[#94a3b8]">"entry":</span> {sig.entry}{",\n  "}
<span className="text-[#94a3b8]">"sl":</span> {sig.sl}{",\n  "}
<span className="text-[#94a3b8]">"tp":</span> {sig.tp}{",\n  "}
<span className="text-[#94a3b8]">"rr":</span> {sig.rr}{",\n  "}
<span className="text-[#94a3b8]">"reasoning":</span> <span className="text-[#00ff9d]">"{sig.reasoning}"</span>
{"\n}"}
                      </pre>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <div className="text-[10px] text-[#64748b] uppercase">Vault Context</div>
                        <div className="text-xs font-mono font-bold text-[#38bdf8] truncate mt-1">[[{sig.vault_context || 'None'}]]</div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <div className="text-[10px] text-[#64748b] uppercase">Filters Applied</div>
                        <div className="text-xs font-mono font-bold text-[#00ff9d] mt-1">{(sig.filters_passed || []).length} PASS</div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <div className="text-[10px] text-[#64748b] uppercase">Trade Outcome</div>
                        <div className={cn("text-xs font-mono font-bold mt-1 uppercase",
                          sig.outcome === 'win' ? "text-[#00ff9d]" :
                          sig.outcome === 'loss' ? "text-red-400" : "text-[#eab308]"
                        )}>{sig.outcome || 'PENDING'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="flex-1 rounded-2xl border border-dashed border-[#ffffff10] flex flex-col items-center justify-center p-12 text-[#64748b] bg-[#0a0d14]/50 relative overflow-hidden min-h-[400px]">
                  <Activity size={32} className="opacity-20 mb-4" />
                  <p className="text-sm font-mono z-10 text-center">Awaiting incoming signals via MT5 ZeroMQ bridge or Backtest execution.</p>
                  <div className="w-full h-1 bg-[#ffffff05] absolute bottom-0 left-0">
                     <div className="h-full bg-[#f27d26] w-1/4 animate-[ping_2s_infinite]"></div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column - Status/Constraints */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <section className="flex flex-col gap-3">
             <h2 className="text-[11px] font-bold text-[#64748b] uppercase mb-1 flex items-center gap-2">
              <span className="w-1 h-3 bg-[#a855f7]"></span> Auto Trader Protocol
            </h2>
            <div className="bg-[#0a0d14] border border-[#ffffff10] rounded-xl p-4 shadow-xl">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                <div>
                  <h3 className="text-xs font-bold text-white">Autonomous Execution</h3>
                  <p className="text-[10px] text-[#64748b]">Allow Hermes to execute signals automatically</p>
                </div>
                <button 
                  onClick={toggleAutoTrade}
                  disabled={status !== 'connected'}
                  className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50", 
                    autoTrade ? "bg-[#00ff9d]" : "bg-[#64748b]"
                  )}
                >
                  <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    autoTrade ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-[#64748b]">Daily DD Max:</span>
                    <span className="text-white font-mono">-1.20% / 5.0%</span>
                  </div>
                  <div className="w-full bg-[#1e293b] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full" style={{ width: '24%' }}></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs pt-2">
                  <span className="text-[#64748b]">Current Risk:</span>
                  <span className="text-[#00ff9d] font-mono">1.00% / Trade</span>
                </div>
              </div>
            </div>
          </section>
          
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-bold text-[#64748b] uppercase mb-1 flex items-center gap-2">
              <span className="w-1 h-3 bg-[#00ff9d]"></span> Execution Bridge
            </h2>
            <div className="flex-1 bg-[#0a0d14] border border-[#ffffff10] rounded-xl p-4 flex flex-col shadow-xl">
              <div className="flex-1 flex flex-col justify-center items-center text-center py-4">
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center relative mb-3 border", 
                  status === 'connected' ? "border-[#00f2ff20]" : "border-red-500/20")}>
                  {status === 'connected' && <div className="absolute inset-0 rounded-full border border-[#00f2ff40] animate-ping opacity-20"></div>}
                  <Terminal className={cn("w-8 h-8", status === 'connected' ? "text-[#00f2ff]" : "text-red-500")} />
                </div>
                <span className={cn("text-xs mt-2 font-mono", status === 'connected' ? "text-[#00f2ff]" : "text-red-500")}>
                  {status === 'connected' ? 'ZeroMQ Socket: Online' : 'ZeroMQ Socket: Offline'}
                </span>
                <span className="text-[10px] text-[#64748b] uppercase mt-1">Port: 5555</span>
              </div>
              <button disabled={status !== 'connected'} className="w-full py-3 bg-gradient-to-br from-[#f27d26] to-[#ff4e00] text-black text-[11px] font-black uppercase rounded shadow-[0_4px_15px_rgba(242,125,38,0.3)] mt-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:grayscale">
                Immediate Kill Switch
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-3 mt-2">
            <h2 className="text-[11px] font-bold text-[#64748b] uppercase mb-1 flex items-center gap-2">
              <span className="w-1 h-3 bg-[#38bdf8]"></span> R&D Pipeline
            </h2>
            <div className="bg-[#0a0d14] border border-[#ffffff10] rounded-xl p-4 h-[180px] shadow-xl flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] text-[#64748b] uppercase tracking-widest">Equity Curve</p>
                 <span className="text-[10px] text-[#38bdf8] bg-[#38bdf8]/10 border border-[#38bdf8]/20 px-2 py-0.5 rounded font-mono">+7.2%</span>
              </div>
              <div className="flex-1 -mx-2">
                {equityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="dt" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis domain={['auto', 'auto']} tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} width={40} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0a0d14', borderColor: '#ffffff10', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}
                        itemStyle={{ color: '#38bdf8' }}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorEq)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#64748b] text-[10px] uppercase tracking-wider">
                    Awaiting Sync...
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer Live Ticker */}
      <footer className="h-8 mt-4 flex items-center justify-between bg-[#0a0d14] border-y border-[#ffffff10] px-4 -mx-4 md:-mx-6 text-[10px] font-mono">
        <div className="flex gap-6 whitespace-nowrap overflow-hidden pr-4">
          <span className="text-[#f27d26]">XAUUSD: 2318.52 <span className="text-[#00ff9d]">+0.42%</span></span>
          <span className="text-[#94a3b8]">EURUSD: 1.0842 <span className="text-red-400">-0.05%</span></span>
          <span className="text-[#94a3b8]">BTCUSD: 64,210 <span className="text-[#00ff9d]">+1.2%</span></span>
          <span className="text-[#94a3b8]">OLLAMA_TEMP: 42°C</span>
          <span className="text-[#94a3b8]">FTS5_LATENCY: 42ms</span>
          <span className="text-[#f27d26]">HERMES_BRAIN: {status === 'connected' ? 'LOGGED TO OBSIDIAN' : 'OFFLINE'}</span>
        </div>
        <div className="font-bold whitespace-nowrap text-right">
          {status === 'connected' ? <span className="text-[#00ff9d]">● SYSTEM LIVE</span> : <span className="text-red-500">● SYSTEM OFFLINE</span>}
        </div>
      </footer>

      {/* Floating Chat Button */}
      <div className="fixed bottom-12 right-6 z-50">
        {isChatOpen && (
          <div className="absolute bottom-16 right-0 w-[350px] sm:w-[400px] h-[500px] bg-[#0a0d14] border border-[#ffffff10] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
            <div className="p-4 border-b border-[#ffffff10] flex justify-between items-center bg-[#05070a]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#f27d26] to-[#ff4e00] rounded-lg shadow-[0_0_10px_rgba(242,125,38,0.2)] flex items-center justify-center">
                  <span className="text-black font-bold text-lg leading-none mt-0.5">H</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Hermes Orchestrator</h3>
                  <p className="text-[10px] text-[#00ff9d] font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse"></span>
                    ONLINE
                  </p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-[#64748b] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex flex-col max-w-[85%]", m.role === 'user' ? "self-end items-end" : "self-start items-start")}>
                  <div className={cn("p-3 rounded-2xl text-sm whitespace-pre-wrap font-sans", 
                    m.role === 'user' ? "bg-white/10 text-white rounded-br-sm" : "bg-[#f27d26]/10 border border-[#f27d26]/20 text-[#e0e6ed] rounded-bl-sm"
                  )}>
                    {m.content}
                  </div>
                  <span className="text-[9px] text-[#64748b] mt-1 font-mono">{format(m.timestamp, 'HH:mm')}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-[#ffffff10] bg-[#05070a]">
              <div className="relative">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Tell Hermes what to execute..." 
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-[#f27d26]/50 transition-colors"
                />
                <button type="submit" disabled={!chatInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#64748b] hover:text-[#f27d26] disabled:opacity-50 transition-colors">
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        )}
        
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center text-black shadow-[0_4px_20px_rgba(242,125,38,0.4)] transition-all hover:scale-105",
            isChatOpen ? "bg-[#e0e6ed] shadow-none" : "bg-gradient-to-br from-[#f27d26] to-[#ff4e00]"
          )}
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>
    </div>
  );
}

