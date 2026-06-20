'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';

interface GameState {
  board: number[][];
  score: number;
  gameOver: boolean;
  won: boolean;
}

interface Game2048Props {
  onBack: () => void;
}

export default function TwentyFortyEight({ onBack }: Game2048Props) {
  const [state, setState] = useState<GameState>({
    board: Array(4)
      .fill(0)
      .map(() => Array(4).fill(0)),
    score: 0,
    gameOver: false,
    won: false,
  });

  useEffect(() => {
    const storedState = localStorage.getItem('2048-state');
    if (storedState) {
      setState(JSON.parse(storedState));
    } else {
      initializeGame();
    }
  }, []);

  const initializeGame = () => {
    const board = Array(4)
      .fill(0)
      .map(() => Array(4).fill(0));
    addNewTile(board);
    addNewTile(board);
    const newState = { board, score: 0, gameOver: false, won: false };
    setState(newState);
    localStorage.setItem('2048-state', JSON.stringify(newState));
  };

  const addNewTile = (board: number[][], value?: number) => {
    const empty = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (board[i][j] === 0) empty.push({ i, j });
      }
    }
    if (empty.length > 0) {
      const { i, j } = empty[Math.floor(Math.random() * empty.length)];
      board[i][j] = value || (Math.random() < 0.9 ? 2 : 4);
    }
  };

  const move = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (state.gameOver || state.won) return;

      let board = state.board.map(row => [...row]);
      let score = state.score;
      let moved = false;

      const compress = (line: number[]) => {
        const newLine = line.filter(val => val !== 0);
        while (newLine.length < 4) newLine.push(0);
        return newLine;
      };

      const merge = (line: number[]) => {
        for (let i = 0; i < 3; i++) {
          if (line[i] !== 0 && line[i] === line[i + 1]) {
            line[i] *= 2;
            score += line[i];
            line.splice(i + 1, 1);
            line.push(0);
          }
        }
        return line;
      };

      const slide = (line: number[]) => {
        let newLine = compress(line);
        newLine = merge(newLine);
        newLine = compress(newLine);
        return newLine;
      };

      const oldBoard = board.map(row => [...row]);

      if (direction === 'left' || direction === 'right') {
        for (let i = 0; i < 4; i++) {
          if (direction === 'left') {
            board[i] = slide(board[i]);
          } else {
            board[i] = slide(board[i].reverse()).reverse();
          }
        }
      } else {
        for (let j = 0; j < 4; j++) {
          let column = [board[0][j], board[1][j], board[2][j], board[3][j]];
          if (direction === 'up') {
            column = slide(column);
          } else {
            column = slide(column.reverse()).reverse();
          }
          for (let i = 0; i < 4; i++) {
            board[i][j] = column[i];
          }
        }
      }

      moved = JSON.stringify(board) !== JSON.stringify(oldBoard);

      if (moved) {
        addNewTile(board);

        const won = board.some(row => row.some(cell => cell === 2048));
        const empty = board.some(row => row.some(cell => cell === 0));
        let canMove = false;

        if (!empty && !won) {
          for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
              if (
                (j < 3 && board[i][j] === board[i][j + 1]) ||
                (i < 3 && board[i][j] === board[i + 1][j])
              ) {
                canMove = true;
              }
            }
          }
        }

        const newState = {
          board,
          score,
          gameOver: !canMove && empty === false,
          won: won || state.won,
        };
        setState(newState);
        localStorage.setItem('2048-state', JSON.stringify(newState));
      }
    },
    [state]
  );

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const directionMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
        };
        move(directionMap[e.key]);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [move]);

  const getTileColor = (value: number): string => {
    const colors: Record<number, string> = {
      2: '#eee4da',
      4: '#ede0c8',
      8: '#f2b179',
      16: '#f59563',
      32: '#f67c5f',
      64: '#f65e3b',
      128: '#edcf72',
      256: '#edcc61',
      512: '#edc850',
      1024: '#edc53f',
      2048: '#edc22e',
    };
    return colors[value] || '#3c3c3c';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={onBack}
        className="self-start flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
        style={{ color: '#d4a373' }}
      >
        <ChevronLeft size={16} />
        Back
      </button>

      {/* Score */}
      <div className="text-center">
        <p className="text-sm" style={{ color: 'rgba(212,163,115,0.7)' }}>
          Score
        </p>
        <p className="text-3xl font-bold" style={{ color: '#d4a373' }}>
          {state.score}
        </p>
      </div>

      {/* Game Board */}
      <div
        className="grid grid-cols-4 gap-2 p-4 rounded-lg"
        style={{ background: 'rgba(184,115,51,0.1)', width: 'fit-content' }}
      >
        {state.board.map((row, i) =>
          row.map((cell, j) => (
            <div
              key={`${i}-${j}`}
              className="w-16 h-16 flex items-center justify-center rounded font-bold text-xl transition-all"
              style={{
                background: cell === 0 ? 'rgba(184,115,51,0.05)' : getTileColor(cell),
                color: cell > 4 ? 'white' : '#3c3c3c',
              }}
            >
              {cell > 0 ? cell : ''}
            </div>
          ))
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap justify-center">
        <button
          onClick={() => move('up')}
          className="px-4 py-2 rounded border text-sm font-semibold transition-all"
          style={{ borderColor: 'rgba(184,115,51,0.3)', color: '#d4a373' }}
        >
          ↑
        </button>
        <button
          onClick={() => move('left')}
          className="px-4 py-2 rounded border text-sm font-semibold transition-all"
          style={{ borderColor: 'rgba(184,115,51,0.3)', color: '#d4a373' }}
        >
          ←
        </button>
        <button
          onClick={() => move('down')}
          className="px-4 py-2 rounded border text-sm font-semibold transition-all"
          style={{ borderColor: 'rgba(184,115,51,0.3)', color: '#d4a373' }}
        >
          ↓
        </button>
        <button
          onClick={() => move('right')}
          className="px-4 py-2 rounded border text-sm font-semibold transition-all"
          style={{ borderColor: 'rgba(184,115,51,0.3)', color: '#d4a373' }}
        >
          →
        </button>
      </div>

      {/* Status */}
      {(state.gameOver || state.won) && (
        <div className="mt-4 p-4 rounded-lg text-center" style={{ background: 'rgba(184,115,51,0.1)' }}>
          <p className="font-bold mb-2" style={{ color: state.won ? '#22c55e' : '#ef4444' }}>
            {state.gameOver ? '💥 Game Over!' : '🎉 You Reached 2048!'}
          </p>
          <button
            onClick={() => initializeGame()}
            className="px-4 py-2 rounded border transition-all text-sm font-medium"
            style={{
              borderColor: 'rgba(184,115,51,0.4)',
              color: '#d4a373',
            }}
          >
            New Game
          </button>
        </div>
      )}
    </div>
  );
}
