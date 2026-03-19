import { useEffect } from "react";
import { usePeer } from "./hooks/usePeer";
import { getInitialRoomCode } from "./utils/url";
import Lobby from "./components/Lobby";
import Waiting from "./components/Waiting";
import Chat from "./components/Chat";
import Toast from "./components/Toast";

const initialCode = getInitialRoomCode();

export default function App() {
  const { screen, roomCode, conn, sharedKey, toast, actions } = usePeer();

  // Auto-join if ?room= is in the URL on load
  useEffect(() => {
    if (initialCode) {
      actions.joinRoom(initialCode);
    }
  }, []);

  return (
    <>
      {screen === "lobby" && (
        <Lobby
          onCreate={actions.createRoom}
          onJoin={actions.joinRoom}
          initialCode={initialCode}
        />
      )}
      {screen === "waiting" && (
        <Waiting
          roomCode={roomCode}
          onBack={actions.backToLobby}
          onToast={actions.showToast}
        />
      )}
      {screen === "chat" && (
        <Chat roomCode={roomCode} conn={conn} sharedKey={sharedKey} />
      )}
      <Toast message={toast} />
    </>
  );
}
