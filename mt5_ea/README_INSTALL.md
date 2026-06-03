# MetaTrader 5 (MT5) Integration Guide for Hermes
Integrating local Python agents with MetaTrader 5 requires an Expert Advisor (EA) running inside the MT5 terminal. 

We have generated **two** different EAs for your setup, choose the one that fits you best:

## 1. The HTTP EA (Recommended, Easiest)
File: `Hermes_MT5_HTTP.mq5`

The HTTP version is dramatically easier to install because it uses MetaTrader's native `WebRequest()` API rather than external C++ DLLs. It polls your local Flask server on `127.0.0.1:5000` for the latest pending signal.

### Installation Steps (HTTP):
1. Open MetaTrader 5.
2. Press `F4` to open the MetaEditor.
3. In the Navigator, open `Experts`, right click and create a new file, paste the contents of `Hermes_MT5_HTTP.mq5` into it.
4. Hit **Compile** (F7).
5. **CRUCIAL**: In MT5 go to `Tools -> Options -> Expert Advisors` and check **"Allow WebRequest for listed URL"**, then add `http://127.0.0.1:5000` to the whitelist.
6. Drag and drop the script onto a chart. Auto-trading must be enabled.

## 2. The ZeroMQ EA (Advanced, Lowest Latency)
File: `Hermes_MT5_ZMQ.mq5`

The ZMQ version uses TCP sockets for microsecond latency but requires manual installation of C++ ZMQ libraries into MT5.

### Installation Steps (ZMQ):
1. Download a ZMQ library built for MQL5 (e.g. `mql-zmq` from Github).
2. Follow the library's instructions to place `.dll` files in `MQL5/Libraries/` and `.mqh` files in `MQL5/Include/`.
3. Paste `Hermes_MT5_ZMQ.mq5` into MetaEditor and compile.
4. Allow DLL imports in MT5 settings.
5. Attach to chart.

## How it Bridges data
Your Flask server (`dashboard/app.py`) holds a memory queue of pending jobs dispatched by Hermes/Qwen. 
When MT5 polls the Python API (every 1 second), the backend serves the queue, MT5 executes the trades on your FTMO account, and records the execution locally!
