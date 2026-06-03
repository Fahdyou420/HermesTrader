//+------------------------------------------------------------------+
//|                                               Hermes_MT5_ZMQ.mq5 |
//|                                   ZeroMQ Execution Bridge for EA |
//|                          Requires MQL-ZMQ Native DLLs installed. |
//+------------------------------------------------------------------+
#property copyright "Hermes Trade"
#property version   "1.00"
#property strict

// NOTE: You must install a ZeroMQ library for MQL5 to run this!
// e.g., https://github.com/dingtian-ca/mql-zmq

#include <Zmq/Zmq.mqh>

input string ZmqAddress = "tcp://127.0.0.1:5555";
Context zmqContext;
Socket  zmqSocket;

void OnInit()
{
    Print("Starting ZeroMQ Hermes Bridge on ", ZmqAddress);
    zmqContext = new Context("Hermes/MT5");
    zmqSocket  = new Socket(zmqContext, ZMQ_REQ); // REQ/REP pattern
    
    zmqSocket.setReceiveTimeOut(100); // Non-blocking
    zmqSocket.connect(ZmqAddress);
    
    EventSetTimer(1);
}

void OnDeinit(const int reason)
{
    delete zmqSocket;
    delete zmqContext;
    EventKillTimer();
}

void OnTimer()
{
    // Request a signal
    ZmqMsg req("POLL_SIGNAL");
    zmqSocket.send(req);
    
    // Check for reply
    ZmqMsg rep;
    if(zmqSocket.recv(rep))
    {
        string data = rep.getData();
        if(data != "" && data != "NULL")
        {
            Print("HERMES COMMAND: ", data);
            // Execute trade logic here
        }
    }
}
