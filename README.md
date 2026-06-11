# IIT DELHI SIMULATOR

A browser-based RPG campus-life simulator. Survive one academic year (2 semesters, 40 in-game days) at IIT Delhi: lectures at LHC, research at the Main Building, meals at Rajdhani, sports at Mittal, hostel nights, exam boss battles, and the RDV festival at the OAT.

## How to run (Local)

No build step, no server dependencies required for local play.

1. Keep the folder structure intact:
   ```
   iitd-simulator/
   ├── index.html
   ├── style.css
   ├── README.md
   ├── iit-delhi.jpg
   ├── audio/
   │   └── ... (audio assets)
   └── js/
       ├── data.js
       ├── audio.js
       ├── world.js
       ├── npc.js
       ├── battle.js
       └── main.js
   ```
2. Double-click `index.html` to open it directly in any modern desktop browser.
3. Click **BEGIN SEMESTER 1**. Headphones recommended.

Alternatively, you can run it via a local Python web server:
```bash
python3 -m http.server 8080
```
Then navigate to `http://localhost:8080` in your browser.

## Deployment & Hosting

This project uses strictly relative, portable paths and is 100% static. It is ready to be hosted as-is on any static hosting provider. It can be served from a root domain (`https://example.com/`) or a subdirectory (`https://example.com/iitd-simulator/`).

### GitHub Pages
1. Push the repository to GitHub.
2. Go to **Settings > Pages**.
3. Select the branch (e.g., `main`) and root folder (`/`).
4. Save. Your game will be live in minutes.

### Netlify / Vercel / Cloudflare Pages
1. Drag and drop the `iitd-simulator/` folder into their web UI, OR link your Git repository.
2. No build command is required.
3. Set the publish directory to the root of the project (or `/` if deploying the folder contents).

## Controls

| Key | Action |
|---|---|
| WASD / Arrow keys | Move |
| Shift (hold) | Run (drains a little energy) |
| E | Interact (doors, people, items) / advance dialogue |
| Q | Quest log |
| M | Mute / unmute |
| 1–4 | Battle moves (during boss fights) |
| Esc | Close menus |

## How to win

- Finish the year with **CGPA above 7**, and **Health, Energy and Fun above 0**.
- Exam bosses spawn at **LHC** on days **5, 10, 14, 20 and 40**. Skipping one costs heavy CGPA. Your battle "composure" is built from the day's Energy and Health — fight rested and fed.
- Sleep at the **hostel** to end the day. Staying out past midnight means collapsing: lost health, poor rest.
- **RDV** runs days **30–32 from 5 PM** at the **OAT** — lights, music, crowds, confetti, and the biggest Fun boost in the game.
- Stat pressure is real: Fun decays daily (burnout drains CGPA at zero), lectures and research cost Energy, and Health only comes from food and Mittal.

## The campus

Six hand-drawn locations modeled on the real places: the sandstone **Main Building**, the curved glass **LHC**, a twin-tower brick **hostel**, **Rajdhani** under its string lights, the **OAT** amphitheatre, and the neon-signed **Mittal Sports Complex** — connected by avenues, walking paths, lamps and a few hundred trees. 14 NPCs follow daily schedules (classes in the morning, Rajdhani in the evening), hand out side quests, and the whole campus shifts through a day/night cycle with dusk tints, lamp glow and crickets.

Everything — graphics, sprites, and maps — is generated procedurally in code. The audio engine uses high-fidelity CC0-licensed HTML5 audio samples to bypass strict browser CORS policies, allowing it to remain completely serverless.
