import { useEffect } from "react";
import { usePeer } from "./hooks/usePeer";
import { getInitialRoomCode } from "./utils/url";
import Background from "./components/Background";
import Lobby from "./components/Lobby";
import Waiting from "./components/Waiting";
import Chat from "./components/Chat";
import Toast from "./components/Toast";

const initialCode = getInitialRoomCode();

export default function App() {
  const { screen, roomCode, conn, sharedKey, toast, loading, actions } =
    usePeer();

  useEffect(() => {
    if (initialCode) {
      actions.joinRoom(initialCode);
    }
  }, []);

  return (
    <>
      <Background />
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
          loading={loading}
        />
      )}
      {screen === "chat" && (
        <Chat
          roomCode={roomCode}
          conn={conn}
          sharedKey={sharedKey}
          onLeave={actions.backToLobby}
        />
      )}
      <Toast message={toast} />
    </>
  );
}
