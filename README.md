# Mosquito Blood Hunt

A 3D game built with Three.js where you play as a mosquito trying to survive by sucking human blood.

## Game Overview

In this game, you control a mosquito flying around a small village. Your blood level constantly decreases over time, and you must suck blood from humans to replenish it. However, humans will remember you after being bitten and will try to swat you if you approach them again. If you try to stay safe by flying high above them, they'll throw rocks at you! You'll need to balance your need for blood with the increasing danger from angry humans!

## How to Play

1. Open `index.html` in a web browser to start the game
2. Click the "Start Game" button to begin
3. Use the following controls to play:
   - **Arrow Left/Right**: Turn left/right
   - **Arrow Up/Down**: Fly forward/backward
   - **W/S**: Fly up/down
   - **Spacebar**: Suck blood (when near a human)

## Game Mechanics

- Your blood level starts at 50% and constantly decreases by 1% every second
- If your blood level reaches 0%, you die and the game is over
- Sucking blood from humans increases your blood level
- Your mosquito's speed and size are affected by your blood level (faster and bigger when full)
- Humans will remember you after being bitten (indicated by a red ring above their head)
- Humans with memory will attack you on sight from a greater distance
- Getting hit by a human causes you to lose 15% blood
- Getting hit by a thrown rock causes you to lose 10% blood
- Humans who remember you will throw rocks if you fly too high above them
- The game maintains exactly 5 humans at all times
- New humans have a chance to remember you if you've bitten others before

## Technical Details

This game is built using:
- Three.js for 3D rendering
- Vanilla JavaScript for game logic
- HTML/CSS for UI elements

### Performance Optimizations

- **Frustum Culling**: The game implements frustum culling to improve performance by only rendering objects that are within the camera's view frustum. This reduces unnecessary rendering of off-screen objects like humans, rocks, and impact effects.

## Setup

No build process is required. Simply open the `index.html` file in a modern web browser to play the game.

## Deployment

The game is deployed on GitHub Pages and can be accessed at: https://clivemchd.github.io/fly-2/

## Credits

Created as a fun project to demonstrate Three.js capabilities. All 3D models are created programmatically using Three.js geometry. 