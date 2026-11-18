
/* Jayden German Dairsow */

// 1. DOM ELEMENTS
const boardCanvas = document.getElementById("board");
const ctx = boardCanvas.getContext("2d");

const statusElement = document.getElementById("status");
const roleElement = document.getElementById("role");

const resetBtn = document.getElementById("resetBtn");
const joinBtn = document.getElementById("joinBtn");

const nameInput = document.getElementById("nameInput");
const passwordInput = document.getElementById("passwordInput");

// Game configuration
const CELL_SIZE = 200;

// Connect to the WebSocket server
const protocol =
    window.location.protocol === "https:" ? "wss:" : "ws:";

const ws = new WebSocket(
    `${protocol}//${window.location.host}`
);

// State received from server
let gameState = null;
let role = "spectator";

// 3. INITIALIZATION AND EVENT LISTENERS
drawBoard();

boardCanvas.addEventListener("click", handleClick);

// 4. DRAW BOARD FUNCTION
function drawBoard() {

    ctx.clearRect(
        0, 0,
        boardCanvas.width,
        boardCanvas.height
    );

    drawGrid();
    drawPieces();

    if (!gameState) {
        statusElement.textContent = "Waiting for game...";
        return;
    }

    if (gameState.winner) {
        statusElement.textContent =
            `Player ${gameState.winner} Wins!`;
    } else {
        statusElement.textContent =
            `Player ${gameState.currentPlayer}'s Turn`;
    }
}

// 5. HANDLE CLICK FUNCTION — MULTIPLAYER
function handleClick(event) {

    console.log("Canvas clicked!");
    console.log("My role is:", role);

    // Only X and O can make moves
    if (role !== "X" && role !== "O") {
        return;
    }

    // Find mouse position relative to canvas
    const rect = boardCanvas.getBoundingClientRect();

    const mouseX = (event.clientX - rect.left) *
        (boardCanvas.width / rect.width);

    const mouseY = (event.clientY - rect.top) *
        (boardCanvas.height / rect.height);

    // Convert mouse coordinates into row and column
    const col = Math.floor(mouseX / CELL_SIZE);
    const row = Math.floor(mouseY / CELL_SIZE);

    // Prevent clicking outside the board
    if (row < 0 || row > 2 || col < 0 || col > 2) {
        return;
    }

    // Convert row and column into array index
    const index = row * 3 + col;

    // DEBUGGING: Check outgoing move
    console.log("Sending move:", index);
    console.log("WebSocket status:", ws.readyState);

    // Send the move to the server
    ws.send(JSON.stringify({
        type: "place",
        index
    }));
}

// 6. RECEIVE MESSAGES FROM SERVER
ws.onmessage = event => {

    const data = JSON.parse(event.data);

    if (data.type === "state") {
        gameState = data.gameState;
        drawBoard();
    }

    if (data.type === "role") {
        role = data.role;

        roleElement.textContent =
            `Logged in as ${data.name} (${role})`;
    }

    if (data.type === "error") {
        alert(data.message);
    }
};

// 7. LOGIN AND RESET BUTTONS
joinBtn.addEventListener("click", () => {

    ws.send(JSON.stringify({
        type: "login",
        name: nameInput.value.trim(),
        password: passwordInput.value
    }));
});

resetBtn.addEventListener("click", () => {

    ws.send(JSON.stringify({
        type: "reset"
    }));
});

// 8. DRAW GRID FUNCTION
function drawGrid() {

    ctx.strokeStyle = "black";
    ctx.lineWidth = 5;

    // Draw vertical lines
    for (let i = 1; i < 3; i++) {

        ctx.beginPath();

        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, boardCanvas.height);

        ctx.stroke();
    }

    // Draw horizontal lines
    for (let i = 1; i < 3; i++) {

        ctx.beginPath();

        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(boardCanvas.width, i * CELL_SIZE);

        ctx.stroke();
    }
}

// 9. DRAW PIECES FUNCTION
function drawPieces() {

    if (!gameState) return;

    for (let i = 0; i < gameState.board.length; i++) {

        const row = Math.floor(i / 3);
        const col = i % 3;

        // Find the center of each cell
        const x = col * CELL_SIZE + CELL_SIZE / 2;
        const y = row * CELL_SIZE + CELL_SIZE / 2;

        if (gameState.board[i] === "X") {
            drawX(x, y);
        }

        if (gameState.board[i] === "O") {
            drawO(x, y);
        }
    }
}

// 10. DRAW X AND O FUNCTIONS
function drawX(x, y) {

    const offset = 60;

    ctx.strokeStyle = "#e63946";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";

    ctx.beginPath();

    // First diagonal
    ctx.moveTo(x - offset, y - offset);
    ctx.lineTo(x + offset, y + offset);

    // Second diagonal
    ctx.moveTo(x + offset, y - offset);
    ctx.lineTo(x - offset, y + offset);

    ctx.stroke();
}

function drawO(x, y) {

    ctx.strokeStyle = "#457b9d";
    ctx.lineWidth = 8;

    ctx.beginPath();

    ctx.arc(x, y, 65, 0, Math.PI * 2);

    ctx.stroke();
}
