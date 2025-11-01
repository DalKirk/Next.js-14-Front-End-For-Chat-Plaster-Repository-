'use client';

import React, { useState, useEffect, useRef } from 'react';

interface GuessHistory {
  word: string;
  matches: number;
}

type GameState = 'menu' | 'playing' | 'success' | 'failed';
type Difficulty = 'easy' | 'medium' | 'hard';

export default function HackingGame() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [attempts, setAttempts] = useState(4);
  const [words, setWords] = useState<string[]>([]);
  const [targetWord, setTargetWord] = useState('');
  const [guessHistory, setGuessHistory] = useState<GuessHistory[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const wordLists: Record<Difficulty, string[]> = {
    easy: ['BOOT', 'CODE', 'DATA', 'DISK', 'FILE', 'HACK', 'LOOP', 'NODE', 'PORT', 'SCAN', 'SYNC', 'TECH', 'USER', 'WIRE'],
    medium: ['BINARY', 'CIPHER', 'CRYPTO', 'DAEMON', 'KERNEL', 'MATRIX', 'PACKET', 'ROUTER', 'SENSOR', 'SERVER', 'SOCKET', 'SYSTEM', 'THREAD', 'VECTOR'],
    hard: ['ALGORITHM', 'BANDWIDTH', 'CHECKSUM', 'DATABASE', 'DECRYPTION', 'FIREWALL', 'INTERFACE', 'PROTOCOL', 'PROCESSOR', 'SECURITY', 'TERMINAL', 'TRANSPONDER']
  };

  const getMatchingLetters = (word1: string, word2: string) => {
    let matches = 0;
    for (let i = 0; i < word1.length; i++) {
      if (word1[i] === word2[i]) matches++;
    }
    return matches;
  };

  const startGame = (level: Difficulty) => {
    setDifficulty(level);
    const wordList = wordLists[level];
    const target = wordList[Math.floor(Math.random() * wordList.length)];
    
    let selectedWords = [target];
    const numWords = level === 'easy' ? 8 : level === 'medium' ? 10 : 12;
    while (selectedWords.length < numWords) {
      const word = wordList[Math.floor(Math.random() * wordList.length)];
      if (!selectedWords.includes(word)) {
        selectedWords.push(word);
      }
    }
    
    selectedWords.sort(() => Math.random() - 0.5);
    
    setWords(selectedWords);
    setTargetWord(target);
    const attemptsCount = level === 'easy' ? 4 : level === 'medium' ? 3 : 2;
    setAttempts(attemptsCount);
    setGuessHistory([]);
    setTimeLeft(level === 'easy' ? 90 : level === 'medium' ? 60 : 45);
    setGameState('playing');
  };

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('failed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState]);

  const handleGuess = (word: string) => {
    if (word === targetWord) {
      const timeBonus = Math.floor(timeLeft * 10);
      const attemptBonus = attempts * 100;
      const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
      const earnedScore = (500 + timeBonus + attemptBonus) * difficultyMultiplier;
      setScore(prev => prev + earnedScore);
      setGameState('success');
    } else {
      const matches = getMatchingLetters(word, targetWord);
      setGuessHistory(prev => [...prev, { word, matches }]);
      setAttempts(prev => {
        if (prev <= 1) {
          setGameState('failed');
          return 0;
        }
        return prev - 1;
      });
    }
  };

  const resetGame = () => {
    setGameState('menu');
    setGuessHistory([]);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-2 sm:p-4 font-mono select-none">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="bg-green-900 border-2 border-green-500 p-2 sm:p-4 mb-2 sm:mb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-xl">💻</span>
              <h1 className="text-green-400 text-sm sm:text-xl md:text-2xl font-bold">ROBCO INDUSTRIES UOS</h1>
            </div>
            <div className="text-green-400 text-sm sm:text-lg">SCORE: {score}</div>
          </div>
        </div>

        {/* Menu State */}
        {gameState === 'menu' && (
          <div className="bg-black border-2 border-green-500 p-4 sm:p-8">
            <div className="text-green-400 text-center space-y-4 sm:space-y-6">
              <div className="flex justify-center mb-4 sm:mb-6">
                <span className="text-5xl animate-pulse">🔒</span>
              </div>
              <h2 className="text-xl sm:text-3xl mb-2 sm:mb-4">INITIALIZE HACKING SEQUENCE</h2>
              <p className="text-sm sm:text-lg mb-4 sm:mb-8">Select difficulty level to breach system</p>
              
              <div className="space-y-3 sm:space-y-4 max-w-md mx-auto">
                <button
                  onClick={() => startGame('easy')}
                  className="w-full bg-green-900 hover:bg-green-700 active:bg-green-600 border-2 border-green-500 text-green-400 py-3 sm:py-4 px-4 sm:px-6 text-base sm:text-xl transition-colors touch-manipulation"
                >
                  &gt; EASY [4 ATTEMPTS | 90s]
                </button>
                <button
                  onClick={() => startGame('medium')}
                  className="w-full bg-green-900 hover:bg-green-700 active:bg-green-600 border-2 border-green-500 text-green-400 py-3 sm:py-4 px-4 sm:px-6 text-base sm:text-xl transition-colors touch-manipulation"
                >
                  &gt; MEDIUM [3 ATTEMPTS | 60s]
                </button>
                <button
                  onClick={() => startGame('hard')}
                  className="w-full bg-green-900 hover:bg-green-700 active:bg-green-600 border-2 border-green-500 text-green-400 py-3 sm:py-4 px-4 sm:px-6 text-base sm:text-xl transition-colors touch-manipulation"
                >
                  &gt; HARD [2 ATTEMPTS | 45s]
                </button>
              </div>

              <div className="mt-6 sm:mt-8 text-xs sm:text-sm text-green-600">
                <p>HOW TO PLAY:</p>
                <p>Find the correct password by selecting words</p>
                <p>The system shows how many letters match the position</p>
                <p>Use this information to deduce the correct password</p>
              </div>
            </div>
          </div>
        )}

        {/* Playing State */}
        {gameState === 'playing' && (
          <div className="bg-black border-2 border-green-500 p-3 sm:p-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6 flex-wrap gap-2 sm:gap-4">
              <div className="text-green-400 flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-xl">⚡</span>
                  <span className="text-xs sm:text-base">ATTEMPTS: {Array(attempts).fill('■').join(' ')}</span>
                </div>
              </div>
              <div className="text-green-400 text-sm sm:text-xl">
                TIME: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Words Grid */}
              <div className="space-y-2">
                <div className="text-green-400 text-xs sm:text-sm mb-2 sm:mb-4">SELECT PASSWORD:</div>
                {words.map((word, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleGuess(word)}
                    disabled={guessHistory.some(g => g.word === word)}
                    className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 border border-green-500 transition-colors text-sm sm:text-base touch-manipulation ${
                      guessHistory.some(g => g.word === word)
                        ? 'bg-green-950 text-green-700 cursor-not-allowed'
                        : 'bg-green-900 hover:bg-green-700 active:bg-green-600 text-green-400 cursor-pointer'
                    }`}
                  >
                    &gt; {word}
                  </button>
                ))}
              </div>

              {/* History Panel */}
              <div className="space-y-2">
                <div className="text-green-400 text-xs sm:text-sm mb-2 sm:mb-4">ANALYSIS LOG:</div>
                <div className="bg-green-950 border border-green-500 p-3 sm:p-4 h-64 sm:h-96 overflow-y-auto">
                  {guessHistory.length === 0 ? (
                    <div className="text-green-600 text-xs sm:text-sm">
                      <p>&gt; SYSTEM READY</p>
                      <p>&gt; AWAITING INPUT...</p>
                      <p className="mt-4">&gt; TIP: Look for patterns in matching letters</p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-green-400 text-xs sm:text-sm">
                      {guessHistory.map((guess, idx) => (
                        <div key={idx} className="border-b border-green-800 pb-2">
                          <p>&gt; ENTRY DENIED</p>
                          <p>&gt; PASSWORD: {guess.word}</p>
                          <p>&gt; MATCH: {guess.matches}/{guess.word.length} CORRECT</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {gameState === 'success' && (
          <div className="bg-black border-2 border-green-500 p-4 sm:p-8">
            <div className="text-green-400 text-center space-y-4 sm:space-y-6">
              <div className="flex justify-center mb-4 sm:mb-6">
                <span className="text-5xl animate-pulse">🔓</span>
              </div>
              <h2 className="text-2xl sm:text-3xl mb-2 sm:mb-4 animate-pulse">ACCESS GRANTED</h2>
              <p className="text-base sm:text-xl">&gt; PASSWORD: {targetWord}</p>
              <p className="text-base sm:text-xl">&gt; SYSTEM BREACHED</p>
              <p className="text-xl sm:text-2xl mt-4">TOTAL SCORE: {score}</p>
              
              <div className="space-y-3 sm:space-y-4 max-w-md mx-auto mt-6 sm:mt-8">
                <button
                  onClick={() => startGame(difficulty)}
                  className="w-full bg-green-900 hover:bg-green-700 active:bg-green-600 border-2 border-green-500 text-green-400 py-3 sm:py-4 px-4 sm:px-6 text-base sm:text-xl transition-colors touch-manipulation"
                >
                  &gt; BREACH NEXT SYSTEM
                </button>
                <button
                  onClick={resetGame}
                  className="w-full bg-green-900 hover:bg-green-700 active:bg-green-600 border-2 border-green-500 text-green-400 py-2 sm:py-3 px-4 sm:px-6 text-sm sm:text-lg transition-colors touch-manipulation"
                >
                  &gt; RETURN TO MENU
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Failed State */}
        {gameState === 'failed' && (
          <div className="bg-black border-2 border-red-500 p-4 sm:p-8">
            <div className="text-red-400 text-center space-y-4 sm:space-y-6">
              <div className="flex justify-center mb-4 sm:mb-6">
                <span className="text-5xl animate-pulse">🔒</span>
              </div>
              <h2 className="text-2xl sm:text-3xl mb-2 sm:mb-4 animate-pulse">ACCESS DENIED</h2>
              <p className="text-base sm:text-xl">&gt; LOCKOUT INITIATED</p>
              <p className="text-base sm:text-xl">&gt; CORRECT PASSWORD: {targetWord}</p>
              <p className="text-xl sm:text-2xl mt-4">TOTAL SCORE: {score}</p>
              
              <div className="space-y-3 sm:space-y-4 max-w-md mx-auto mt-6 sm:mt-8">
                <button
                  onClick={() => startGame(difficulty)}
                  className="w-full bg-red-900 hover:bg-red-700 active:bg-red-600 border-2 border-red-500 text-red-400 py-3 sm:py-4 px-4 sm:px-6 text-base sm:text-xl transition-colors touch-manipulation"
                >
                  &gt; RETRY BREACH
                </button>
                <button
                  onClick={resetGame}
                  className="w-full bg-red-900 hover:bg-red-700 active:bg-red-600 border-2 border-red-500 text-red-400 py-2 sm:py-3 px-4 sm:px-6 text-sm sm:text-lg transition-colors touch-manipulation"
                >
                  &gt; RETURN TO MENU
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
