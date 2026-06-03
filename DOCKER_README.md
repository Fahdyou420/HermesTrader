# Running the Hermes Trading Backend in Docker

We have configured everything so that your Python systems can run entirely inside Docker without you needing to install Python or handle `pip install` issues locally!

## 1. Prerequisites
- Docker Desktop installed (or Docker Engine on Linux)
- Docker Compose

## 2. Start the Backend Services
In your terminal, run the following command from the root of this project:

```bash
docker-compose up --build -d
```

This will spin up two separate containers:
1. `hermes_trader_api`: The Flask API listening on `localhost:5000` (provides data to this React dashboard).
2. `hermes_trader_zmq`: The ZeroMQ execution bridge listening on `localhost:5555` (listens for the MT5 EA).

## 3. Verify it's working
You can check the logs for the API and ZMQ bridge using:
```bash
docker-compose logs -f
```

## 4. MT5 Connection
Since we updated the host bindings inside the Python code to allow `0.0.0.0` and `*`:
- Your MetaTrader 5 HTTP EA (`Hermes_MT5_HTTP.mq5`) will still poll `http://127.0.0.1:5000` from your host operating system and correctly hit the Docker container.
- Your MetaTrader 5 ZMQ EA (`Hermes_MT5_ZMQ.mq5`) will still connect to `tcp://127.0.0.1:5555` and hit the containerized ZMQ bridge!
