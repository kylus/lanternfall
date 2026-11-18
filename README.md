# lanternfall

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/kylus/lanternfall/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/kylus/lanternfall/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Lanternfall is a small survival game of light against shadow, in plain JavaScript and one canvas, with no library, no build step and no network. You carry the last lantern through a dark hall. It lights the floor and lets you see the shadows; embers they drop refill it; waves of five kinds of shadow come until dawn, with the Eclipse waiting at waves 5 and 10. Between waves you take one of three flames (upgrades), so every run is a different build. WASD to move, mouse to aim and hold to shoot, Space to dash, P to pause.

Original everything: the idea, the names, the art (drawn in code) and the sound (synthesised with the Web Audio API, no audio files). The rules (`game/src/world.js`) hold no drawing and no randomness but a seeded generator, so a seed always plays the same game: the screenshots are real frames of the autopilot (`game/src/bot.js`) playing those rules.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=mp1vhw1y&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
