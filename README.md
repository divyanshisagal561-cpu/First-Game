# 🏎️ Turbo Racer

> A fast-paced 2D arcade racing game built with **HTML5 Canvas, Vanilla JavaScript, and CSS**.

Turbo Racer is my **first car game project**, created to practice and demonstrate front-end development, JavaScript game logic, animation, collision detection, user input handling, and browser-based game development.

The game challenges players to control a racing car, avoid incoming vehicles, survive as long as possible, and beat their highest score.

---

## 🎮 Game Preview

**Turbo Racer** features a modern arcade-style interface with a dark racing theme, animated road, multiple enemy vehicles, score tracking, sound effects, and a game-over system.

---

## ✨ Features

* 🏎️ **2D Arcade Racing Gameplay**
* 🛣️ Animated scrolling road
* 🚗 Multiple enemy vehicle types
* 💥 Crash and particle effects
* 📈 Increasing speed and difficulty
* 🏆 Persistent high-score system
* 🔊 Sound effects with mute/unmute control
* ⌨️ Keyboard controls
* 🎯 Collision detection
* 🔄 Restart / Play Again functionality
* 🎨 Responsive and modern UI

---

## 🕹️ Controls

| Control         | Action               |
| --------------- | -------------------- |
| `←` / `A`       | Move Left            |
| `→` / `D`       | Move Right           |
| `SPACE`         | Start / Restart Game |
| 🔊 Sound Button | Toggle Sound         |

The game also supports **touch-based steering** on mobile devices.

---

## 🚘 Enemy Vehicles

The game includes different types of vehicles with different characteristics:

* 🚙 **Sedan**
* 🏎️ **Sports Car**

Each vehicle has its own size, color, and speed multiplier, creating variation in gameplay.

---

## 📊 Scoring & Difficulty

The score increases as the player travels further down the road.

As the score increases:

* 🚀 Game speed increases
* 🚗 Enemy vehicles spawn more frequently
* 🎯 Gameplay becomes progressively more challenging

## The game also saves the player's **best score using browser `localStorage`**, so the high score remains available after refreshing the page.

## 🛠️ Technologies Used

* **HTML5** — Game structure and Canvas element
* **CSS3** — UI design, animations, responsive layout
* **JavaScript (ES6+)** — Game logic and interactions
* **HTML5 Canvas API** — Rendering the game
* **Web Audio API** — Sound effects
* **LocalStorage API** — High-score persistence

---

## 📁 Project Structure

```text
Turbo-Racer/
│
├── index.html
├── style.css
├── script.js
└── README.md
```

### `index.html`

Contains the game's structure, Canvas, HUD, start screen, controls guide, score displays, and game-over screen.

### `style.css`

Controls the visual design of the game, including the racing interface, HUD, buttons, overlays, animations, colors, typography, and responsive layout.

### `script.js`

Contains the main game engine and logic, including:

* Player movement
* Enemy spawning
* Collision detection
* Scoring
* Difficulty progression
* Particle effects
* Sound effects
* High-score storage
* Game states
* Keyboard and touch controls
* Game loop and rendering

---

## 💡 How the Game Works

The game uses a continuous **game loop** to update and render the game.

The basic flow is:

```text
Player Input
     ↓
Player Movement
     ↓
Enemy Spawning
     ↓
Enemy Movement
     ↓
Collision Detection
     ↓
Score & Difficulty Update
     ↓
Canvas Rendering
     ↓
Repeat
```

The game uses `requestAnimationFrame()` to continuously update and render gameplay.

---

## 📌 Project Status

🟢 **Completed — Version 1.0**

This is my **first car game project**, created as a learning and portfolio project while developing my programming and web-development skills.

---

## 👩‍💻 Author

**Divyanshi Sagal**

First-year BCA AI & Data Science student
Interested in **Python, SQL, AI, Data Science, and Software Development**.

---

## ⭐ Support

If you like this project, consider giving the repository a ⭐ on GitHub!


