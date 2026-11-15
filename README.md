# Geometry Dash Mini

A fast-paced browser platform game inspired by Geometry Dash, with four themed stages.

## How to play

- Press Space, W, or the Up arrow to jump.
- Jump over floor spikes and avoid ceiling spikes.
- Avoid moving enemies; after a death burst, continue from the current stage checkpoint with the score preserved.
- Star power blinks and grants three seconds of protection from enemies and spikes.
- While star-powered, hitting an enemy destroys it, triggers an explosion, and awards 100 points.
- Collect items for temporary speed, slow, shrink, or star effects.
- Earn 500 points for a speed-up item and 100 points for every other item. Pickup points float above the player.
- Reach each randomly positioned, enlarged portal to advance. The first portal appears after 10 seconds; missed portals return every 3 seconds.
- Entering a portal awards 1,000 points.
- Stage transitions show a three-second stage-number countdown while the BGM continues with audio cues.
- Each stage uses a different background pattern, and collisions trigger a particle burst.
- Clear all four stages to reach the victory screen.
- View your saved Top 10 scores from the start or end screen; Top 3 runs are highlighted at game over.

## Code layout

- `stage-config.js`: central stage themes and difficulty settings.
- `game.js`: gameplay state, physics, collisions, and progression.
- `renderer.js`: canvas drawing and floating score labels.
- `audio.js`: synthesized music and sound effects.
- `leaderboard.js`: persistent Top 10 score storage and rendering.
- `item-score.js`: points awarded by each item type.
- `enemies.js`: moving enemy creation, motion, and collision checks.
- `death-effects.js`: player death-burst particle simulation.

## Run locally

From this folder, start a simple web server:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 in a browser.
