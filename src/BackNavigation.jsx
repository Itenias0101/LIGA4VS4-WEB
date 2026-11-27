
import { useEffect, useRef } from "react";

export default function BackNavigation({
  mode,
  setMode,
  notificationsOpen,
  setNotificationsOpen,
  playerView,
  closePlayerView,
  expandedTeam,
  setExpandedTeam,
  showCompetitionMenu,
  activeSection,
  navigateTo,
  returnToWelcome
}) {
  const navigationRef = useRef(null);

  navigationRef.current = {
    mode,
    setMode,
    notificationsOpen,
    setNotificationsOpen,
    playerView,
    closePlayerView,
    expandedTeam,
    setExpandedTeam,
    showCompetitionMenu,
    activeSection,
    navigateTo,
    returnToWelcome
  };

  useEffect(() => {
    const pushBackGuard = () => {
      window.history.pushState(
        { liga4vs4BackGuard: true },
        "",
        window.location.href
      );
    };

    pushBackGuard();

    const handleBackGesture = () => {
      const nav = navigationRef.current;

      if (!nav) {
        pushBackGuard();
        return;
      }

      if (nav.mode) {
        nav.setMode(null);
      } else if (nav.notificationsOpen) {
        nav.setNotificationsOpen(false);
      } else if (nav.playerView) {
        nav.closePlayerView();
      } else if (nav.expandedTeam) {
        nav.setExpandedTeam(null);
      } else if (
        nav.showCompetitionMenu &&
        nav.activeSection !== "inicio"
      ) {
        nav.navigateTo("inicio");
      } else if (nav.showCompetitionMenu) {
        nav.returnToWelcome();
      }

      // Mantiene al usuario dentro de la web app.
      pushBackGuard();
    };

    window.addEventListener("popstate", handleBackGesture);

    return () => {
      window.removeEventListener("popstate", handleBackGesture);
    };
  }, []);

  return null;
}
