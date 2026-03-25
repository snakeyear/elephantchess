import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════
const COLS = 9, ROWS = 10;
const CELL = 58, PAD = 36, PIECE_R = 24;
const RED = "red", BLACK = "black";
const INF = 999999;

const PIECE_NAMES = {
  red: { K:"帥", A:"仕", E:"相", H:"馬", R:"車", C:"炮", P:"兵" },
  black: { K:"將", A:"士", E:"象", H:"馬", R:"車", C:"炮", P:"卒" },
};

const PIECE_VALUES = { K:10000, R:1000, C:500, H:450, A:200, E:200, P:100 };

// ═══════════════════════════════════════════
//  POSITION-SQUARE TABLES (from Black POV, row 0-9)
// ═══════════════════════════════════════════
const PST = {
  P: [
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [10,10,20,35,35,35,20,10,10],[15,25,35,45,50,45,35,25,15],
    [20,35,45,60,70,60,45,35,20],[30,45,55,70,80,70,55,45,30],
    [40,55,65,80,90,80,65,55,40],[50,60,70,85,95,85,70,60,50],
    [0,0,0,0,0,0,0,0,0],
  ],
  H: [
    [10,20,30,30,20,30,30,20,10],[20,40,50,45,50,45,50,40,20],
    [25,45,60,55,60,55,60,45,25],[30,50,60,70,65,70,60,50,30],
    [25,50,65,70,75,70,65,50,25],[25,50,65,70,75,70,65,50,25],
    [30,50,60,70,65,70,60,50,30],[25,45,60,55,60,55,60,45,25],
    [20,40,50,45,50,45,50,40,20],[10,20,30,30,20,30,30,20,10],
  ],
  C: [
    [10,20,25,30,40,30,25,20,10],[15,30,40,50,60,50,40,30,15],
    [15,30,40,50,60,50,40,30,15],[20,35,45,55,65,55,45,35,20],
    [25,40,50,60,70,60,50,40,25],[25,40,50,60,70,60,50,40,25],
    [20,35,45,55,65,55,45,35,20],[15,30,40,50,60,50,40,30,15],
    [15,30,40,50,60,50,40,30,15],[10,20,25,30,40,30,25,20,10],
  ],
  R: [
    [20,30,30,40,45,40,30,30,20],[25,45,50,60,70,60,50,45,25],
    [20,40,50,55,65,55,50,40,20],[25,45,55,65,70,65,55,45,25],
    [30,50,55,65,70,65,55,50,30],[30,50,55,65,70,65,55,50,30],
    [25,45,55,65,70,65,55,45,25],[20,40,50,55,65,55,50,40,20],
    [25,45,50,60,70,60,50,45,25],[20,30,30,40,45,40,30,30,20],
  ],
  A: [
    [0,0,0,20,0,20,0,0,0],[0,0,0,0,25,0,0,0,0],[0,0,0,20,0,20,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,20,0,20,0,0,0],[0,0,0,0,25,0,0,0,0],[0,0,0,20,0,20,0,0,0],
  ],
  E: [
    [0,0,20,0,0,0,20,0,0],[0,0,0,0,0,0,0,0,0],[20,0,0,0,25,0,0,0,20],
    [0,0,0,0,0,0,0,0,0],[0,0,20,0,0,0,20,0,0],
    [0,0,20,0,0,0,20,0,0],[0,0,0,0,0,0,0,0,0],
    [20,0,0,0,25,0,0,0,20],[0,0,0,0,0,0,0,0,0],[0,0,20,0,0,0,20,0,0],
  ],
  K: [
    [0,0,0,5,10,5,0,0,0],[0,0,0,8,12,8,0,0,0],[0,0,0,5,10,5,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,5,10,5,0,0,0],[0,0,0,8,12,8,0,0,0],[0,0,0,5,10,5,0,0,0],
  ],
};

// ═══════════════════════════════════════════
//  ZOBRIST HASHING
// ═══════════════════════════════════════════
const PIECE_TYPES = ["K","A","E","H","R","C","P"];
const COLORS = [RED, BLACK];
const zobristTable = {};
let zobristBlackTurn;

function initZobrist() {
  const rand32 = () => (Math.random() * 0xFFFFFFFF) >>> 0;
  COLORS.forEach(color => {
    PIECE_TYPES.forEach(type => {
      const key = `${color}_${type}`;
      zobristTable[key] = [];
      for (let i = 0; i < ROWS * COLS; i++) {
        zobristTable[key].push(rand32());
      }
    });
  });
  zobristBlackTurn = rand32();
}
initZobrist();

function computeHash(board, turn) {
  let h = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p) h ^= zobristTable[`${p.color}_${p.type}`][r * COLS + c];
    }
  if (turn === BLACK) h ^= zobristBlackTurn;
  return h >>> 0;
}

// ═══════════════════════════════════════════
//  BOARD SETUP & CLONING
// ═══════════════════════════════════════════
function createInitialBoard() {
  const b = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const p = (co, t, positions) =>
    positions.forEach(([c, r]) => (b[r][c] = { color: co, type: t, id: `${co}_${t}_${c}_${r}` }));
  p(BLACK,"R",[[0,0],[8,0]]); p(BLACK,"H",[[1,0],[7,0]]);
  p(BLACK,"E",[[2,0],[6,0]]); p(BLACK,"A",[[3,0],[5,0]]);
  p(BLACK,"K",[[4,0]]); p(BLACK,"C",[[1,2],[7,2]]);
  p(BLACK,"P",[[0,3],[2,3],[4,3],[6,3],[8,3]]);
  p(RED,"R",[[0,9],[8,9]]); p(RED,"H",[[1,9],[7,9]]);
  p(RED,"E",[[2,9],[6,9]]); p(RED,"A",[[3,9],[5,9]]);
  p(RED,"K",[[4,9]]); p(RED,"C",[[1,7],[7,7]]);
  p(RED,"P",[[0,6],[2,6],[4,6],[6,6],[8,6]]);
  return b;
}

function cloneBoard(b) { return b.map(r => r.map(c => c ? { ...c } : null)); }

// ═══════════════════════════════════════════
//  MOVE GENERATION
// ═══════════════════════════════════════════
function inBounds(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }
function inPalace(c, r, color) { return c >= 3 && c <= 5 && (color === BLACK ? r >= 0 && r <= 2 : r >= 7 && r <= 9); }
function isOwnSide(r, color) { return color === BLACK ? r <= 4 : r >= 5; }

function generatePieceMoves(board, c, r, piece) {
  const results = [];
  const add = (tc, tr) => {
    if (!inBounds(tc, tr)) return;
    const t = board[tr][tc];
    if (t && t.color === piece.color) return;
    results.push([tc, tr]);
  };
  switch (piece.type) {
    case "K":
      [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dc,dr]) => {
        const nc=c+dc, nr=r+dr;
        if (inPalace(nc, nr, piece.color)) add(nc, nr);
      });
      { // flying general
        const dir = piece.color === RED ? -1 : 1;
        let nr = r + dir;
        while (inBounds(c, nr)) {
          const t = board[nr][c];
          if (t) { if (t.type === "K" && t.color !== piece.color) results.push([c, nr]); break; }
          nr += dir;
        }
      }
      break;
    case "A":
      [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dc,dr]) => {
        const nc=c+dc, nr=r+dr;
        if (inPalace(nc, nr, piece.color)) add(nc, nr);
      });
      break;
    case "E":
      [[2,2],[2,-2],[-2,2],[-2,-2]].forEach(([dc,dr]) => {
        const nc=c+dc, nr=r+dr, ec=c+dc/2, er=r+dr/2;
        if (inBounds(nc,nr) && isOwnSide(nr, piece.color) && !board[er][ec]) add(nc,nr);
      });
      break;
    case "H":
      [[1,2],[1,-2],[-1,2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]].forEach(([dc,dr]) => {
        const nc=c+dc, nr=r+dr;
        let bc,br;
        if (Math.abs(dc)===2){bc=c+dc/2;br=r;}else{bc=c;br=r+dr/2;}
        if (inBounds(nc,nr) && !board[br][bc]) add(nc,nr);
      });
      break;
    case "R":
      [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dc,dr]) => {
        let nc=c+dc,nr=r+dr;
        while(inBounds(nc,nr)){
          const t=board[nr][nc];
          if(t){if(t.color!==piece.color)results.push([nc,nr]);break;}
          results.push([nc,nr]); nc+=dc; nr+=dr;
        }
      });
      break;
    case "C":
      [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dc,dr]) => {
        let nc=c+dc,nr=r+dr,jumped=false;
        while(inBounds(nc,nr)){
          const t=board[nr][nc];
          if(!jumped){if(t)jumped=true;else results.push([nc,nr]);}
          else{if(t){if(t.color!==piece.color)results.push([nc,nr]);break;}}
          nc+=dc;nr+=dr;
        }
      });
      break;
    case "P": {
      const fwd = piece.color === RED ? -1 : 1;
      add(c, r+fwd);
      if (!isOwnSide(r, piece.color)) { add(c-1,r); add(c+1,r); }
      break;
    }
  }
  return results;
}

function generateMoves(board, color) {
  const moves = [];
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    const p = board[r][c];
    if (!p || p.color !== color) continue;
    generatePieceMoves(board,c,r,p).forEach(([tc,tr]) => {
      const cap = board[tr][tc];
      moves.push({ fc:c, fr:r, tc, tr, capType: cap ? cap.type : null, pieceType: p.type });
    });
  }
  return moves;
}

function makeMove(board, m) {
  const nb = cloneBoard(board);
  const cap = nb[m.tr][m.tc];
  nb[m.tr][m.tc] = nb[m.fr][m.fc];
  nb[m.fr][m.fc] = null;
  return { board: nb, captured: cap };
}

function isInCheck(board, color) {
  const opp = color === RED ? BLACK : RED;
  const moves = generateMoves(board, opp);
  return moves.some(m => board[m.tr][m.tc]?.type === "K" && board[m.tr][m.tc]?.color === color);
}

function getLegalMoves(board, color) {
  return generateMoves(board, color).filter(m => {
    const { board: nb } = makeMove(board, m);
    return !isInCheck(nb, color);
  });
}

// ═══════════════════════════════════════════
//  ADVANCED AI ENGINE
// ═══════════════════════════════════════════

// --- Transposition Table ---
const TT_EXACT = 0, TT_ALPHA = 1, TT_BETA = 2;
let ttable = new Map();
const TT_MAX_SIZE = 500000;

function ttProbe(hash, depth, alpha, beta) {
  const entry = ttable.get(hash);
  if (!entry || entry.depth < depth) return null;
  if (entry.flag === TT_EXACT) return entry.score;
  if (entry.flag === TT_ALPHA && entry.score <= alpha) return alpha;
  if (entry.flag === TT_BETA && entry.score >= beta) return beta;
  return null;
}

function ttStore(hash, depth, score, flag, bestMove) {
  if (ttable.size > TT_MAX_SIZE) ttable.clear();
  ttable.set(hash, { depth, score, flag, bestMove });
}

function ttGetBestMove(hash) {
  const e = ttable.get(hash);
  return e ? e.bestMove : null;
}

// --- Killer Moves (2 per depth) ---
let killerMoves = [];
function initKillers(maxDepth) {
  killerMoves = Array.from({ length: maxDepth + 2 }, () => [null, null]);
}
function storeKiller(depth, move) {
  if (!killerMoves[depth]) return;
  if (killerMoves[depth][0] && sameMove(killerMoves[depth][0], move)) return;
  killerMoves[depth][1] = killerMoves[depth][0];
  killerMoves[depth][0] = move;
}
function sameMove(a, b) {
  return a && b && a.fc===b.fc && a.fr===b.fr && a.tc===b.tc && a.tr===b.tr;
}

// --- History Heuristic ---
let historyTable = {};
function initHistory() { historyTable = {}; }
function historyKey(m) { return `${m.fc},${m.fr},${m.tc},${m.tr}`; }
function storeHistory(m, depth) {
  const k = historyKey(m);
  historyTable[k] = (historyTable[k] || 0) + depth * depth;
}

// --- Enhanced Evaluation ---
function evaluate(board, color) {
  let score = 0;
  let redMobility = 0, blackMobility = 0;
  let redKingPos = null, blackKingPos = null;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p) continue;

      // Material + PST
      let val = PIECE_VALUES[p.type];
      const pst = PST[p.type];
      if (pst) {
        const pr = p.color === BLACK ? r : 9 - r;
        val += pst[pr][c];
      }

      if (p.color === color) score += val; else score -= val;

      // King positions
      if (p.type === "K") {
        if (p.color === RED) redKingPos = [c, r];
        else blackKingPos = [c, r];
      }

      // Mobility (approximate for major pieces)
      if (p.type === "R" || p.type === "C" || p.type === "H") {
        const moves = generatePieceMoves(board, c, r, p);
        if (p.color === color) redMobility += moves.length;
        else blackMobility += moves.length;
      }
    }
  }

  // Mobility bonus
  score += (redMobility - blackMobility) * 3;

  // King safety: penalize exposed king (no advisors/elephants nearby)
  if (redKingPos && blackKingPos) {
    const kingSafety = (kingPos, col) => {
      let safety = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = kingPos[1] + dr, nc = kingPos[0] + dc;
          if (inBounds(nc, nr)) {
            const p = board[nr][nc];
            if (p && p.color === col && (p.type === "A" || p.type === "E")) safety += 15;
          }
        }
      }
      return safety;
    };
    const mySafety = color === RED ? kingSafety(redKingPos, RED) : kingSafety(blackKingPos, BLACK);
    const oppSafety = color === RED ? kingSafety(blackKingPos, BLACK) : kingSafety(redKingPos, RED);
    score += mySafety - oppSafety;
  }

  return score;
}

// --- Move Ordering ---
function scoreMoveForOrdering(m, board, depth, hashMove) {
  // 1. Hash move (from TT)
  if (hashMove && sameMove(m, hashMove)) return 100000;
  // 2. Captures (MVV-LVA)
  if (m.capType) {
    const victimVal = PIECE_VALUES[m.capType] || 0;
    const attackerVal = PIECE_VALUES[m.pieceType] || 0;
    return 50000 + victimVal * 10 - attackerVal;
  }
  // 3. Killer moves
  if (killerMoves[depth]) {
    if (sameMove(killerMoves[depth][0], m)) return 40000;
    if (sameMove(killerMoves[depth][1], m)) return 39000;
  }
  // 4. History heuristic
  return historyTable[historyKey(m)] || 0;
}

function orderMoves(moves, board, depth, hash) {
  const hashMove = ttGetBestMove(hash);
  return moves
    .map(m => ({ ...m, _score: scoreMoveForOrdering(m, board, depth, hashMove) }))
    .sort((a, b) => b._score - a._score);
}

// --- Quiescence Search ---
function quiescence(board, color, alpha, beta, maximizing, aiColor, depth) {
  if (depth <= -6) return evaluate(board, aiColor); // max quiescence depth

  const standPat = maximizing ? evaluate(board, aiColor) : -evaluate(board, aiColor) + evaluate(board, aiColor) * 2 - evaluate(board, aiColor);
  // Simpler: always evaluate from aiColor perspective
  const eval0 = evaluate(board, aiColor);

  if (maximizing) {
    if (eval0 >= beta) return beta;
    if (eval0 > alpha) alpha = eval0;
  } else {
    if (eval0 <= alpha) return alpha;
    if (eval0 < beta) beta = eval0;
  }

  const currentColor = maximizing ? aiColor : (aiColor === RED ? BLACK : RED);
  const moves = getLegalMoves(board, currentColor).filter(m => m.capType !== null);

  // Sort captures by MVV-LVA
  moves.sort((a, b) => (PIECE_VALUES[b.capType] || 0) - (PIECE_VALUES[a.capType] || 0));

  if (maximizing) {
    for (const move of moves) {
      const { board: nb } = makeMove(board, move);
      const val = quiescence(nb, currentColor, alpha, beta, false, aiColor, depth - 1);
      if (val > alpha) alpha = val;
      if (alpha >= beta) break;
    }
    return alpha;
  } else {
    for (const move of moves) {
      const { board: nb } = makeMove(board, move);
      const val = quiescence(nb, currentColor, alpha, beta, true, aiColor, depth - 1);
      if (val < beta) beta = val;
      if (alpha >= beta) break;
    }
    return beta;
  }
}

// --- Alpha-Beta with all enhancements ---
function alphaBetaEnhanced(board, depth, alpha, beta, maximizing, aiColor, ply, startTime, timeLimit) {
  if (Date.now() - startTime > timeLimit) return { score: 0, move: null, timeout: true };

  const currentColor = maximizing ? aiColor : (aiColor === RED ? BLACK : RED);
  const hash = computeHash(board, currentColor);

  // TT lookup
  const ttScore = ttProbe(hash, depth, alpha, beta);
  if (ttScore !== null && ply > 0) return { score: ttScore, move: null };

  const moves = getLegalMoves(board, currentColor);

  if (moves.length === 0) {
    if (isInCheck(board, currentColor)) return { score: maximizing ? -INF + ply : INF - ply, move: null };
    return { score: 0, move: null };
  }

  // Leaf node -> quiescence
  if (depth <= 0) {
    const qs = quiescence(board, currentColor, alpha, beta, maximizing, aiColor, 0);
    return { score: qs, move: null };
  }

  // Order moves
  const ordered = orderMoves(moves, board, ply, hash);

  let bestMove = ordered[0];
  let ttFlag = TT_ALPHA;

  if (maximizing) {
    let maxEval = -INF;
    for (const move of ordered) {
      const { board: nb } = makeMove(board, move);

      // Check extension: if the move gives check, search one ply deeper
      const givesCheck = isInCheck(nb, currentColor === RED ? BLACK : RED);
      const ext = givesCheck ? 1 : 0;

      const result = alphaBetaEnhanced(nb, depth - 1 + ext, alpha, beta, false, aiColor, ply + 1, startTime, timeLimit);
      if (result.timeout) return result;

      if (result.score > maxEval) {
        maxEval = result.score;
        bestMove = move;
      }
      if (maxEval > alpha) {
        alpha = maxEval;
        ttFlag = TT_EXACT;
      }
      if (alpha >= beta) {
        // Store killer & history for non-captures
        if (!move.capType) {
          storeKiller(ply, move);
          storeHistory(move, depth);
        }
        ttStore(hash, depth, beta, TT_BETA, bestMove);
        return { score: beta, move: bestMove };
      }
    }
    ttStore(hash, depth, maxEval, ttFlag, bestMove);
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = INF;
    for (const move of ordered) {
      const { board: nb } = makeMove(board, move);

      const givesCheck = isInCheck(nb, currentColor === RED ? BLACK : RED);
      const ext = givesCheck ? 1 : 0;

      const result = alphaBetaEnhanced(nb, depth - 1 + ext, alpha, beta, true, aiColor, ply + 1, startTime, timeLimit);
      if (result.timeout) return result;

      if (result.score < minEval) {
        minEval = result.score;
        bestMove = move;
      }
      if (minEval < beta) {
        beta = minEval;
        ttFlag = TT_EXACT;
      }
      if (alpha >= beta) {
        if (!move.capType) {
          storeKiller(ply, move);
          storeHistory(move, depth);
        }
        ttStore(hash, depth, alpha, TT_ALPHA, bestMove);
        return { score: alpha, move: bestMove };
      }
    }
    ttStore(hash, depth, minEval, ttFlag, bestMove);
    return { score: minEval, move: bestMove };
  }
}

// --- Iterative Deepening ---
function findBestMove(board, color, maxDepth, timeLimitMs) {
  const startTime = Date.now();
  initKillers(maxDepth + 4);
  initHistory();

  let bestMove = null;
  let bestScore = 0;
  let searchedDepth = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    const result = alphaBetaEnhanced(board, depth, -INF, INF, true, color, 0, startTime, timeLimitMs);
    if (result.timeout) break;
    if (result.move) {
      bestMove = result.move;
      bestScore = result.score;
      searchedDepth = depth;
    }
    // Early exit on forced mate
    if (Math.abs(result.score) > INF - 100) break;
    // Time check: if we used > 60% of time, don't start next depth
    if (Date.now() - startTime > timeLimitMs * 0.6) break;
  }

  return { move: bestMove, time: Date.now() - startTime, depth: searchedDepth, score: bestScore };
}

// ═══════════════════════════════════════════
//  DIFFICULTY SETTINGS
// ═══════════════════════════════════════════
const DIFFICULTY = {
  "入門": { depth: 2, time: 2000 },
  "業餘": { depth: 4, time: 5000 },
  "棋手": { depth: 6, time: 10000 },
  "大師": { depth: 8, time: 15000 },
};
const MODES = ["AI vs AI", "人類 vs AI", "人類 vs 人類"];

// ═══════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════
export default function ChineseChess() {
  const [board, setBoard] = useState(createInitialBoard);
  const [turn, setTurn] = useState(RED);
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMovesState] = useState([]);
  const [mode, setMode] = useState("AI vs AI");
  const [difficulty, setDifficulty] = useState("棋手");
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(null);
  const [moveCount, setMoveCount] = useState(0);
  const [lastMove, setLastMove] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [aiInfo, setAiInfo] = useState({ red: null, black: null });
  const [capturedRed, setCapturedRed] = useState([]);
  const [capturedBlack, setCapturedBlack] = useState([]);
  const [inCheck, setInCheck] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const timerRef = useRef(null);
  const boardRef = useRef(board);
  const turnRef = useRef(turn);
  const pausedRef = useRef(paused);
  const gameOverRef = useRef(gameOver);

  boardRef.current = board;
  turnRef.current = turn;
  pausedRef.current = paused;
  gameOverRef.current = gameOver;

  const isAI = useCallback((color) => {
    if (mode === "AI vs AI") return true;
    if (mode === "人類 vs AI") return color === BLACK;
    return false;
  }, [mode]);

  const doMove = useCallback((b, move) => {
    const { board: nb, captured } = makeMove(b, move);
    if (captured) {
      if (captured.color === RED) setCapturedRed(prev => [...prev, captured]);
      else setCapturedBlack(prev => [...prev, captured]);
    }

    const piece = b[move.fr][move.fc];
    setMoveHistory(prev => [...prev, {
      piece: PIECE_NAMES[piece.color][piece.type],
      color: piece.color,
      from: [move.fc, move.fr],
      to: [move.tc, move.tr],
      captured: captured ? PIECE_NAMES[captured.color][captured.type] : null,
    }]);

    setBoard(nb);
    setLastMove(move);
    setSelected(null);
    setLegalMovesState([]);

    const nextTurn = turnRef.current === RED ? BLACK : RED;
    setMoveCount(prev => prev + 1);

    const check = isInCheck(nb, nextTurn);
    setInCheck(check ? nextTurn : null);

    const nextLegal = getLegalMoves(nb, nextTurn);
    if (nextLegal.length === 0) {
      setGameOver(check ? (turnRef.current === RED ? "紅方勝！" : "黑方勝！") : "和棋！");
    }
    setTurn(nextTurn);
  }, []);

  // AI Move
  useEffect(() => {
    if (gameOver || paused || !isAI(turn)) return;
    setThinking(true);
    const { depth, time } = DIFFICULTY[difficulty];

    timerRef.current = setTimeout(() => {
      if (pausedRef.current || gameOverRef.current) { setThinking(false); return; }
      const result = findBestMove(boardRef.current, turnRef.current, depth, time);
      setAiInfo(prev => ({
        ...prev,
        [turnRef.current]: { time: result.time, depth: result.depth, score: result.score }
      }));
      setThinking(false);
      if (result.move) doMove(boardRef.current, result.move);
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [turn, paused, gameOver, mode, difficulty, isAI, doMove]);

  const handleClick = (c, r) => {
    if (gameOver || thinking || isAI(turn)) return;
    const piece = board[r][c];
    if (selected) {
      const isLegal = legalMoves.some(m => m.tc === c && m.tr === r);
      if (isLegal) { doMove(board, { fc: selected.c, fr: selected.r, tc: c, tr: r, capType: board[r][c]?.type || null, pieceType: board[selected.r][selected.c].type }); return; }
      if (piece && piece.color === turn) {
        setSelected({ c, r });
        setLegalMovesState(getLegalMoves(board, turn).filter(m => m.fc === c && m.fr === r));
        return;
      }
      setSelected(null); setLegalMovesState([]); return;
    }
    if (piece && piece.color === turn) {
      setSelected({ c, r });
      setLegalMovesState(getLegalMoves(board, turn).filter(m => m.fc === c && m.fr === r));
    }
  };

  const reset = () => {
    ttable.clear();
    setBoard(createInitialBoard());
    setTurn(RED); setSelected(null); setLegalMovesState([]);
    setGameOver(null); setMoveCount(0); setLastMove(null);
    setThinking(false); setAiInfo({ red: null, black: null });
    setCapturedRed([]); setCapturedBlack([]);
    setInCheck(null); setPaused(false); setMoveHistory([]);
  };

  const bw = (COLS - 1) * CELL, bh = (ROWS - 1) * CELL;
  const svgW = bw + PAD * 2, svgH = bh + PAD * 2;
  const toX = c => PAD + c * CELL, toY = r => PAD + r * CELL;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0f0c08 0%, #1e1810 40%, #16120c 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "12px 8px",
      fontFamily: "'Noto Serif TC','Noto Serif SC','Songti SC',serif",
      color: "#e8d5b0",
    }}>
      <h1 style={{
        fontSize: "26px", fontWeight: 700, margin: "0 0 6px",
        letterSpacing: "10px",
        background: "linear-gradient(180deg, #f5dfa0 0%, #b8912e 100%)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>中 國 象 棋</h1>
      <div style={{ fontSize: "11px", opacity: 0.4, marginBottom: "8px", letterSpacing: "2px" }}>
        進階 AI 引擎 · Minimax + α-β剪枝 + 置換表 + 靜態搜索
      </div>

      {/* Black info */}
      <InfoBar color={BLACK} turn={turn} thinking={thinking} aiInfo={aiInfo.black}
        captured={capturedBlack} inCheck={inCheck === BLACK} isAI={isAI(BLACK)} />

      {/* Board SVG */}
      <div style={{
        position: "relative", borderRadius: "8px",
        boxShadow: inCheck
          ? `0 0 40px 12px ${inCheck === RED ? "rgba(255,60,60,0.4)" : "rgba(60,60,255,0.4)"}`
          : "0 8px 40px rgba(0,0,0,0.7)",
        transition: "box-shadow 0.5s",
      }}>
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ display: "block", maxWidth: "100%", height: "auto" }}>
          <defs>
            <linearGradient id="woodBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4a85c"/>
              <stop offset="20%" stopColor="#c99845"/>
              <stop offset="50%" stopColor="#d4a85c"/>
              <stop offset="80%" stopColor="#bf9040"/>
              <stop offset="100%" stopColor="#d4a85c"/>
            </linearGradient>
            <filter id="woodGrain">
              <feTurbulence type="fractalNoise" baseFrequency="0.03 0.25" numOctaves="5" result="n"/>
              <feColorMatrix type="saturate" values="0" in="n" result="g"/>
              <feBlend in="SourceGraphic" in2="g" mode="multiply"/>
            </filter>
            <radialGradient id="pieceRedBg" cx="38%" cy="32%" r="62%">
              <stop offset="0%" stopColor="#fff8e8"/><stop offset="60%" stopColor="#f0dfc0"/>
              <stop offset="100%" stopColor="#d8c8a0"/>
            </radialGradient>
            <radialGradient id="pieceBlackBg" cx="38%" cy="32%" r="62%">
              <stop offset="0%" stopColor="#f8f0e0"/><stop offset="60%" stopColor="#e8dcc4"/>
              <stop offset="100%" stopColor="#d0c4a8"/>
            </radialGradient>
            <filter id="pShadow"><feDropShadow dx="1" dy="2" stdDeviation="2.5" floodColor="#00000077"/></filter>
            <filter id="selGlow">
              <feGaussianBlur stdDeviation="5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <rect width={svgW} height={svgH} rx="8" fill="url(#woodBg)" filter="url(#woodGrain)"/>
          <rect x={PAD-14} y={PAD-14} width={bw+28} height={bh+28} fill="none" stroke="#8b6914" strokeWidth="3" rx="4"/>
          <rect x={PAD-10} y={PAD-10} width={bw+20} height={bh+20} fill="none" stroke="#8b691466" strokeWidth="1" rx="2"/>

          {/* Grid */}
          {Array.from({length:ROWS},(_,i)=>(
            <line key={`h${i}`} x1={toX(0)} y1={toY(i)} x2={toX(8)} y2={toY(i)} stroke="#5a3e1b" strokeWidth="1.2"/>
          ))}
          {Array.from({length:COLS},(_,i)=>(
            <g key={`v${i}`}>
              <line x1={toX(i)} y1={toY(0)} x2={toX(i)} y2={toY(4)} stroke="#5a3e1b" strokeWidth="1.2"/>
              <line x1={toX(i)} y1={toY(5)} x2={toX(i)} y2={toY(9)} stroke="#5a3e1b" strokeWidth="1.2"/>
            </g>
          ))}
          <line x1={toX(0)} y1={toY(0)} x2={toX(0)} y2={toY(9)} stroke="#5a3e1b" strokeWidth="1.2"/>
          <line x1={toX(8)} y1={toY(0)} x2={toX(8)} y2={toY(9)} stroke="#5a3e1b" strokeWidth="1.2"/>

          {/* Palace */}
          <line x1={toX(3)} y1={toY(0)} x2={toX(5)} y2={toY(2)} stroke="#5a3e1b" strokeWidth="1"/>
          <line x1={toX(5)} y1={toY(0)} x2={toX(3)} y2={toY(2)} stroke="#5a3e1b" strokeWidth="1"/>
          <line x1={toX(3)} y1={toY(7)} x2={toX(5)} y2={toY(9)} stroke="#5a3e1b" strokeWidth="1"/>
          <line x1={toX(5)} y1={toY(7)} x2={toX(3)} y2={toY(9)} stroke="#5a3e1b" strokeWidth="1"/>

          {/* River */}
          <rect x={toX(0)+1} y={toY(4)+1} width={bw-2} height={CELL-2} fill="#d4a85c" opacity="0.5"/>
          <text x={svgW/2-82} y={toY(4)+CELL/2+8} fontSize="22" fill="#5a3e1b88"
            fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold" letterSpacing="16">楚河</text>
          <text x={svgW/2+26} y={toY(4)+CELL/2+8} fontSize="22" fill="#5a3e1b88"
            fontFamily="'KaiTi','STKaiti',serif" fontWeight="bold" letterSpacing="16">漢界</text>

          {/* Last move */}
          {lastMove && <>
            <rect x={toX(lastMove.fc)-PIECE_R-2} y={toY(lastMove.fr)-PIECE_R-2}
              width={(PIECE_R+2)*2} height={(PIECE_R+2)*2} rx="4"
              fill="none" stroke="#f0c04066" strokeWidth="2" strokeDasharray="4,3"/>
            <rect x={toX(lastMove.tc)-PIECE_R-2} y={toY(lastMove.tr)-PIECE_R-2}
              width={(PIECE_R+2)*2} height={(PIECE_R+2)*2} rx="4"
              fill="none" stroke="#f0c040cc" strokeWidth="2.5"/>
          </>}

          {/* Legal hints */}
          {legalMoves.map((m,i) => board[m.tr][m.tc]
            ? <circle key={i} cx={toX(m.tc)} cy={toY(m.tr)} r={PIECE_R+4}
                fill="none" stroke="#ff444477" strokeWidth="3" strokeDasharray="5,3"/>
            : <circle key={i} cx={toX(m.tc)} cy={toY(m.tr)} r={9} fill="#44994466"/>
          )}

          {/* Pieces */}
          {board.map((row, r) => row.map((piece, c) => {
            if (!piece) return null;
            const isSel = selected && selected.c === c && selected.r === r;
            const isRed = piece.color === RED;
            const nm = PIECE_NAMES[piece.color][piece.type];
            const px = toX(c), py = toY(r);
            return (
              <g key={piece.id||`${c}-${r}`} onClick={()=>handleClick(c,r)}
                style={{ cursor:"pointer" }} filter={isSel?"url(#selGlow)":"url(#pShadow)"}>
                <circle cx={px} cy={py} r={PIECE_R+1}
                  fill={isRed?"#8b1a1a":"#2a2a3a"}
                  stroke={isSel?"#ffd700":(isRed?"#6b1010":"#1a1a2a")}
                  strokeWidth={isSel?3:1}/>
                <circle cx={px} cy={py} r={PIECE_R-2}
                  fill={isRed?"url(#pieceRedBg)":"url(#pieceBlackBg)"}
                  stroke={isRed?"#c0392b":"#2c3e50"} strokeWidth="1.5"/>
                <circle cx={px} cy={py} r={PIECE_R-5}
                  fill="none" stroke={isRed?"#c0392b55":"#2c3e5055"} strokeWidth="0.8"/>
                <text x={px} y={py+8} textAnchor="middle" fontSize="22" fontWeight="bold"
                  fontFamily="'Noto Serif TC','Noto Serif SC','SimSun',serif"
                  fill={isRed?"#c0392b":"#1a1a3a"}>{nm}</text>
                {isSel && <circle cx={px} cy={py} r={PIECE_R+4} fill="none" stroke="#ffd700" strokeWidth="2" opacity="0.7">
                  <animate attributeName="r" values={`${PIECE_R+3};${PIECE_R+7};${PIECE_R+3}`} dur="1.2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.2s" repeatCount="indefinite"/>
                </circle>}
              </g>
            );
          }))}

          {/* Click targets */}
          {Array.from({length:ROWS},(_,r)=>
            Array.from({length:COLS},(_,c)=>{
              if(board[r][c])return null;
              return <circle key={`t${c}-${r}`} cx={toX(c)} cy={toY(r)} r={PIECE_R}
                fill="transparent" onClick={()=>handleClick(c,r)} style={{cursor:"pointer"}}/>;
            })
          )}
        </svg>
      </div>

      {/* Red info */}
      <InfoBar color={RED} turn={turn} thinking={thinking} aiInfo={aiInfo.red}
        captured={capturedRed} inCheck={inCheck === RED} isAI={isAI(RED)} />

      {/* Controls */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", justifyContent:"center",
        marginTop:"10px", maxWidth:"560px" }}>
        <CG label="模式">
          {MODES.map(m=><Btn key={m} active={mode===m} onClick={()=>{setMode(m);reset();}}>{m}</Btn>)}
        </CG>
        <CG label="難度">
          {Object.keys(DIFFICULTY).map(d=><Btn key={d} active={difficulty===d} onClick={()=>setDifficulty(d)}>{d}</Btn>)}
        </CG>
        <CG label="控制">
          <Btn onClick={()=>setPaused(p=>!p)}>{paused?"▶ 繼續":"⏸ 暫停"}</Btn>
          <Btn onClick={reset}>🔄 重來</Btn>
        </CG>
      </div>

      {/* Status */}
      <div style={{ marginTop:"8px", fontSize:"13px", opacity:0.6, textAlign:"center" }}>
        第 {Math.ceil(moveCount/2)||1} 回合 ·
        {gameOver?` ${gameOver}`:turn===RED?" 紅方走":" 黑方走"}
        {thinking&&" · AI 思考中..."}
        {paused&&!gameOver&&" · ⏸ 已暫停"}
      </div>

      {/* Move log */}
      {moveHistory.length > 0 && (
        <div style={{
          marginTop: "10px", maxWidth: "560px", width: "100%",
          background: "rgba(255,255,255,0.03)", borderRadius: "8px",
          padding: "8px 12px", maxHeight: "100px", overflowY: "auto",
        }}>
          <div style={{ fontSize: "11px", opacity: 0.4, marginBottom: "4px" }}>棋譜</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", fontSize: "12px" }}>
            {moveHistory.map((m, i) => (
              <span key={i} style={{
                color: m.color === RED ? "#e07060" : "#7088cc",
                opacity: 0.7,
              }}>
                {m.piece}
                {m.from[0]+1}→{m.to[0]+1}
                {m.captured && `×${m.captured}`}
                {i < moveHistory.length - 1 && <span style={{ opacity: 0.3 }}> · </span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {gameOver && (
        <div style={{
          position:"fixed",top:0,left:0,right:0,bottom:0,
          background:"rgba(0,0,0,0.75)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,
        }} onClick={reset}>
          <div style={{
            background:"linear-gradient(135deg,#2a2018,#3a2c1c)",
            borderRadius:"16px", padding:"40px 60px", textAlign:"center",
            border:"2px solid #c4a34a", boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
          }}>
            <div style={{fontSize:"44px",marginBottom:"8px"}}>
              {gameOver.includes("和")?"🤝":"🏆"}
            </div>
            <div style={{
              fontSize:"30px",fontWeight:"bold",
              background:"linear-gradient(180deg,#f0d68a,#c4a34a)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
            }}>{gameOver}</div>
            <div style={{marginTop:"16px",fontSize:"13px",opacity:0.5}}>
              共 {moveCount} 步 · 點擊任意處重新開局
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════
function InfoBar({ color, turn, thinking, aiInfo, captured, inCheck, isAI }) {
  const isRed = color === RED;
  const isTurn = turn === color;
  const label = isRed ? "紅方" : "黑方";
  const dot = isRed ? "#e74c3c" : "#5566bb";

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:"10px",
      padding:"7px 14px", margin:"3px 0", borderRadius:"8px",
      background: isTurn ? "rgba(255,255,255,0.05)" : "transparent",
      border: isTurn ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
      minWidth:"300px", maxWidth:"560px", width:"100%", transition:"all 0.3s",
    }}>
      <div style={{
        width:"11px",height:"11px",borderRadius:"50%",background:dot,
        boxShadow:isTurn?`0 0 10px ${dot}`:"none", transition:"box-shadow 0.3s",
      }}/>
      <span style={{fontWeight:700,fontSize:"14px",minWidth:"36px"}}>{label}</span>
      <span style={{fontSize:"11px",opacity:0.4,
        background: isAI ? "rgba(255,255,255,0.06)" : "rgba(100,200,100,0.1)",
        padding:"1px 6px",borderRadius:"4px",
      }}>{isAI?"AI":"人類"}</span>
      {aiInfo && (
        <span style={{fontSize:"10px",opacity:0.35}}>
          ⏱{aiInfo.time}ms · 深度{aiInfo.depth} · 分數{aiInfo.score>0?"+":""}{aiInfo.score}
        </span>
      )}
      {isTurn && thinking && (
        <span style={{fontSize:"11px",opacity:0.8}}>
          <span style={{display:"inline-block",animation:"spin 1s linear infinite",
            transformOrigin:"center"}}>⚙</span> 思考中
        </span>
      )}
      {inCheck && <span style={{fontSize:"12px",color:"#ff6b6b",fontWeight:"bold"}}>⚠ 將軍!</span>}
      <div style={{flex:1}}/>
      <div style={{display:"flex",gap:"2px",flexWrap:"wrap",maxWidth:"130px"}}>
        {captured.map((p,i)=>(
          <span key={i} style={{fontSize:"13px",color:p.color===RED?"#c0392b":"#5566aa",opacity:0.6}}>
            {PIECE_NAMES[p.color][p.type]}
          </span>
        ))}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function CG({label,children}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:"3px",
      background:"rgba(255,255,255,0.03)",borderRadius:"8px",padding:"3px 8px"}}>
      <span style={{fontSize:"11px",opacity:0.4,marginRight:"3px"}}>{label}</span>
      {children}
    </div>
  );
}

function Btn({children,active,onClick}){
  return(
    <button onClick={onClick} style={{
      padding:"4px 11px",borderRadius:"6px",border:"none",
      background:active?"linear-gradient(135deg,#c4a34a,#a08030)":"rgba(255,255,255,0.06)",
      color:active?"#1a1410":"#e8d5b0",fontWeight:active?700:400,
      fontSize:"12px",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
    }}>{children}</button>
  );
}
