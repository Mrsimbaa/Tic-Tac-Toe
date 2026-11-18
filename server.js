
/* Jayden German Dairsow */

// Import the necessary modules
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

// Create the Express application
const app = express();

// Create the HTTP server
const server = http.createServer(app);

// Create the WebSocket server
const wss = new WebSocket.Server({ server });

// Serve frontend files from the public folder
app.use(express.static("public"));

// Password required to join the game
const GAME_PASSWORD = "secret123";

// Shared game state
let gameState = {
    board: Array(9).fill(""),
    currentPlayer: "X",
    winner: null
};

// Track connected players
let players = {
    X: null,
    O: null
};

// Send updated game state to all connected clients
function broadcastState() {

    const payload = JSON.stringify({
        type: "state",
        gameState
    });

    wss.clients.forEach(client => {

        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// Check whether a player has won
function checkWinner(board) {

    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];

    for (const [a, b, c] of lines) {

        if (
            board[a] &&
            board[a] === board[b] &&
            board[a] === board[c]
        ) {
            return board[a];
        }
    }

    return null;
}

// Handle new WebSocket connections
wss.on("connection", ws => {

    // Initialize information for this connection
    ws.playerName = "";
    ws.role = "spectator";
    ws.authenticated = false;

    // Send the current game state to the new client
    ws.send(JSON.stringify({
        type: "state",
        gameState
    }));

    // Listen for incoming messages
    ws.on("message", message => {

        const data = JSON.parse(message);

        // HANDLE LOGIN
        if (data.type === "login") {

            if (data.password !== GAME_PASSWORD) {

                ws.send(JSON.stringify({
                    type: "error",
                    message: "Invalid password"
                }));

                return;
            }

            ws.playerName = data.name;
            ws.authenticated = true;

            // Assign player roles
            if (!players.X) {
                players.X = ws;
                ws.role = "X";

            } else if (!players.O) {
                players.O = ws;
                ws.role = "O";

            } else {
                ws.role = "spectator";
            }

            // Tell the browser its role
            ws.send(JSON.stringify({
                type: "role",
                role: ws.role,
                name: ws.playerName
            }));

            return;
        }

        // Ignore messages from unauthenticated clients
        if (!ws.authenticated) {
            return;
        }

        // HANDLE PLAYER MOVES
        if (data.type === "place") {

            // Debugging statements
            console.log("Server received move:", data.index);
            console.log("Player role:", ws.role);
            console.log("Current turn:", gameState.currentPlayer);

            const index = data.index;

            // Only X and O can play
            if (ws.role !== "X" && ws.role !== "O") {
                return;
            }

            // Check whose turn it is
            if (ws.role !== gameState.currentPlayer) {
                return;
            }

            // Prevent moves after someone wins
            if (gameState.winner) {
                return;
            }

            // Check that the index is valid
            if (
                !Number.isInteger(index) ||
                index < 0 ||
                index > 8
            ) {
                return;
            }

            // Prevent overwriting occupied squares
            if (gameState.board[index] !== "") {
                return;
            }

            // Place the player's piece
            gameState.board[index] = gameState.currentPlayer;

            // Check for a winner
            const winner = checkWinner(gameState.board);

            if (winner) {
                gameState.winner = winner;
            } else {
                // Switch turns
                gameState.currentPlayer =
                    gameState.currentPlayer === "X" ? "O" : "X";
            }

            // Send updated board to all players
            broadcastState();
        }

        // HANDLE GAME RESET
        if (data.type === "reset") {

            gameState = {
                board: Array(9).fill(""),
                currentPlayer: "X",
                winner: null
            };

            broadcastState();
        }

    }); // End message listener

    // HANDLE DISCONNECTED CLIENTS
    ws.on("close", () => {

        if (players.X === ws) {
            players.X = null;
        }

        if (players.O === ws) {
            players.O = null;
        }

    });

}); // End connection listener

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});