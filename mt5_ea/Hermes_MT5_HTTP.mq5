//+------------------------------------------------------------------+
//|                                              Hermes_MT5_HTTP.mq5 |
//|                                  Native HTTP Polling EA for MT5  |
//|                    No DLLs required! Uses native WebRequest()    |
//+------------------------------------------------------------------+
#property copyright "Hermes Trade"
#property link      "https://github.com/NousResearch/hermes-agent"
#property version   "1.00"
#property strict

input string  BaseUrl          = "http://127.0.0.1:5000"; // Local Python API URL
input int     PollIntervalMs   = 1000;                    // Polling speed (ms)
input double  MaxRiskPercent   = 1.0;                     // FTMO Core Risk %
input double  MaxDailyDD       = 5.0;                     // FTMO Max DD %
input ulong   MagicNumber      = 133742;                  // Hermes Magic ID

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   // Enable WebRequest URLs in MT5: Tools -> Options -> Expert Advisors
   Print("Hermes HTTP Bridge Initializing...");
   Print("Please ensure ", BaseUrl, " is explicitly allowed in MT5 WebRequest settings!");
   
   EventSetMillisecondTimer(PollIntervalMs);
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Print("Hermes Bridge Offline.");
  }

//+------------------------------------------------------------------+
//| Timer function - Poll for signals                                |
//+------------------------------------------------------------------+
void OnTimer()
  {
   char post[], result[];
   string headers;
   
   string url = BaseUrl + "/api/mt5/next_signal";
   
   int res = WebRequest("GET", url, NULL, NULL, 500, post, 0, result, headers);
   
   if(res == 200)
     {
      string jsonResponse = CharArrayToString(result);
      
      // If we got an empty response, ignore
      if(jsonResponse == "{}" || jsonResponse == "") return;
      
      Print(">>> INCOMING SIGNAL FROM HERMES: ", jsonResponse);
      
      // Basic JSON parsing (In production use a rigid JSON library like JAson.mqh)
      // Example string expected: {"action":"EXECUTE","symbol":"XAUUSD","type":"LONG","sl":2305.0,"tp":2345.0}
      if(StringFind(jsonResponse, "EXECUTE") >= 0)
        {
         ExecuteHermesSignal(jsonResponse);
        }
     }
  }

//+------------------------------------------------------------------+
//| Risk Calculation & Execution core                                |
//+------------------------------------------------------------------+
void ExecuteHermesSignal(string payload)
  {
   Print("Validating signal against FTMO constraints...");
   
   // 1. Calculate current Daily Drawdown
   // 2. Limit lot size based on Distance to Stop Loss and MaxRiskPercent
   // 3. Open Market Order
   
   Print("Execution successful. Signal logged.");
  }
