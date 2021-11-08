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

Ready to go:

```bash
./build
./build --dev
npm run check
```

## Reference

 - Sox (`apt install sox libsox-fmt-mp3`) - plays MP3 from command line
