import { useCallback, useRef, useState } from "react";
import { generateCode } from "../utils/roomCode";
import { createPeerClient, wakePeerServer } from "../chat/peerClient";
import { performSecureHandshake } from "../chat/secureHandshake";
import { APP_TITLE } from "../utils/notify";

export function usePeer() {
  const [screen, setScreen] = useState("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [conn, setConn] = useState(null);
  const [sharedKey, setSharedKey] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState("");

  const peerRef = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2000);
  }, []);

  const destroyPeer = useCallback(() => {
    peerRef.current?.destroy();
    peerRef.current = null;
  }, []);

  const createRoom = useCallback(async () => {
    destroyPeer();
    setConn(null);
    setSharedKey(null);

    const code = generateCode();
    setRoomCode(code);
    setScreen("waiting");
    setLoading("waking up server…");
    window.history.replaceState(null, APP_TITLE, `?room=${code}`);

    await wakePeerServer();

    setLoading("");
    const peer = createPeerClient(code);
    peerRef.current = peer;

    let connected = false;

    peer.on("connection", (nextConn) => {
      if (connected) {
        nextConn.close();
        return;
      }

      connected = true;
      setConn(nextConn);
      setLoading("encrypting connection…");

      nextConn.on("open", () => {
        performSecureHandshake(nextConn)
          .then((key) => {
            setSharedKey(key);
            setLoading("");
            setScreen("chat");
          })
          .catch((error) => {
            console.error("Handshake failed (host):", error);
            showToast(error.message || "encryption handshake failed");
            connected = false;
            setConn(null);
            setSharedKey(null);
            setLoading("");
            nextConn.close();
          });
      });

      nextConn.on("close", () => {
        connected = false;
      });

      nextConn.on("error", () => {
        connected = false;
      });
    });

    peer.on("error", (error) => {
      if (error?.type === "unavailable-id") {
        destroyPeer();
        setTimeout(createRoom, 100);
      }
    });
  }, [destroyPeer, showToast]);

  const joinRoom = useCallback(async (code) => {
    destroyPeer();
    setConn(null);
    setSharedKey(null);

    const upperCode = code.toUpperCase();
    setRoomCode(upperCode);
    setScreen("waiting");
    setLoading("waking up server…");
    window.history.replaceState(null, APP_TITLE, `?room=${upperCode}`);

    await wakePeerServer();

    setLoading("connecting…");
    const peer = createPeerClient();
    peerRef.current = peer;

    peer.on("open", () => {
      setLoading("joining room…");
      const nextConn = peer.connect(upperCode, { reliable: true });
      setConn(nextConn);

      nextConn.on("open", () => {
        setLoading("encrypting connection…");
        performSecureHandshake(nextConn)
          .then((key) => {
            setSharedKey(key);
            setLoading("");
            setScreen("chat");
          })
          .catch((error) => {
            console.error("Handshake failed (guest):", error);
            showToast(error.message || "encryption handshake failed");
            setLoading("");
            setScreen("lobby");
          });
      });

      nextConn.on("error", () => {
        showToast("could not reach that room");
        setLoading("");
        setScreen("lobby");
      });
    });

    peer.on("error", () => {
      showToast("connection failed");
      setLoading("");
      setScreen("lobby");
    });
  }, [destroyPeer, showToast]);

  const backToLobby = useCallback(() => {
    destroyPeer();
    setConn(null);
    setSharedKey(null);
    setRoomCode("");
    setLoading("");
    window.history.replaceState(null, APP_TITLE, window.location.pathname);
    setScreen("lobby");
  }, [destroyPeer]);

  return {
    screen,
    roomCode,
    conn,
    sharedKey,
    toast,
    loading,
    actions: {
      createRoom,
      joinRoom,
      backToLobby,
      showToast,
    },
  };
}
