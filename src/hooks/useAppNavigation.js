import { useCallback, useState } from "react";

export const APP_MODE = {
  GHOST: "ghost",
  SAVED: "saved",
};

export const APP_VIEW = {
  LOBBY: "lobby",
  CONTACTS: "contacts",
  LEGAL: "legal",
  FEEDBACK: "feedback",
  CONVERSATIONS: "conversationList",
  SAVED_CHAT: "savedChat",
  PROFILE_EDIT: "profileEdit",
};

export function useAppNavigation() {
  const [mode, setMode] = useState(APP_MODE.GHOST);
  const [view, setView] = useState(APP_VIEW.LOBBY);
  const [savedChatContact, setSavedChatContact] = useState(null);

  const switchToSavedMode = useCallback(() => {
    setMode(APP_MODE.SAVED);
    setView(APP_VIEW.CONVERSATIONS);
  }, []);

  const switchToGhostMode = useCallback(() => {
    setMode(APP_MODE.GHOST);
    setView(APP_VIEW.LOBBY);
  }, []);

  const openSavedChat = useCallback(({ handle, nickname, initialRoomCode = null }) => {
    setMode(APP_MODE.SAVED);
    setSavedChatContact({ handle, nickname, initialRoomCode });
    setView(APP_VIEW.SAVED_CHAT);
  }, []);

  return {
    mode,
    view,
    savedChatContact,
    setView,
    switchToSavedMode,
    switchToGhostMode,
    openSavedChat,
  };
}
