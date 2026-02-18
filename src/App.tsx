import { useState } from 'react'
import type { GameState } from './types'
import { initGame } from './gameLogic'
import { SetupScreen } from './SetupScreen'
import { GameBoard } from './GameBoard'
import { GameOver } from './GameOver'

export default function App() {
  const [game, setGame] = useState<GameState | null>(null)

  function handleStart(numPlayers: number, names: string[]) {
    setGame(initGame(numPlayers, names))
  }

  function handleReset() {
    setGame(null)
  }

  if (game?.phase === 'gameover') {
    return <GameOver state={game} onReset={handleReset} />
  }

  if (game) {
    return <GameBoard state={game} setState={setGame} />
  }

  return <SetupScreen onStart={handleStart} />
}
