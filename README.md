# FAD

An audio-only video game, developed for [GitHub Game Off 2021](https://itch.io/jam/game-off-2021).

## Development

Setup requires:

 - Node.js (e.g. using `nvm`)
 - Python 3
 - `git clone --recurse-submodules git@github.com:DouglasOrr/FAD.git`

```shell
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Basics:

```shell
./build --dev
http://localhost:8000
http://localhost:8000/?autoreload=true&debug=true&level=1&speed=100
```

Further development:

```shell
./build
npm run check
```

## Reference

 - ZapSplat free sound effects, [website](https://www.zapsplat.com/)
 - Audacity audio editor, [website](https://www.audacityteam.org/)
 - MDN Web docs, Web Audio API, [website](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
 - Sox (`apt install sox libsox-fmt-mp3`) - plays MP3 from command line
