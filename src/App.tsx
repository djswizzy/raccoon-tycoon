import { useState } from 'react'
import type { GameState } from './types'
import { initGame } from './gameLogic'
import { LobbyScreen } from './LobbyScreen'
import { SetupScreen } from './SetupScreen'
import { RoomWaitingScreen } from './RoomWaitingScreen'
import { OnlineGameRoom } from './OnlineGameRoom'
import { GameBoard } from './GameBoard'
import { GameOver } from './GameOver'

type AppScreen =
  | { screen: 'lobby' }
  | { screen: 'setup' }
  | { screen: 'local'; game: GameState }
  | { screen: 'room'; roomCode: string; playerId: string; playerIndex: number; isHost: boolean }
  | { screen: 'online'; roomCode: string; playerId: string; playerIndex: number; game: GameState }

export default function App() {
  const [appScreen, setAppScreen] = useState<AppScreen>({ screen: 'lobby' })

  function handlePlayLocal() {
    setAppScreen({ screen: 'setup' })
  }

  function handleSetupStart(numPlayers: number, names: string[]) {
    setAppScreen({ screen: 'local', game: initGame(numPlayers, names) })
  }

  function handleCreateRoom(roomCode: string, playerId: string, playerIndex: number) {
    setAppScreen({ screen: 'room', roomCode, playerId, playerIndex, isHost: true })
  }

  function handleJoinRoom(roomCode: string, playerId: string, playerIndex: number) {
    setAppScreen({ screen: 'room', roomCode, playerId, playerIndex, isHost: false })
  }

  function handleGameStart(state: GameState, roomCode: string, playerId: string, playerIndex: number) {
    setAppScreen({
      screen: 'online',
      roomCode,
      playerId,
      playerIndex,
      game: state,
    })
  }

  function handleLeaveRoom() {
    setAppScreen({ screen: 'lobby' })
  }

  if (appScreen.screen === 'lobby') {
    return (
      <LobbyScreen
        onPlayLocal={handlePlayLocal}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />
    )
  }

  if (appScreen.screen === 'setup') {
    return <SetupScreen onStart={handleSetupStart} />
  }

  if (appScreen.screen === 'local') {
    if (appScreen.game.phase === 'gameover') {
      return (
        <GameOver
          state={appScreen.game}
          onReset={() => setAppScreen({ screen: 'lobby' })}
        />
      )
    }
    return (
      <GameBoard
        state={appScreen.game}
        setState={(g) => setAppScreen({ ...appScreen, game: g })}
      />
    )
  }

  if (appScreen.screen === 'room') {
    return (
      <RoomWaitingScreen
        roomCode={appScreen.roomCode}
        playerId={appScreen.playerId}
        playerIndex={appScreen.playerIndex}
        isHost={appScreen.isHost}
        onGameStart={handleGameStart}
        onBack={handleLeaveRoom}
      />
    )
  }

  // appScreen.screen === 'online'
  return (
    <OnlineGameRoom
      roomCode={appScreen.roomCode}
      playerId={appScreen.playerId}
      playerIndex={appScreen.playerIndex}
      initialState={appScreen.game}
      onLeave={handleLeaveRoom}
    />
  )
}
