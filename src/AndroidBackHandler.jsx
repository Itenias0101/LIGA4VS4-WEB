
import { useEffect, useRef } from "react";

export default function AndroidBackHandler({
  showCompetitionMenu,
  activeSection,
  playerView,
  closePlayerView,
  setActiveSection,
  setShowCompetitionMenu
}) {
  const navigationRef = useRef(null);

  navigationRef.current = {
    showCompetitionMenu,
    activeSection,
    playerView,
    closePlayerView,
    setActiveSection,
    setShowCompetitionMenu
  };

  useEffect(() => {
    window.history.pushState({ liga4vs4: true }, "");

    const handleBack = () => {
      const navigation = navigationRef.current;

      if (navigation.playerView) {
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

      window.history.pushState({ liga4vs4: true }, "");
    };

    window.addEventListener("popstate", handleBack);

    return () => {
      window.removeEventListener("popstate", handleBack);
    };
  }, []);

  return null;
}
