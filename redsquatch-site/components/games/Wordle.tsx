'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';

const WORD_LIST = [
  'ABOUT', 'ABOVE', 'ABUSE', 'ACRES', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER',
  'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIKE', 'ALIVE', 'ALLOW',
  'ALONE', 'ALONG', 'ALTER', 'ANGEL', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY',
  'ARENA', 'ARGUE', 'ARISE', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'AVOID', 'AWAKE', 'AWARD',
  'AWARE', 'BADLY', 'BAKER', 'BASES', 'BASIC', 'BASIN', 'BATCH', 'BEACH', 'BEGAN', 'BEGIN',
  'BEGUN', 'BEING', 'BELOW', 'BENCH', 'BILLY', 'BIRTH', 'BLACK', 'BLADE', 'BLAME', 'BLANK',
  'BLAST', 'BLEED', 'BLEND', 'BLESS', 'BLIND', 'BLOCK', 'BLOOD', 'BLOOM', 'BLOWN', 'BOARD',
  'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BRASS', 'BRAVE', 'BREAD', 'BREAK', 'BREED',
  'BRICK', 'BRIDE', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN', 'BUILD', 'BUILT', 'BUYER',
  'CABLE', 'CALIF', 'CAMEL', 'CANAL', 'CANDY', 'CANON', 'CARGO', 'CAROL', 'CARRY', 'CASES',
  'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHAOS', 'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHEAT',
  'CHECK', 'CHEEK', 'CHEER', 'CHESS', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHOSE', 'CIVIL',
  'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLERK', 'CLICK', 'CLIFF', 'CLIMB', 'CLOCK', 'CLOSE',
  'CLOTH', 'CLOUD', 'COACH', 'COAST', 'COATS', 'CODES', 'COINS', 'COLD', 'COLON', 'COLOR',
];

interface WordleState {
  guesses: string[];
  currentGuess: string;
  gameStatus: 'playing' | 'won' | 'lost';
  todayWord: string;
  guess: number;
}

interface WordleProps {
  onBack: () => void;
}

export default function Wordle({ onBack }: WordleProps) {
  const [state, setState] = useState<WordleState>({
    guesses: [],
    currentGuess: '',
    gameStatus: 'playing',
    todayWord: '',
    guess: 0,
  });

  useEffect(() => {
    const storedState = localStorage.getItem('wordle-state');
    const storedDate = localStorage.getItem('wordle-date');
    const today = new Date().toDateString();

    if (storedState && storedDate === today) {
      setState(JSON.parse(storedState));
    } else {
      const todayWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
      setState({
        guesses: [],
        currentGuess: '',
        gameStatus: 'playing',
        todayWord,
        guess: 0,
      });
      localStorage.setItem('wordle-date', today);
    }
  }, []);

  useEffect(() => {
    if (state.todayWord) {
      localStorage.setItem('wordle-state', JSON.stringify(state));
    }
  }, [state]);

  const handleKeyPress = (key: string) => {
    if (state.gameStatus !== 'playing') return;

    if (key === 'Backspace') {
      setState(prev => ({ ...prev, currentGuess: prev.currentGuess.slice(0, -1) }));
      return;
    }

    if (key === 'Enter') {
      submitGuess();
      return;
    }

    if (/^[A-Z]$/.test(key) && state.currentGuess.length < 5) {
      setState(prev => ({ ...prev, currentGuess: prev.currentGuess + key }));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleKeyPress(e.key.toUpperCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.gameStatus, state.currentGuess]);

  const submitGuess = () => {
    if (state.currentGuess.length !== 5) return;
    if (!WORD_LIST.includes(state.currentGuess)) return;

    const newGuesses = [...state.guesses, state.currentGuess];
    const won = state.currentGuess === state.todayWord;
    const lost = newGuesses.length === 6 && !won;

    setState(prev => ({
      ...prev,
      guesses: newGuesses,
      currentGuess: '',
      gameStatus: won ? 'won' : lost ? 'lost' : 'playing',
      guess: newGuesses.length,
    }));
  };

  const resetGame = () => {
    const todayWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    const newState = {
      guesses: [],
      currentGuess: '',
      gameStatus: 'playing' as const,
      todayWord,
      guess: 0,
    };
    setState(newState);
    localStorage.setItem('wordle-state', JSON.stringify(newState));
  };

  const getLetterColor = (letter: string, index: number, guess: string): string => {
    if (letter === state.todayWord[index]) return '#22c55e'; // green
    if (state.todayWord.includes(letter)) return '#eab308'; // yellow
    return '#6b7280'; // gray
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

      {/* Guesses */}
      <div className="grid gap-2">
        {Array(6)
          .fill(0)
          .map((_, row) => (
            <div key={row} className="flex gap-2">
              {Array(5)
                .fill(0)
                .map((_, col) => {
                  const guess = state.guesses[row];
                  const letter = guess ? guess[col] : '';
                  const isCurrent = row === state.guess;
                  const currentLetter = isCurrent ? state.currentGuess[col] : '';

                  return (
                    <div
                      key={col}
                      className="w-12 h-12 flex items-center justify-center rounded border-2 font-bold text-lg"
                      style={{
                        borderColor: guess
                          ? 'transparent'
                          : isCurrent
                            ? 'rgba(184,115,51,0.5)'
                            : 'rgba(184,115,51,0.2)',
                        background: guess
                          ? getLetterColor(letter, col, guess)
                          : 'transparent',
                        color: guess ? 'white' : 'rgba(212,163,115,0.9)',
                      }}
                    >
                      {letter || currentLetter}
                    </div>
                  );
                })}
            </div>
          ))}
      </div>

      {/* Keyboard */}
      <div className="flex flex-col gap-2 mt-4">
        {[
          ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
          ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
          ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
        ].map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1 justify-center">
            {rowIdx === 2 && (
              <button
                onClick={() => handleKeyPress('Backspace')}
                className="px-3 py-2 rounded text-xs border transition-all"
                style={{
                  borderColor: 'rgba(184,115,51,0.3)',
                  color: '#d4a373',
                }}
              >
                ⌫
              </button>
            )}
            {row.map(letter => (
              <button
                key={letter}
                onClick={() => handleKeyPress(letter)}
                className="px-2.5 py-1.5 rounded text-xs font-semibold border transition-all"
                style={{
                  borderColor: 'rgba(184,115,51,0.3)',
                  color: '#d4a373',
                  background: state.guesses.flat().includes(letter) ? 'rgba(184,115,51,0.1)' : 'transparent',
                }}
              >
                {letter}
              </button>
            ))}
            {rowIdx === 2 && (
              <button
                onClick={() => submitGuess()}
                className="px-3 py-2 rounded text-xs border font-semibold transition-all"
                style={{
                  borderColor: 'rgba(184,115,51,0.3)',
                  color: '#d4a373',
                }}
              >
                Enter
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Status */}
      {state.gameStatus !== 'playing' && (
        <div className="mt-4 p-4 rounded-lg text-center" style={{ background: 'rgba(184,115,51,0.1)' }}>
          <p className="font-bold mb-2" style={{ color: state.gameStatus === 'won' ? '#22c55e' : '#ef4444' }}>
            {state.gameStatus === 'won' ? '🎉 You Won!' : `😢 Game Over! Word: ${state.todayWord}`}
          </p>
          <button
            onClick={resetGame}
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
