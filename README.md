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

 - ZapSplat free sound effects, [website](https://www.zapsplat.com/)
 - Audacity audio editor, [website](https://www.audacityteam.org/)
 - MDN Web docs, Web Audio API, [website](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
 - Sox (`apt install sox libsox-fmt-mp3`) - plays MP3 from command line
 - How to make a seamless loop in Audacity, John French, [blog](https://gamedevbeginner.com/create-looping-sound-effects-for-games-for-free-with-audacity/)
 - Vintage Voice Effect in Audacity (Old Radio Effect), Mike Russel, [youtube](https://youtu.be/ko9hRYx1lF4)
