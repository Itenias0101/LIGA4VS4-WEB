
import { useEffect, useRef } from "react";

export default function AndroidBackHandler({
  showCompetitionMenu,
  activeSection,
  playerView,
  notificationsOpen,
  closePlayerView,
  setActiveSection,
  setShowCompetitionMenu,
  setNotificationsOpen
}) {
  const navigationRef = useRef(null);

  navigationRef.current = {
    showCompetitionMenu,
    activeSection,
    playerView,
    notificationsOpen,
    closePlayerView,
    setActiveSection,
    setShowCompetitionMenu,
    setNotificationsOpen
  };

  useEffect(() => {
    const pushBackState = () => {
      window.history.pushState(
        { liga4vs4BackHandler: true },
        "",
        window.location.href
      );
    };

    pushBackState();

    const handleBack = () => {
      const navigation = navigationRef.current;

      if (navigation.notificationsOpen) {
        navigation.setNotificationsOpen(false);
      } else if (navigation.playerView) {
        navigation.closePlayerView();
      } else if (
        navigation.showCompetitionMenu &&
        navigation.activeSection !== "inicio"
      ) {
        navigation.setActiveSection("inicio");
      } else if (navigation.showCompetitionMenu) {
        navigation.setShowCompetitionMenu(false);
        navigation.setActiveSection("inicio");
      } else {
        return;
      }

      pushBackState();
    };

    window.addEventListener("popstate", handleBack);

    return () => {
      window.removeEventListener("popstate", handleBack);
    };
  }, []);

  return null;
}
