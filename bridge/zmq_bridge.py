import zmq
import time
import json
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

def run_bridge():
    context = zmq.Context()
    socket = context.socket(zmq.REP)
    socket.bind("tcp://*:5555")
    
    logging.info("ZeroMQ Bridge online. Listening on port 5555 for MT5 REQ connections...")
    
    # In a full system, you would pull this queue from Hermes Agent
    mock_pending_signals = [] 
    
    while True:
        try:
            # Wait for POLL request from MT5 EA's OnTimer()
            message = socket.recv_string()
            
            if message == "POLL_SIGNAL":
                if mock_pending_signals:
                    sig = mock_pending_signals.pop(0)
                    socket.send_string(json.dumps(sig))
                    logging.info(f"Dispatched signal to MT5: {sig}")
                else:
                    socket.send_string("NULL")
            else:
                logging.info(f"Received unknown command: {message}")
                socket.send_string("ACK")
                
        except Exception as e:
            logging.error(f"Error in ZMQ bridge: {e}")

if __name__ == "__main__":
    run_bridge()
