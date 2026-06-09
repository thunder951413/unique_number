const boardElement = document.querySelector("#board");
const difficultyElement = document.querySelector("#difficulty");
const statusElement = document.querySelector("#status");
const timerElement = document.querySelector("#timer");
const newGameButton = document.querySelector("#new-game");
const manualModeButton = document.querySelector("#manual-mode");
const notesModeButton = document.querySelector("#notes-mode");
const saveStateButton = document.querySelector("#save-state");
const loadStateButton = document.querySelector("#load-state");
const applyManualButton = document.querySelector("#apply-manual");
const clearManualButton = document.querySelector("#clear-manual");
const resetGameButton = document.querySelector("#reset-game");
const checkBoardButton = document.querySelector("#check-board");
const hintCellButton = document.querySelector("#hint-cell");
const solveGameButton = document.querySelector("#solve-game");
const numberPadElement = document.querySelector("#number-pad");
const saveSlotsElement = document.querySelector("#save-slots");

const GRID_SIZE = 9;
const BOX_SIZE = 3;
const EMPTY = 0;
const HOLES_BY_DIFFICULTY = {
  easy: 36,
  medium: 46,
  hard: 54,
};

let solutionBoard = createEmptyBoard();
let puzzleBoard = createEmptyBoard();
let currentBoard = createEmptyBoard();
let notesBoard = createEmptyNotesBoard();
let selectedCell = null;
let timerId = null;
let elapsedSeconds = 0;
let gameMode = "play";
let notesMode = false;
let saveMode = false;
let selectedSaveSlot = null;
const saveSlots = Array(5).fill(null);

function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(EMPTY));
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function createEmptyNotesBoard() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => new Set())
  );
}

function cloneNotesBoard(board) {
  return board.map((row) => row.map((cell) => new Set(cell)));
}

function serializeNotesBoard(board) {
  return board.map((row) => row.map((cell) => [...cell].sort((left, right) => left - right)));
}

function deserializeNotesBoard(serializedBoard) {
  return serializedBoard.map((row) => row.map((cell) => new Set(cell)));
}

function shuffle(values) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function isValidMove(board, row, col, value) {
  for (let index = 0; index < GRID_SIZE; index += 1) {
    if (board[row][index] === value || board[index][col] === value) {
      return false;
    }
  }

  const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

  for (let rowOffset = 0; rowOffset < BOX_SIZE; rowOffset += 1) {
    for (let colOffset = 0; colOffset < BOX_SIZE; colOffset += 1) {
      if (board[startRow + rowOffset][startCol + colOffset] === value) {
        return false;
      }
    }
  }

  return true;
}

function hasConflict(board, row, col) {
  const value = board[row][col];
  if (value === EMPTY) {
    return false;
  }

  for (let index = 0; index < GRID_SIZE; index += 1) {
    if (index !== col && board[row][index] === value) {
      return true;
    }
    if (index !== row && board[index][col] === value) {
      return true;
    }
  }

  const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let rowOffset = 0; rowOffset < BOX_SIZE; rowOffset += 1) {
    for (let colOffset = 0; colOffset < BOX_SIZE; colOffset += 1) {
      const nextRow = startRow + rowOffset;
      const nextCol = startCol + colOffset;
      if ((nextRow !== row || nextCol !== col) && board[nextRow][nextCol] === value) {
        return true;
      }
    }
  }

  return false;
}

function isBoardConsistent(board) {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (hasConflict(board, row, col)) {
        return false;
      }
    }
  }
  return true;
}

function solveBoard(board, randomized = false) {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] !== EMPTY) {
        continue;
      }

      const candidates = randomized
        ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
        : [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (const candidate of candidates) {
        if (!isValidMove(board, row, col, candidate)) {
          continue;
        }

        board[row][col] = candidate;
        if (solveBoard(board, randomized)) {
          return true;
        }
        board[row][col] = EMPTY;
      }

      return false;
    }
  }

  return true;
}

function countSolutions(board) {
  let found = 0;

  function search() {
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (board[row][col] !== EMPTY) {
          continue;
        }

        for (let candidate = 1; candidate <= 9; candidate += 1) {
          if (!isValidMove(board, row, col, candidate)) {
            continue;
          }

          board[row][col] = candidate;
          search();
          board[row][col] = EMPTY;

          if (found > 1) {
            return;
          }
        }
        return;
      }
    }

    found += 1;
  }

  search();
  return found;
}

function carvePuzzle(fullBoard, holes) {
  const board = cloneBoard(fullBoard);
  const positions = shuffle(
    Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => index)
  );

  let removed = 0;
  for (const position of positions) {
    if (removed >= holes) {
      break;
    }

    const row = Math.floor(position / GRID_SIZE);
    const col = position % GRID_SIZE;
    const backup = board[row][col];
    board[row][col] = EMPTY;

    const attemptsBoard = cloneBoard(board);
    if (countSolutions(attemptsBoard) !== 1) {
      board[row][col] = backup;
      continue;
    }

    removed += 1;
  }

  return board;
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function startTimer() {
  clearInterval(timerId);
  timerId = window.setInterval(() => {
    elapsedSeconds += 1;
    timerElement.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
}

function setStatus(message) {
  statusElement.textContent = message;
}

function difficultyLabel(difficulty) {
  return (
    {
      easy: "简单",
      medium: "中等",
      hard: "困难",
    }[difficulty] || "中等"
  );
}

function isCellEditable(row, col) {
  return gameMode === "edit" || puzzleBoard[row][col] === EMPTY;
}

function getSelectedValue() {
  if (!selectedCell) {
    return EMPTY;
  }

  return currentBoard[selectedCell.row][selectedCell.col];
}

function updateModeUI() {
  const editing = gameMode === "edit";
  manualModeButton.classList.toggle("active-mode", editing);
  notesModeButton.classList.toggle("active-mode", notesMode && !editing);
  saveStateButton.classList.toggle("active-mode", saveMode);
  applyManualButton.disabled = !editing;
  clearManualButton.disabled = !editing;
  loadStateButton.disabled = selectedSaveSlot === null || saveSlots[selectedSaveSlot] === null;
}

function renderSaveSlots() {
  const buttons = saveSlotsElement.querySelectorAll("button[data-slot]");

  buttons.forEach((button, index) => {
    const hasData = saveSlots[index] !== null;
    button.textContent = hasData ? `存档${index + 1}` : `空白${index + 1}`;
    button.classList.toggle("filled-slot", hasData);
    button.classList.toggle("selected-slot", selectedSaveSlot === index);
  });
}

function snapshotState() {
  return {
    solutionBoard: cloneBoard(solutionBoard),
    puzzleBoard: cloneBoard(puzzleBoard),
    currentBoard: cloneBoard(currentBoard),
    notesBoard: serializeNotesBoard(notesBoard),
    selectedCell: selectedCell ? { ...selectedCell } : null,
    elapsedSeconds,
    gameMode,
    notesMode,
  };
}

function applySnapshot(snapshot) {
  solutionBoard = cloneBoard(snapshot.solutionBoard);
  puzzleBoard = cloneBoard(snapshot.puzzleBoard);
  currentBoard = cloneBoard(snapshot.currentBoard);
  notesBoard = deserializeNotesBoard(snapshot.notesBoard);
  selectedCell = snapshot.selectedCell ? { ...snapshot.selectedCell } : null;
  elapsedSeconds = snapshot.elapsedSeconds;
  gameMode = snapshot.gameMode;
  notesMode = snapshot.notesMode;
  timerElement.textContent = formatTime(elapsedSeconds);

  if (gameMode === "play") {
    startTimer();
  } else {
    stopTimer();
  }

  saveMode = false;
  updateModeUI();
  renderSaveSlots();
  renderBoard();
}

function clearCellNotes(row, col) {
  notesBoard[row][col].clear();
}

function clearAllNotes() {
  notesBoard = createEmptyNotesBoard();
}

function prunePeerNotes(row, col, value) {
  if (value === EMPTY) {
    return;
  }

  for (let index = 0; index < GRID_SIZE; index += 1) {
    notesBoard[row][index].delete(value);
    notesBoard[index][col].delete(value);
  }

  const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let rowOffset = 0; rowOffset < BOX_SIZE; rowOffset += 1) {
    for (let colOffset = 0; colOffset < BOX_SIZE; colOffset += 1) {
      notesBoard[startRow + rowOffset][startCol + colOffset].delete(value);
    }
  }
}

function renderCellContent(cell, row, col, value, selectedValue) {
  const notes = [...notesBoard[row][col]].sort((left, right) => left - right);

  if (value !== EMPTY) {
    const valueElement = document.createElement("span");
    valueElement.className = "cell-value";
    valueElement.textContent = String(value);
    cell.appendChild(valueElement);
    return;
  }

  if (notes.length === 0 || gameMode !== "play") {
    return;
  }

  cell.classList.add("has-notes");
  const noteGrid = document.createElement("div");
  noteGrid.className = "note-grid";

  for (let candidate = 1; candidate <= 9; candidate += 1) {
    const noteItem = document.createElement("span");
    noteItem.textContent = notes.includes(candidate) ? String(candidate) : "";
    if (selectedValue !== EMPTY && candidate === selectedValue && notes.includes(candidate)) {
      noteItem.classList.add("same-note");
    }
    noteGrid.appendChild(noteItem);
  }

  cell.appendChild(noteGrid);
}

function renderBoard() {
  boardElement.innerHTML = "";
  const selectedValue = getSelectedValue();

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = document.createElement("button");
      const value = currentBoard[row][col];
      const isFixed = gameMode === "play" && puzzleBoard[row][col] !== EMPTY;
      const isSelected =
        selectedCell && selectedCell.row === row && selectedCell.col === col;
      const isRelated =
        selectedCell &&
        (selectedCell.row === row ||
          selectedCell.col === col ||
          (Math.floor(selectedCell.row / BOX_SIZE) === Math.floor(row / BOX_SIZE) &&
            Math.floor(selectedCell.col / BOX_SIZE) === Math.floor(col / BOX_SIZE)));
      const hasError =
        gameMode === "edit"
          ? hasConflict(currentBoard, row, col)
          : value !== EMPTY && value !== solutionBoard[row][col];
      const hasSameValue =
        selectedValue !== EMPTY && value !== EMPTY && value === selectedValue && !isSelected;

      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute(
        "aria-label",
        `第 ${row + 1} 行第 ${col + 1} 列${value === EMPTY ? "，空白" : `，数字 ${value}`}`
      );

      if (isFixed) {
        cell.classList.add("fixed");
      }
      if (isSelected) {
        cell.classList.add("selected");
      } else if (isRelated) {
        cell.classList.add("related");
      }
      if (hasSameValue) {
        cell.classList.add("same-value");
      }
      if (hasError) {
        cell.classList.add("error");
      }

      renderCellContent(cell, row, col, value, selectedValue);
      cell.addEventListener("click", () => selectCell(row, col));
      boardElement.appendChild(cell);
    }
  }
}

function selectCell(row, col) {
  selectedCell = { row, col };
  renderBoard();
}

function isCompleted() {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (currentBoard[row][col] !== solutionBoard[row][col]) {
        return false;
      }
    }
  }
  return true;
}

function updateCell(row, col, value) {
  if (gameMode === "play" && puzzleBoard[row][col] !== EMPTY) {
    return;
  }

  currentBoard[row][col] = value;
  if (value !== EMPTY) {
    clearCellNotes(row, col);
    if (gameMode === "play") {
      prunePeerNotes(row, col, value);
    }
  }
  renderBoard();

  if (gameMode === "play" && isCompleted()) {
    stopTimer();
    setStatus(`恭喜，已完成本局数独，用时 ${formatTime(elapsedSeconds)}。`);
  }
}

function clearSelectedCell() {
  if (!selectedCell || !isCellEditable(selectedCell.row, selectedCell.col)) {
    setStatus(
      gameMode === "edit" ? "请先选择一个要设置的格子。" : "请先选择一个可编辑的空格。"
    );
    return;
  }

  clearCellNotes(selectedCell.row, selectedCell.col);
  updateCell(selectedCell.row, selectedCell.col, EMPTY);
  setStatus(gameMode === "edit" ? "已清空当前设题格子。" : "已清空当前格子。");
}

function toggleSelectedNote(value) {
  if (!selectedCell || !isCellEditable(selectedCell.row, selectedCell.col)) {
    setStatus("请先选择一个可编辑的空格。");
    return;
  }

  if (gameMode !== "play") {
    setStatus("手动设题模式下不支持备选数字。");
    return;
  }

  if (currentBoard[selectedCell.row][selectedCell.col] !== EMPTY) {
    currentBoard[selectedCell.row][selectedCell.col] = EMPTY;
  }

  const cellNotes = notesBoard[selectedCell.row][selectedCell.col];
  if (cellNotes.has(value)) {
    cellNotes.delete(value);
    setStatus(`已移除备选数字 ${value}。`);
  } else {
    cellNotes.add(value);
    setStatus(`已添加备选数字 ${value}。`);
  }

  renderBoard();
}

function fillSelectedCell(value) {
  if (!selectedCell || !isCellEditable(selectedCell.row, selectedCell.col)) {
    setStatus(
      gameMode === "edit" ? "请先选择一个要设置的格子。" : "请先选择一个可编辑的空格。"
    );
    return;
  }

  if (notesMode && gameMode === "play") {
    toggleSelectedNote(value);
    return;
  }

  updateCell(selectedCell.row, selectedCell.col, value);
  if (gameMode === "edit") {
    setStatus(`已将第 ${selectedCell.row + 1} 行第 ${selectedCell.col + 1} 列设为 ${value}。`);
    return;
  }

  if (value === solutionBoard[selectedCell.row][selectedCell.col]) {
    setStatus(`已填入 ${value}。`);
  } else {
    setStatus(`已填入 ${value}，当前与答案不一致。`);
  }
}

function highlightCell(row, col) {
  const cell = boardElement.querySelector(
    `[data-row="${row}"][data-col="${col}"]`
  );
  if (!cell) {
    return;
  }

  cell.classList.add("hint");
  window.setTimeout(() => cell.classList.remove("hint"), 900);
}

function createGame() {
  const difficulty = difficultyElement.value;
  const holes = HOLES_BY_DIFFICULTY[difficulty];
  const fullBoard = createEmptyBoard();

  solveBoard(fullBoard, true);
  solutionBoard = cloneBoard(fullBoard);
  puzzleBoard = carvePuzzle(fullBoard, holes);
  currentBoard = cloneBoard(puzzleBoard);
  clearAllNotes();
  selectedCell = null;
  elapsedSeconds = 0;
  gameMode = "play";
  notesMode = false;
  saveMode = false;
  timerElement.textContent = formatTime(elapsedSeconds);
  startTimer();
  updateModeUI();
  renderSaveSlots();
  renderBoard();
  setStatus(`已生成${difficultyLabel(difficulty)}题目，开始挑战吧。`);
}

function enterManualMode() {
  stopTimer();
  solutionBoard = createEmptyBoard();
  puzzleBoard = createEmptyBoard();
  currentBoard = createEmptyBoard();
  clearAllNotes();
  selectedCell = null;
  elapsedSeconds = 0;
  gameMode = "edit";
  notesMode = false;
  saveMode = false;
  timerElement.textContent = formatTime(elapsedSeconds);
  updateModeUI();
  renderSaveSlots();
  renderBoard();
  setStatus("已进入手动设题模式，请录入初始数字后点击“应用题面”。");
}

function clearManualBoard() {
  if (gameMode !== "edit") {
    setStatus("请先进入手动设题模式。");
    return;
  }

  currentBoard = createEmptyBoard();
  clearAllNotes();
  selectedCell = null;
  renderBoard();
  setStatus("题面已清空，可以重新录入。");
}

function applyManualBoard() {
  if (gameMode !== "edit") {
    setStatus("请先进入手动设题模式。");
    return;
  }

  const manualBoard = cloneBoard(currentBoard);
  const clueCount = manualBoard.flat().filter((value) => value !== EMPTY).length;

  if (clueCount === 0) {
    setStatus("请先录入至少一个初始数字。");
    return;
  }

  if (!isBoardConsistent(manualBoard)) {
    renderBoard();
    setStatus("当前题面存在重复冲突，红色格子需要调整。");
    return;
  }

  const solution = cloneBoard(manualBoard);
  if (!solveBoard(solution, false)) {
    setStatus("当前题面无解，请调整后再应用。");
    return;
  }

  const solutionCount = countSolutions(cloneBoard(manualBoard));
  if (solutionCount !== 1) {
    setStatus("当前题面不是唯一解，请继续调整后再应用。");
    return;
  }

  solutionBoard = solution;
  puzzleBoard = cloneBoard(manualBoard);
  currentBoard = cloneBoard(manualBoard);
  clearAllNotes();
  selectedCell = null;
  elapsedSeconds = 0;
  gameMode = "play";
  notesMode = false;
  saveMode = false;
  timerElement.textContent = formatTime(elapsedSeconds);
  startTimer();
  updateModeUI();
  renderSaveSlots();
  renderBoard();
  setStatus("自定义初始棋盘已应用，开始游戏吧。");
}

function resetGame() {
  if (gameMode !== "play") {
    setStatus("手动设题模式下请使用“清空题面”。");
    return;
  }

  currentBoard = cloneBoard(puzzleBoard);
  clearAllNotes();
  selectedCell = null;
  elapsedSeconds = 0;
  timerElement.textContent = formatTime(elapsedSeconds);
  startTimer();
  renderBoard();
  setStatus("棋盘已重置。");
}

function checkBoard() {
  if (gameMode === "edit") {
    renderBoard();
    setStatus(
      isBoardConsistent(currentBoard)
        ? "当前题面没有冲突，可以点击“应用题面”。"
        : "当前题面存在重复冲突，红色格子需要调整。"
    );
    return;
  }

  let errorCount = 0;
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (
        currentBoard[row][col] !== EMPTY &&
        currentBoard[row][col] !== solutionBoard[row][col]
      ) {
        errorCount += 1;
      }
    }
  }

  renderBoard();

  if (errorCount === 0) {
    setStatus("当前已填写的数字都正确。");
    return;
  }

  setStatus(`发现 ${errorCount} 处错误，红色格子需要重新检查。`);
}

function giveHint() {
  if (gameMode !== "play") {
    setStatus("请先应用题面，再使用提示功能。");
    return;
  }

  const emptyCells = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (currentBoard[row][col] !== solutionBoard[row][col]) {
        emptyCells.push({ row, col });
      }
    }
  }

  if (emptyCells.length === 0) {
    setStatus("当前棋盘已经完成，无需提示。");
    return;
  }

  const target =
    selectedCell &&
    currentBoard[selectedCell.row][selectedCell.col] !==
      solutionBoard[selectedCell.row][selectedCell.col]
      ? selectedCell
      : emptyCells[Math.floor(Math.random() * emptyCells.length)];

  currentBoard[target.row][target.col] = solutionBoard[target.row][target.col];
  clearCellNotes(target.row, target.col);
  prunePeerNotes(target.row, target.col, currentBoard[target.row][target.col]);
  selectedCell = target;
  renderBoard();
  highlightCell(target.row, target.col);

  if (isCompleted()) {
    stopTimer();
    setStatus(`最后一步提示已完成本局，用时 ${formatTime(elapsedSeconds)}。`);
  } else {
    setStatus(`已提示第 ${target.row + 1} 行第 ${target.col + 1} 列。`);
  }
}

function solveGame() {
  if (gameMode !== "play") {
    setStatus("请先应用题面，再使用求解功能。");
    return;
  }

  currentBoard = cloneBoard(solutionBoard);
  clearAllNotes();
  selectedCell = null;
  stopTimer();
  renderBoard();
  setStatus("已显示完整答案。");
}

function toggleNotesMode() {
  if (gameMode !== "play") {
    setStatus("手动设题模式下不支持备选数字。");
    return;
  }

  notesMode = !notesMode;
  updateModeUI();
  setStatus(notesMode ? "已开启备选模式。" : "已关闭备选模式。");
}

function handleSaveSlotSelection(slotIndex) {
  if (saveMode) {
    saveSlots[slotIndex] = snapshotState();
    selectedSaveSlot = slotIndex;
    saveMode = false;
    updateModeUI();
    renderSaveSlots();
    setStatus(`已保存到存档${slotIndex + 1}。`);
    return;
  }

  selectedSaveSlot = slotIndex;
  updateModeUI();
  renderSaveSlots();
  setStatus(
    saveSlots[slotIndex] === null
      ? `已选中空白${slotIndex + 1}。`
      : `已选中存档${slotIndex + 1}，可点击“读取”。`
  );
}

function beginSaveMode() {
  saveMode = true;
  updateModeUI();
  renderSaveSlots();
  setStatus("请选择左侧一个槽位保存当前状态。");
}

function loadSelectedState() {
  if (selectedSaveSlot === null) {
    setStatus("请先选择一个存档槽位。");
    return;
  }

  if (saveSlots[selectedSaveSlot] === null) {
    setStatus("当前槽位为空，无法读取。");
    return;
  }

  applySnapshot(saveSlots[selectedSaveSlot]);
  setStatus(`已读取存档${selectedSaveSlot + 1}。`);
}

function handleKeyboardInput(event) {
  if (event.target instanceof HTMLSelectElement) {
    return;
  }

  if (!selectedCell) {
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    fillSelectedCell(Number(event.key));
    return;
  }

  if (["Backspace", "Delete", "0"].includes(event.key)) {
    clearSelectedCell();
  }
}

numberPadElement.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const value = button.dataset.value;
  const action = button.dataset.action;

  if (action === "clear") {
    clearSelectedCell();
    return;
  }

  if (value) {
    fillSelectedCell(Number(value));
  }
});

saveSlotsElement.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-slot]");
  if (!button) {
    return;
  }

  handleSaveSlotSelection(Number(button.dataset.slot));
});

newGameButton.addEventListener("click", createGame);
manualModeButton.addEventListener("click", enterManualMode);
notesModeButton.addEventListener("click", toggleNotesMode);
saveStateButton.addEventListener("click", beginSaveMode);
loadStateButton.addEventListener("click", loadSelectedState);
applyManualButton.addEventListener("click", applyManualBoard);
clearManualButton.addEventListener("click", clearManualBoard);
resetGameButton.addEventListener("click", resetGame);
checkBoardButton.addEventListener("click", checkBoard);
hintCellButton.addEventListener("click", giveHint);
solveGameButton.addEventListener("click", solveGame);
window.addEventListener("keydown", handleKeyboardInput);

updateModeUI();
renderSaveSlots();
createGame();
