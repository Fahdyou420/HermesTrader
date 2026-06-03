from flask import Flask, jsonify, request
from flask_cors import CORS
import datetime
import time
import uuid

app = Flask(__name__)
# Enable CORS so the React frontend can fetch data without blocking
CORS(app)

# In-memory queue holding trades that need to be read by the MT5 EA
pending_mt5_signals = []

@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "message": "Hermes backend is running"}), 200

@app.route('/api/signals')
def get_signals():
    # In a real environment, this reads from ~/.hermes/state.db 
    return jsonify([
        {
            "id": "sig_live_1",
            "asset": "XAUUSD",
            "timeframe": "M15",
            "session": "London",
            "signal": "LONG",
            "confidence": 0.82,
            "entry": 2318.50,
            "sl": 2305.00,
            "tp": 2345.50,
            "rr": 2.0,
            "reasoning": "SMC CHoCH confirmed on M15. London open liquidity sweep into H1 demand zone. ATR within threshold (< 15%).",
            "filters_passed": ["atr_ok", "spread_ok", "session_ok", "choch_confirmed"],
            "filters_failed": [],
            "vault_context": "CHoCH_bullish_M15_template",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "outcome": "pending"
        }
    ])

@app.route('/api/agents')
def get_agents():
    # Reads current active processes
    return jsonify([
        {
            "id": "agent_main",
            "name": "Hermes Brain",
            "type": "Main Orchestrator",
            "role": "ReAct Loop & Strategy",
            "status": "processing",
            "lastAction": "Evaluating XAUUSD M15 SMC Setup against FTS5 history",
            "toolset": ["web", "memory", "delegation", "skills"],
            "uptime": "1d 05h"
        },
        {
            "id": "agent_sub1",
            "name": "Qwen Executor",
            "type": "Sub-Agent",
            "role": "Compute & Backtest",
            "status": "idle",
            "lastAction": "Awaiting compute tasks",
            "toolset": ["code_execution", "terminal"],
            "uptime": "1d 05h"
        }
    ])

@app.route('/api/vault')
def get_vault():
    # Simulated metrics from the ~/.hermes/ directory
    return jsonify({
        "sessionNotes": 142,
        "persistentProfiles": 2,
        "activeSkills": 12,
        "tags": {
            "signals": 45,
            "lessons": 8,
            "patterns": 5,
            "backtests": 12
        },
        "recentLearnings": [
            "lesson_spread_spike_london_open",
            "fail_mode_choch_without_sweep"
        ]
    })

@app.route('/api/equity')
def get_equity():
    # Return equity curve points
    return jsonify([
        { "dt": '05-01', "balance": 100000, "dd": 0 },
        { "dt": '05-08', "balance": 101200, "dd": -0.5 },
        { "dt": '05-15', "balance": 100800, "dd": -1.2 },
        { "dt": '05-22', "balance": 102400, "dd": 0 },
        { "dt": '05-29', "balance": 104100, "dd": 0 },
        { "dt": '06-05', "balance": 102900, "dd": -1.5 },
        { "dt": '06-12', "balance": 105600, "dd": -0.2 },
    ])

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_msg = data.get('message', '')
    
    # Process with local agent logic
    # For simulation, inject a mock trade to be fetched by the MT5 EA
    if "buy" in user_msg.lower() or "long" in user_msg.lower():
        pending_mt5_signals.append({
            "action": "EXECUTE",
            "symbol": "XAUUSD",
            "type": "LONG",
            "sl": 2305.00,
            "tp": 2345.50
        })
        
    reply = f"Acknowledged. I am intercepting '{user_msg}' via the local Python API. If applicable, signal has been sent to the MT5 bridge queue."
    return jsonify({"reply": reply})

@app.route('/api/mt5/next_signal', methods=['GET'])
def get_mt5_signal():
    """Endpoint explicitly for the Hermes_MT5_HTTP.mq5 EA to poll for jobs."""
    if pending_mt5_signals:
        next_signal = pending_mt5_signals.pop(0)
        return jsonify(next_signal)
    return jsonify({})

if __name__ == '__main__':
    print("--------------------------------------------------")
    print("Hermes Dashboard API Server Starting On Port 5000")
    print("Accepting connections for the React frontend...")
    print("--------------------------------------------------")
    app.run(port=5000, debug=True)
