PROJECT ZERO 0.6.2 - WINDOWS DESKTOP SETUP

IMPORTANT: This folder is the game project. It is not the installed app yet.

FIRST-TIME SETUP
1. Install Node.js LTS from https://nodejs.org/ (choose the LTS download).
2. Restart your computer after installing Node.js.
3. Open this extracted Project_Zero_Desktop folder.
4. Click the folder address bar in File Explorer, type cmd, and press Enter.
5. In the black Command Prompt window, type: npm install
6. Wait for it to finish. Then type: npm start
7. Project Zero should open in its own desktop window.

TO BUILD A WINDOWS INSTALLER
1. In the same Command Prompt window, type: npm run dist
2. Wait for the build to finish.
3. Open the new dist folder.
4. Run the PROJECT ZERO Setup installer inside it.

AFTER INSTALLING
You can launch PROJECT ZERO from the Windows Start menu or desktop shortcut.
You do not need to run npm start every time after installing the game.

TROUBLESHOOTING
- If 'npm' is not recognized, install Node.js LTS and restart Windows.
- Keep the Command Prompt window open while npm install / npm start runs.
- The first npm install needs an internet connection.
- This package has not been compiled into an installer yet.
