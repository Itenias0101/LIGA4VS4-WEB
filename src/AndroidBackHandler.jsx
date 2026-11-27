
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
  const exitTimeoutRef = useRef(null);

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

      // Mantener siempre una entrada de historial para interceptar Atrás.
      pushBackState();

      if (navigation.notificationsOpen) {
        navigation.setNotificationsOpen(false);
        return;
      }

      if (navigation.playerView) {
        navigation.closePlayerView();
        return;
      }

      if (
        navigation.showCompetitionMenu &&
        navigation.activeSection !== "inicio"
      ) {
        navigation.setActiveSection("inicio");
        return;
      }

      if (navigation.showCompetitionMenu) {
        navigation.setShowCompetitionMenu(false);
        navigation.setActiveSection("inicio");
        return;
      }

      // En la bienvenida no se permite salir con el botón Atrás.
      // Se muestra un aviso y se conserva la aplicación abierta.
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
      }

      exitTimeoutRef.current = setTimeout(() => {
        exitTimeoutRef.current = null;
      }, 2000);
    };

    window.addEventListener("popstate", handleBack);

    return () => {
      window.removeEventListener("popstate", handleBack);

      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
      }
    };
  }, []);

  return null;
}
