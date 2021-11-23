# Ping

An audio-only video game.

## Development

Setup requires:

 - Node.js (e.g. using `nvm`)
 - Python 3
 - `git clone --recurse-submodules git@github.com:DouglasOrr/Ping.git`

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Basics:

```bash
./build --dev
http://localhost:8000
http://localhost:8000/?autoreload=true&debug=true&level=1&speed=100
```

Further development:

```bash
./build
npm run check
```

## Reference

 - Sox (`apt install sox libsox-fmt-mp3`) - plays MP3 from command line
