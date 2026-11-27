
import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDocs,
  getDoc,
  where,
  limit
} from "firebase/firestore";

const MEDIA_WORKER_URL = "https://liga4vs4-media-api.itenias01.workers.dev";
const MAX_PROFILE_PHOTO_SIZE = 15 * 1024 * 1024;
const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const GRADIENTS = {
  oceano: ["#06152E", "#087CA7"],
  obsidiana: ["#090909", "#414141"],
  carmesi: ["#310B24", "#B21F45"],
  galaxia: ["#160B35", "#7139B8"],
  esmeralda: ["#062C26", "#16866A"],
  fenix: ["#421B08", "#D87819"],
  neon: ["#07313D", "#11B9C9"],
  aurora: ["#28102D", "#A04487"]
};

const PROFILE_SWIPE_THRESHOLD = 70;

export const normalizeNick = (value) =>
  String(value || "")
    .replace(/[\uFEFF\u200B-\u200D\u00A0]/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export default function useActividadPerfil({
  user,
  db,
  setError,
  openMode,
  showCompetitionMenu,
  formatNumber,
  formatPostDate,
  STATS_CSV_URL,
  parsePlayerStatsCSV,
  getPlayerStats
}) {
  // =========================================
  // PERFIL PROPIO
  // =========================================

  const [ownProfile, setOwnProfile] = useState(null);
  const [ownProfileLoading, setOwnProfileLoading] = useState(false);
  const [ownProfileOpen, setOwnProfileOpen] = useState(false);
  const [ownProfileError, setOwnProfileError] = useState("");
  const [ownProfileMessage, setOwnProfileMessage] = useState("");
  const [ownBiographyDraft, setOwnBiographyDraft] = useState("");
  const [ownBiographyEditing, setOwnBiographyEditing] = useState(false);
  const [ownProfileSaving, setOwnProfileSaving] = useState(false);
  const [ownPhotoUploading, setOwnPhotoUploading] = useState(false);
  const [ownGradientSaving, setOwnGradientSaving] = useState(false);
  const [ownAvatarPosition, setOwnAvatarPosition] = useState(null);
  const [ownAvatarDragStart, setOwnAvatarDragStart] = useState(null);
  const [ownAvatarWasDragged, setOwnAvatarWasDragged] = useState(false);

  // =========================================
  // PERFIL PÚBLICO
  // =========================================

  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedPlayerPhoto, setSelectedPlayerPhoto] = useState("");
  const [playerPhotoLoading, setPlayerPhotoLoading] = useState(false);
  const [playerPhotoStatus, setPlayerPhotoStatus] = useState("");
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState(null);
  const [biographyLikes, setBiographyLikes] = useState(0);
  const [biographyLiked, setBiographyLiked] = useState(false);
  const [biographyLikeBusy, setBiographyLikeBusy] = useState(false);
  const [expandedProfilePhoto, setExpandedProfilePhoto] = useState(false);

  // =========================================
  // VISTAS INDIVIDUALES
  // =========================================

  const [playerView, setPlayerView] = useState("");
  const [playerStats, setPlayerStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [playerPosts, setPlayerPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");

  // =========================================
  // CONTROL DEL GESTO SWIPE
  // =========================================

  const profileSwipeStartRef = useRef(null);

  const resetProfileSwipe = () => {
    profileSwipeStartRef.current = null;
  };

  const isInteractiveProfileElement = (target) => {
    if (!target?.closest) return false;

    return Boolean(
      target.closest(
        "button, input, textarea, select, label, video, a, [role='button']"
      )
    );
  };

  const handleOwnProfileTouchStart = (event) => {
    if (isInteractiveProfileElement(event.target)) {
      profileSwipeStartRef.current = null;
      return;
    }

    const touch = event.touches?.[0];
    if (!touch) return;

    profileSwipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  };

  const handleOwnProfileTouchEnd = (event) => {
    const start = profileSwipeStartRef.current;
    profileSwipeStartRef.current = null;

    if (!start || !ownProfile) return;

    if (isInteractiveProfileElement(event.target)) return;

    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    // DESLIZAR HACIA LA IZQUIERDA ABRE LAS ESTADÍSTICAS.
    if (
      dx < -PROFILE_SWIPE_THRESHOLD &&
      Math.abs(dx) > Math.abs(dy) * 1.25
    ) {
      openOwnPlayerStats();
    }
  };

  const handlePlayerProfileTouchStart = (event) => {
    if (isInteractiveProfileElement(event.target)) {
      profileSwipeStartRef.current = null;
      return;
    }

    const touch = event.touches?.[0];
    if (!touch) return;

    profileSwipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  };

  const handlePlayerProfileTouchEnd = (event) => {
    const start = profileSwipeStartRef.current;
    profileSwipeStartRef.current = null;

    if (!start) return;

    if (isInteractiveProfileElement(event.target)) return;

    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (
      dx < -PROFILE_SWIPE_THRESHOLD &&
      Math.abs(dx) > Math.abs(dy) * 1.25
    ) {
      returnToOwnProfileBySwipe();
    }
  };

  // =========================================
  // RESET
  // =========================================

  const resetOwnProfile = () => {
    setOwnProfile(null);
    setOwnProfileOpen(false);
    setOwnAvatarPosition(null);
    setPlayerView("");
    setSelectedPlayer("");
    setSelectedPlayerPhoto("");
    setSelectedPlayerProfile(null);
    resetProfileSwipe();
  };

  // =========================================
  // PERFIL PÚBLICO DEL JUGADOR
  // =========================================

  const closePlayerMenu = () => {
    setSelectedPlayer("");
    setSelectedPlayerPhoto("");
    setPlayerPhotoLoading(false);
    setPlayerPhotoStatus("");
    setSelectedPlayerProfile(null);
    setExpandedProfilePhoto(false);
  };

  const openPlayerMenu = async (playerName) => {
    setSelectedPlayer(playerName);
    setSelectedPlayerPhoto("");
    setSelectedPlayerProfile(null);
    setPlayerPhotoLoading(true);
    setPlayerPhotoStatus("BUSCANDO PERFIL...");

    try {
      const profilesRef = collection(db, "perfiles_publicos");
      let foundDoc = null;

      const exactQuery = query(
        profilesRef,
        where("nick", "==", playerName),
        limit(2)
      );

      const exactSnapshot = await getDocs(exactQuery);

      if (exactSnapshot.size === 1) {
        foundDoc = exactSnapshot.docs[0];
      } else if (exactSnapshot.size > 1) {
        setPlayerPhotoStatus("NO SE PUDO IDENTIFICAR EL PERFIL");
        return;
      } else {
        const allProfiles = await getDocs(profilesRef);

        const matchesFound = allProfiles.docs.filter((profileDoc) => {
          const data = profileDoc.data();
          return normalizeNick(data.nick) === normalizeNick(playerName);
        });

        if (matchesFound.length === 1) {
          foundDoc = matchesFound[0];
        } else if (matchesFound.length > 1) {
          setPlayerPhotoStatus("NO SE PUDO IDENTIFICAR EL PERFIL");
          return;
        }
      }

      if (!foundDoc) {
        setPlayerPhotoStatus("PERFIL NO ENCONTRADO");
        return;
      }

      const profile = foundDoc.data();
      const photo = String(profile.fotoPerfil || "").trim();

      const profileData = {
        uid: foundDoc.id,
        nick: String(profile.nick || playerName),
        equipo: String(profile.equipo || ""),
        biografia: String(profile.biografia || ""),
        fotoPerfil: photo.startsWith("https://") ? photo : "",
        gradientePerfil: String(profile.gradientePerfil || "")
      };

      setSelectedPlayerProfile(profileData);
      setSelectedPlayerPhoto(profileData.fotoPerfil);

      if (!photo) {
        setPlayerPhotoStatus("SIN FOTO REGISTRADA");
      } else if (!photo.startsWith("https://")) {
        setPlayerPhotoStatus("URL DE FOTO INVÁLIDA");
      } else {
        setPlayerPhotoStatus("");
      }
    } catch (err) {
      console.error("Error buscando perfil público:", err);
      setPlayerPhotoStatus("ERROR AL BUSCAR PERFIL");
    } finally {
      setPlayerPhotoLoading(false);
    }
  };

  const openPlayerProfile = () => {
    if (!selectedPlayerProfile) {
      setPlayerPhotoStatus("NO SE ENCONTRÓ EL PERFIL DEL JUGADOR");
      return;
    }

    setPlayerView("profile");
    setSelectedPlayer("");
  };

  // =========================================
  // ABRIR PERFIL PÚBLICO PROPIO
  // =========================================

  const openOwnPublicProfile = () => {
    if (!ownProfile) return;

    const publicProfile = {
      uid: ownProfile.uid || user?.uid || "",
      nick: String(
        ownProfile.nick ||
        user?.displayName ||
        user?.email?.split("@")[0] ||
        "JUGADOR"
      ),
      equipo: String(ownProfile.equipo || ""),
      biografia: String(ownProfile.biografia || ""),
      fotoPerfil: String(ownProfile.fotoPerfil || "").startsWith("https://")
        ? String(ownProfile.fotoPerfil)
        : "",
      gradientePerfil: String(ownProfile.gradientePerfil || "")
    };

    setSelectedPlayer(publicProfile.nick);
    setSelectedPlayerProfile(publicProfile);
    setSelectedPlayerPhoto(publicProfile.fotoPerfil);
    setPlayerPhotoLoading(false);
    setPlayerPhotoStatus("");
    setPlayerView("profile");
    setOwnProfileOpen(false);
    setOwnBiographyEditing(false);
    resetProfileSwipe();
  };

  const returnToOwnProfileBySwipe = async () => {
    if (!user) return;

    setPlayerView("");
    setPlayerStats(null);
    setStatsError("");
    setPlayerPosts([]);
    setPostsError("");
    setExpandedProfilePhoto(false);

    setSelectedPlayer("");
    setSelectedPlayerPhoto("");
    setSelectedPlayerProfile(null);
    setPlayerPhotoStatus("");

    setOwnProfileOpen(true);
    setOwnProfileMessage("");
    setOwnProfileError("");

    if (!ownProfile) {
      await refreshOwnProfile(true);
    }
  };

  // =========================================
  // ESTADÍSTICAS DEL JUGADOR
  // =========================================

  const openPlayerStats = async (requestedNick = "") => {
    const nick = String(
      requestedNick ||
      selectedPlayer ||
      selectedPlayerProfile?.nick ||
      ""
    ).trim();

    if (!nick) return;

    setPlayerView("stats");
    setSelectedPlayer("");
    setStatsLoading(true);
    setStatsError("");
    setPlayerStats(null);

    try {
      const response = await fetch(STATS_CSV_URL, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`No se pudo descargar el CSV (${response.status}).`);
      }

      const csvText = await response.text();
      const allStats = parsePlayerStatsCSV(csvText);
      const stats = getPlayerStats(allStats, nick);

      if (!stats) {
        setStatsError(
          `Todavía no aparecen estadísticas para el nick oficial "${nick}".`
        );
      } else {
        setPlayerStats(stats);
      }
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
      setStatsError(
        err.message || "No se pudieron cargar las estadísticas del jugador."
      );
    } finally {
      setStatsLoading(false);
    }
  };

  // =========================================
  // ABRIR ESTADÍSTICAS DEL PERFIL PROPIO
  // =========================================

  const openOwnPlayerStats = () => {
    if (!ownProfile) return;

    const officialNick = String(ownProfile.nick || "").trim();

    if (!officialNick) {
      setOwnProfileError(
        "TU PERFIL NO TIENE UN NICK OFICIAL PARA CONSULTAR ESTADÍSTICAS."
      );
      return;
    }

    const ownPublicProfile = {
      uid: ownProfile.uid || user?.uid || "",
      nick: officialNick,
      equipo: String(ownProfile.equipo || ""),
      biografia: String(ownProfile.biografia || ""),
      fotoPerfil: String(ownProfile.fotoPerfil || "").startsWith("https://")
        ? String(ownProfile.fotoPerfil)
        : "",
      gradientePerfil: String(ownProfile.gradientePerfil || "")
    };

    setSelectedPlayerProfile(ownPublicProfile);
    setSelectedPlayerPhoto(ownPublicProfile.fotoPerfil);
    setPlayerPhotoLoading(false);
    setPlayerPhotoStatus("");
    setOwnProfileOpen(false);
    setOwnBiographyEditing(false);
    resetProfileSwipe();

    // Se envía el nick directamente para evitar estados desactualizados.
    openPlayerStats(officialNick);
  };

  // =========================================
  // ME GUSTA DE LA BIOGRAFÍA
  // =========================================

  useEffect(() => {
    const profileUid = selectedPlayerProfile?.uid;

    if (!profileUid) {
      setBiographyLikes(0);
      setBiographyLiked(false);
      return;
    }

    const likesRef = collection(
      db,
      "perfiles_publicos",
      profileUid,
      "likes_biografia"
    );

    const unsubscribe = onSnapshot(
      likesRef,
      (snapshot) => {
        setBiographyLikes(snapshot.size);
        setBiographyLiked(
          Boolean(user?.uid) &&
          snapshot.docs.some((likeDoc) => likeDoc.id === user.uid)
        );
      },
      (firebaseError) => {
        console.error(
          "Error cargando los me gusta de la biografía:",
          firebaseError
        );

        setBiographyLikes(0);
        setBiographyLiked(false);
      }
    );

    return () => unsubscribe();
  }, [selectedPlayerProfile?.uid, user?.uid]);

  const toggleBiographyLike = async () => {
    const profileUid = selectedPlayerProfile?.uid;

    if (!profileUid || biographyLikeBusy) return;

    if (!user?.uid) {
      openMode("login");
      return;
    }

    setBiographyLikeBusy(true);

    try {
      const likeRef = doc(
        db,
        "perfiles_publicos",
        profileUid,
        "likes_biografia",
        user.uid
      );

      if (biographyLiked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, {
          uid: user.uid,
          createdAt: new Date().toISOString()
        });
      }
    } catch (firebaseError) {
      console.error(
        "Error actualizando el me gusta de la biografía:",
        firebaseError
      );

      setError(
        "NO SE PUDO REGISTRAR TU ME GUSTA. COMPRUEBA LOS PERMISOS DE FIRESTORE."
      );
    } finally {
      setBiographyLikeBusy(false);
    }
  };

  // =========================================
  // PUBLICACIONES DEL JUGADOR
  // =========================================

  useEffect(() => {
    if (playerView !== "posts" || !selectedPlayerProfile) {
      setPlayerPosts([]);
      setPostsLoading(false);
      setPostsError("");
      return;
    }

    setPostsLoading(true);
    setPostsError("");

    const postsRef = collection(db, "publicaciones");
    const postsQuery = query(postsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const profileUid = selectedPlayerProfile.uid;
        const profileNick = normalizeNick(
          selectedPlayerProfile.nick || selectedPlayer
        );

        const filtered = snapshot.docs
          .map((postDoc) => ({
            id: postDoc.id,
            ...postDoc.data()
          }))
          .filter((post) => {
            if (post.uid && profileUid && post.uid === profileUid) {
              return true;
            }

            return normalizeNick(post.nombre) === profileNick;
          });

        setPlayerPosts(filtered);
        setPostsLoading(false);
        setPostsError("");
      },
      (firebaseError) => {
        console.error("Error cargando publicaciones:", firebaseError);
        setPostsLoading(false);
        setPostsError(
          "No se pudieron cargar las publicaciones. Comprueba los permisos de Firestore."
        );
      }
    );

    return () => unsubscribe();
  }, [playerView, selectedPlayerProfile, selectedPlayer]);

  const openPlayerPosts = () => {
    if (!selectedPlayerProfile) {
      setPlayerPhotoStatus("NO SE ENCONTRÓ EL PERFIL DEL JUGADOR");
      return;
    }

    setPlayerView("posts");
    setSelectedPlayer("");
  };

  const closePlayerView = () => {
    setPlayerView("");
    setPlayerStats(null);
    setStatsError("");
    setPlayerPosts([]);
    setPostsError("");
    closePlayerMenu();
  };

  // =========================================
  // CARGAR PERFIL PROPIO
  // =========================================

  const refreshOwnProfile = async (showLoader = true) => {
    if (!user?.uid) return null;

    if (showLoader) setOwnProfileLoading(true);
    setOwnProfileError("");

    try {
      const playerRef = doc(db, "jugadores", user.uid);
      const playerSnapshot = await getDoc(playerRef);

      if (!playerSnapshot.exists()) {
        setOwnProfile(null);
        setOwnProfileError(
          "TU CUENTA TODAVÍA NO TIENE UN PERFIL DE JUGADOR ASIGNADO."
        );
        return null;
      }

      const data = playerSnapshot.data();

      const profile = {
        uid: user.uid,
        nick: String(data.nick || ""),
        equipo: String(data.equipo || ""),
        estado: String(data.estado || ""),
        biografia: String(data.biografia || ""),
        fotoPerfil: String(data.fotoPerfil || "").startsWith("https://")
          ? String(data.fotoPerfil)
          : "",
        gradientePerfil: String(data.gradientePerfil || "")
      };

      setOwnProfile(profile);
      setOwnBiographyDraft(profile.biografia);

      if (profile.estado === "ASIGNADO" && profile.nick && profile.equipo) {
        try {
          await setDoc(
            doc(db, "perfiles_publicos", user.uid),
            {
              uid: user.uid,
              nick: profile.nick,
              equipo: profile.equipo,
              ...(Object.prototype.hasOwnProperty.call(data, "fotoPerfil")
                ? { fotoPerfil: profile.fotoPerfil }
                : {}),
              ...(Object.prototype.hasOwnProperty.call(data, "biografia")
                ? { biografia: profile.biografia }
                : {}),
              ...(Object.prototype.hasOwnProperty.call(
                data,
                "gradientePerfil"
              )
                ? { gradientePerfil: profile.gradientePerfil }
                : {})
            },
            { merge: true }
          );
        } catch (syncError) {
          console.warn(
            "No se pudo sincronizar el perfil público:",
            syncError
          );
        }
      }

      return profile;
    } catch (profileError) {
      console.error("Error cargando el perfil propio:", profileError);

      setOwnProfileError(
        "NO SE PUDO CARGAR TU PERFIL. COMPRUEBA TU CONEXIÓN Y LOS PERMISOS DE FIRESTORE."
      );

      return null;
    } finally {
      if (showLoader) setOwnProfileLoading(false);
    }
  };

  const openOwnProfile = async () => {
    if (!user) {
      openMode("login");
      return;
    }

    setOwnProfileOpen(true);
    setOwnProfileMessage("");
    setOwnProfileError("");
    await refreshOwnProfile(true);
  };

  useEffect(() => {
    if (user?.uid && showCompetitionMenu) {
      refreshOwnProfile(false);
    }
  }, [user?.uid, showCompetitionMenu]);

  const closeOwnProfile = () => {
    setOwnProfileOpen(false);
    setOwnBiographyEditing(false);
    setOwnProfileError("");
    setOwnProfileMessage("");
    resetProfileSwipe();
  };

  // =========================================
  // GUARDAR BIOGRAFÍA
  // =========================================

  const saveOwnBiography = async () => {
    if (!user?.uid || !ownProfile) return;

    const biography = String(ownBiographyDraft || "")
      .slice(0, 250)
      .trim();

    setOwnProfileSaving(true);
    setOwnProfileError("");
    setOwnProfileMessage("");

    try {
      await updateDoc(doc(db, "jugadores", user.uid), {
        biografia: biography
      });

      const updated = {
        ...ownProfile,
        biografia: biography
      };

      setOwnProfile(updated);

      if (updated.estado === "ASIGNADO" && updated.nick && updated.equipo) {
        await setDoc(
          doc(db, "perfiles_publicos", user.uid),
          {
            uid: user.uid,
            nick: updated.nick,
            equipo: updated.equipo,
            biografia
          },
          { merge: true }
        );
      }

      setOwnBiographyDraft(biography);
      setOwnBiographyEditing(false);
      setOwnProfileMessage("BIOGRAFÍA ACTUALIZADA CORRECTAMENTE.");
    } catch (saveError) {
      console.error("Error guardando la biografía:", saveError);

      setOwnProfileError(
        "NO SE PUDO GUARDAR LA BIOGRAFÍA. REVISA LOS PERMISOS DE FIRESTORE."
      );
    } finally {
      setOwnProfileSaving(false);
    }
  };

  // =========================================
  // GUARDAR GRADIENTE
  // =========================================

  const saveOwnGradient = async (gradientName) => {
    if (
      !user?.uid ||
      !ownProfile ||
      !GRADIENTS[gradientName] ||
      ownGradientSaving
    ) {
      return;
    }

    setOwnGradientSaving(true);
    setOwnProfileError("");
    setOwnProfileMessage("");

    try {
      await updateDoc(doc(db, "jugadores", user.uid), {
        gradientePerfil: gradientName
      });

      const updated = {
        ...ownProfile,
        gradientePerfil: gradientName
      };

      setOwnProfile(updated);

      if (updated.estado === "ASIGNADO" && updated.nick && updated.equipo) {
        await setDoc(
          doc(db, "perfiles_publicos", user.uid),
          {
            uid: user.uid,
            nick: updated.nick,
            equipo: updated.equipo,
            gradientePerfil: gradientName
          },
          { merge: true }
        );
      }

      setOwnProfileMessage("DISEÑO DE PERFIL ACTUALIZADO.");
    } catch (saveError) {
      console.error("Error guardando el diseño del perfil:", saveError);

      setOwnProfileError(
        "NO SE PUDO GUARDAR EL DISEÑO. REVISA LOS PERMISOS DE FIRESTORE."
      );
    } finally {
      setOwnGradientSaving(false);
    }
  };

  // =========================================
  // SUBIR FOTO PROPIA
  // =========================================

  const uploadOwnProfilePhoto = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !user) return;

    if (!PROFILE_PHOTO_TYPES.includes(file.type)) {
      setOwnProfileError("FORMATO NO VÁLIDO. USA JPG, PNG O WEBP.");
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      setOwnProfileError("LA FOTO SUPERA EL LÍMITE DE 15 MB.");
      return;
    }

    setOwnPhotoUploading(true);
    setOwnProfileError("");
    setOwnProfileMessage("");

    try {
      const token = await user.getIdToken(true);

      if (!token) {
        throw new Error("Firebase no devolvió un token de sesión.");
      }

      const response = await fetch(MEDIA_WORKER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type,
          Accept: "application/json"
        },
        body: file
      });

      const responseText = await response.text();

      let result = {};

      try {
        result = JSON.parse(responseText);
      } catch {
        // Respuesta no JSON.
      }

      if (
        !response.ok ||
        result.success !== true ||
        !String(result.url || "").startsWith("https://")
      ) {
        throw new Error(
          result.error ||
          result.message ||
          `El servicio de imágenes respondió ${response.status}.`
        );
      }

      await updateDoc(doc(db, "jugadores", user.uid), {
        fotoPerfil: result.url
      });

      const updated = {
        ...ownProfile,
        fotoPerfil: result.url
      };

      setOwnProfile(updated);

      if (updated.estado === "ASIGNADO" && updated.nick && updated.equipo) {
        await setDoc(
          doc(db, "perfiles_publicos", user.uid),
          {
            uid: user.uid,
            nick: updated.nick,
            equipo: updated.equipo,
            fotoPerfil: result.url
          },
          { merge: true }
        );
      }

      setOwnProfileMessage("FOTO DE PERFIL ACTUALIZADA.");
    } catch (uploadError) {
      console.error(
        "Error subiendo la foto de perfil:",
        uploadError
      );

      setOwnProfileError(
        uploadError.message || "NO SE PUDO SUBIR LA FOTO DE PERFIL."
      );
    } finally {
      setOwnPhotoUploading(false);
    }
  };

  // =========================================
  // AVATAR FLOTANTE
  // =========================================

  const handleOwnAvatarPointerDown = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();

    event.currentTarget.setPointerCapture?.(event.pointerId);

    setOwnAvatarDragStart({
      x: event.clientX,
      y: event.clientY,
      left: rect.left,
      top: rect.top
    });

    setOwnAvatarWasDragged(false);
  };

  const handleOwnAvatarPointerMove = (event) => {
    if (!ownAvatarDragStart) return;

    const dx = event.clientX - ownAvatarDragStart.x;
    const dy = event.clientY - ownAvatarDragStart.y;

    if (Math.abs(dx) + Math.abs(dy) > 5) {
      setOwnAvatarWasDragged(true);
    }

    const left = Math.max(
      8,
      Math.min(
        window.innerWidth - 68,
        ownAvatarDragStart.left + dx
      )
    );

    const top = Math.max(
      8,
      Math.min(
        window.innerHeight - 68,
        ownAvatarDragStart.top + dy
      )
    );

    setOwnAvatarPosition({
      left,
      top
    });
  };

  const handleOwnAvatarPointerUp = () => {
    setOwnAvatarDragStart(null);
  };

  // =========================================
  // FOTO AMPLIADA
  // =========================================

  const renderExpandedProfilePhoto = () => {
    if (!expandedProfilePhoto || !selectedPlayerProfile?.fotoPerfil) {
      return null;
    }

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Foto de ${selectedPlayerProfile.nick || selectedPlayer}`}
        onClick={() => setExpandedProfilePhoto(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10050,
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "rgba(0,0,0,.94)",
          cursor: "zoom-out"
        }}
      >
        <button
          type="button"
          onClick={() => setExpandedProfilePhoto(false)}
          aria-label="Cerrar foto ampliada"
          style={{
            position: "absolute",
            top: "max(18px, env(safe-area-inset-top))",
            right: "18px",
            width: "42px",
            height: "42px",
            border: "1px solid rgba(0,217,255,.45)",
            borderRadius: "50%",
            background: "rgba(5,20,35,.9)",
            color: "#fff",
            fontSize: "27px",
            cursor: "pointer"
          }}
        >
          ×
        </button>

        <img
          src={selectedPlayerProfile.fotoPerfil}
          alt={selectedPlayerProfile.nick || selectedPlayer}
          onClick={(event) => event.stopPropagation()}
          style={{
            display: "block",
            maxWidth: "min(92vw, 720px)",
            maxHeight: "82vh",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            borderRadius: "14px",
            border: "1px solid rgba(0,217,255,.45)",
            boxShadow: "0 0 35px rgba(0,217,255,.18)"
          }}
        />

        <p
          style={{
            position: "absolute",
            bottom: "max(18px, env(safe-area-inset-bottom))",
            left: "16px",
            right: "16px",
            margin: 0,
            color: "#D5E0EA",
            textAlign: "center",
            fontWeight: 800,
            letterSpacing: "1px"
          }}
        >
          {selectedPlayerProfile.nick || selectedPlayer}
        </p>
      </div>
    );
  };

  // =========================================
  // PERFIL PROPIO
  // =========================================

  const renderOwnProfile = () => {
    if (!ownProfileOpen) return null;

    const gradient =
      GRADIENTS[ownProfile?.gradientePerfil] || GRADIENTS.oceano;

    const displayName =
      ownProfile?.nick ||
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "JUGADOR";

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mi perfil"
        onClick={closeOwnProfile}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10040,
          display: "grid",
          placeItems: "center",
          padding: "14px",
          background: "rgba(0,0,0,.82)",
          backdropFilter: "blur(7px)"
        }}
      >
        <section
          onClick={(event) => event.stopPropagation()}
          onTouchStart={handleOwnProfileTouchStart}
          onTouchEnd={handleOwnProfileTouchEnd}
          style={{
            width: "min(100%, 560px)",
            maxHeight: "92vh",
            overflowY: "auto",
            boxSizing: "border-box",
            padding: "22px 18px 26px",
            borderRadius: "18px",
            border: "1px solid rgba(0,217,255,.42)",
            background: `linear-gradient(145deg, ${gradient[0]}, #050B13 72%, ${gradient[1]})`,
            boxShadow: "0 0 36px rgba(0,217,255,.16)",
            color: "#fff",
            touchAction: "pan-y"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "18px"
            }}
          >
            <div>
              <small
                style={{
                  color: "#00D9FF",
                  fontWeight: 900,
                  letterSpacing: "1.4px"
                }}
              >
                LIGA4VS4 · CUENTA
              </small>

              <h2
                style={{
                  margin: "5px 0 0",
                  fontSize: "22px"
                }}
              >
                MI PERFIL
              </h2>
            </div>

            <button
              type="button"
              onClick={closeOwnProfile}
              aria-label="Cerrar perfil"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "1px solid rgba(0,217,255,.35)",
                background: "rgba(0,0,0,.35)",
                color: "#fff",
                fontSize: "24px",
                cursor: "pointer"
              }}
            >
              ×
            </button>
          </div>

          {!ownProfileLoading && ownProfile && (
            <div
              style={{
                marginBottom: "14px",
                padding: "8px 12px",
                borderRadius: "9px",
                border: "1px solid rgba(0,217,255,.12)",
                background: "rgba(0,217,255,.035)",
                textAlign: "center",
                color: "#6F8A9E",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: ".8px"
              }}
            >
              ← DESLIZA HACIA LA IZQUIERDA PARA VER TUS ESTADÍSTICAS
            </div>
          )}

          {ownProfileLoading && (
            <div className="matches-state">
              <span className="matches-spinner" />
              <p>CARGANDO TU PERFIL...</p>
            </div>
          )}

          {!ownProfileLoading && ownProfile && (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "18px 12px",
                  borderRadius: "15px",
                  background: "rgba(0,0,0,.25)",
                  border: "1px solid rgba(255,255,255,.1)"
                }}
              >
                <div
                  style={{
                    width: "132px",
                    height: "132px",
                    borderRadius: "50%",
                    padding: "4px",
                    background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                    border: "2px solid #00D9FF",
                    boxShadow: "0 0 26px rgba(0,217,255,.3)"
                  }}
                >
                  {ownProfile.fotoPerfil ? (
                    <img
                      src={ownProfile.fotoPerfil}
                      alt="Mi foto de perfil"
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        objectFit: "cover",
                        display: "block"
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: "#102B42",
                        fontSize: "48px",
                        fontWeight: 900
                      }}
                    >
                      {displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>

                <h3
                  style={{
                    margin: "14px 0 4px",
                    fontSize: "23px",
                    textAlign: "center"
                  }}
                >
                  {displayName}
                </h3>

                <strong
                  style={{
                    color: "#00D9FF",
                    fontSize: "12px",
                    letterSpacing: ".7px"
                  }}
                >
                  {ownProfile.equipo || "EQUIPO PENDIENTE"}
                </strong>

                <small
                  style={{
                    color: "#AABBCB",
                    marginTop: "7px"
                  }}
                >
                  {ownProfile.estado === "ASIGNADO"
                    ? "JUGADOR ASIGNADO"
                    : "CUENTA REGISTRADA"}
                </small>
              </div>

              <div
                style={{
                  marginTop: "18px",
                  padding: "16px",
                  borderRadius: "13px",
                  background: "rgba(0,0,0,.28)",
                  border: "1px solid rgba(255,255,255,.1)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    marginBottom: "12px"
                  }}
                >
                  <strong
                    style={{
                      color: "#00D9FF",
                      letterSpacing: "1px",
                      fontSize: "13px"
                    }}
                  >
                    FOTO DE PERFIL
                  </strong>

                  <small style={{ color: "#8EA6BA" }}>
                    JPG · PNG · WEBP
                  </small>
                </div>

                <label
                  htmlFor="own-profile-photo"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "12px",
                    borderRadius: "9px",
                    border: "1px solid rgba(0,217,255,.5)",
                    background: "rgba(0,217,255,.1)",
                    color: "#DDF9FF",
                    fontWeight: 900,
                    fontSize: "12px",
                    cursor: ownPhotoUploading ? "wait" : "pointer"
                  }}
                >
                  {ownPhotoUploading
                    ? "SUBIENDO FOTO..."
                    : "📷 CAMBIAR FOTO DE PERFIL"}
                </label>

                <input
                  id="own-profile-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={uploadOwnProfilePhoto}
                  disabled={ownPhotoUploading}
                  style={{ display: "none" }}
                />

                <small
                  style={{
                    display: "block",
                    color: "#8298AA",
                    textAlign: "center",
                    marginTop: "8px"
                  }}
                >
                  Tamaño máximo: 15 MB
                </small>
              </div>

              <div
                style={{
                  marginTop: "14px",
                  padding: "16px",
                  borderRadius: "13px",
                  background: "rgba(0,0,0,.28)",
                  border: "1px solid rgba(255,255,255,.1)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    marginBottom: "10px"
                  }}
                >
                  <strong
                    style={{
                      color: "#00D9FF",
                      letterSpacing: "1px",
                      fontSize: "13px"
                    }}
                  >
                    BIOGRAFÍA
                  </strong>

                  {!ownBiographyEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setOwnBiographyDraft(ownProfile.biografia || "");
                        setOwnBiographyEditing(true);
                      }}
                      style={{
                        border: "1px solid rgba(0,217,255,.4)",
                        borderRadius: "7px",
                        background: "rgba(0,217,255,.1)",
                        color: "#00D9FF",
                        padding: "7px 10px",
                        fontSize: "11px",
                        fontWeight: 900
                      }}
                    >
                      EDITAR
                    </button>
                  )}
                </div>

                {ownBiographyEditing ? (
                  <>
                    <textarea
                      value={ownBiographyDraft}
                      onChange={(event) =>
                        setOwnBiographyDraft(
                          event.target.value.slice(0, 250)
                        )
                      }
                      maxLength={250}
                      rows={4}
                      placeholder="Escribe algo sobre ti..."
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        resize: "vertical",
                        borderRadius: "9px",
                        border: "1px solid rgba(0,217,255,.35)",
                        background: "rgba(2,8,15,.85)",
                        color: "#fff",
                        padding: "12px",
                        font: "inherit",
                        fontSize: "14px",
                        outline: "none"
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "9px"
                      }}
                    >
                      <small style={{ color: "#8298AA" }}>
                        {ownBiographyDraft.length}/250
                      </small>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px"
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOwnBiographyDraft(
                              ownProfile.biografia || ""
                            );
                            setOwnBiographyEditing(false);
                          }}
                          style={{
                            padding: "9px 12px",
                            borderRadius: "8px",
                            border:
                              "1px solid rgba(255,255,255,.2)",
                            background: "transparent",
                            color: "#B8C7D5",
                            fontWeight: 800
                          }}
                        >
                          CANCELAR
                        </button>

                        <button
                          type="button"
                          onClick={saveOwnBiography}
                          disabled={ownProfileSaving}
                          style={{
                            padding: "9px 13px",
                            borderRadius: "8px",
                            border: 0,
                            background: "#00AFCB",
                            color: "#001018",
                            fontWeight: 900
                          }}
                        >
                          {ownProfileSaving
                            ? "GUARDANDO..."
                            : "GUARDAR"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      color: ownProfile.biografia
                        ? "#DCE7F0"
                        : "#8197AA",
                      fontSize: "14px",
                      lineHeight: 1.65,
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    {ownProfile.biografia ||
                      "Todavía no has escrito una biografía."}
                  </p>
                )}
              </div>

              <div
                style={{
                  marginTop: "14px",
                  padding: "16px",
                  borderRadius: "13px",
                  background: "rgba(0,0,0,.28)",
                  border: "1px solid rgba(255,255,255,.1)"
                }}
              >
                <strong
                  style={{
                    color: "#00D9FF",
                    letterSpacing: "1px",
                    fontSize: "13px"
                  }}
                >
                  DISEÑO DE FONDO
                </strong>

                <p
                  style={{
                    color: "#8298AA",
                    fontSize: "12px",
                    margin: "6px 0 13px"
                  }}
                >
                  Elige uno de los ocho diseños disponibles en Android.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: "9px"
                  }}
                >
                  {Object.entries(GRADIENTS).map(
                    ([name, colors]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => saveOwnGradient(name)}
                        disabled={ownGradientSaving}
                        style={{
                          minHeight: "58px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          padding: "10px",
                          borderRadius: "9px",
                          border:
                            ownProfile.gradientePerfil === name
                              ? "2px solid #00D9FF"
                              : "1px solid rgba(255,255,255,.18)",
                          background: `linear-gradient(110deg, ${colors[0]}, ${colors[1]})`,
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          cursor: "pointer"
                        }}
                      >
                        {name}
                        {ownProfile.gradientePerfil === name ? (
                          <span>✓</span>
                        ) : null}
                      </button>
                    )
                  )}
                </div>
              </div>
            </>
          )}

          {!ownProfileLoading && !ownProfile && (
            <div className="matches-state matches-error">
              <p>
                {ownProfileError ||
                  "NO SE ENCONTRÓ TU DOCUMENTO DE JUGADOR."}
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => refreshOwnProfile(true)}
              >
                REINTENTAR
              </button>
            </div>
          )}

          {ownProfileError && ownProfile && (
            <p
              style={{
                color: "#FF8290",
                fontSize: "12px",
                textAlign: "center"
              }}
            >
              {ownProfileError}
            </p>
          )}

          {ownProfileMessage && (
            <p
              style={{
                color: "#67E6A5",
                fontSize: "12px",
                textAlign: "center",
                fontWeight: 800
              }}
            >
              {ownProfileMessage}
            </p>
          )}

          <button
            type="button"
            onClick={closeOwnProfile}
            style={{
              width: "100%",
              marginTop: "18px",
              padding: "13px",
              borderRadius: "9px",
              border: "1px solid rgba(0,217,255,.35)",
              background: "rgba(0,217,255,.1)",
              color: "#DDF9FF",
              fontWeight: 900,
              letterSpacing: "1px"
            }}
          >
            CERRAR PERFIL
          </button>
        </section>
      </div>
    );
  };

  // =========================================
  // AVATAR FLOTANTE
  // =========================================

  const renderOwnFloatingAvatar = () => {
    if (!user || !showCompetitionMenu) return null;

    const style = ownAvatarPosition
      ? {
          left: `${ownAvatarPosition.left}px`,
          top: `${ownAvatarPosition.top}px`,
          right: "auto",
          bottom: "auto"
        }
      : {
          right: "16px",
          bottom: "82px"
        };

    return (
      <button
        type="button"
        aria-label="Abrir mi perfil"
        title="Mi perfil"
        onPointerDown={handleOwnAvatarPointerDown}
        onPointerMove={handleOwnAvatarPointerMove}
        onPointerUp={handleOwnAvatarPointerUp}
        onPointerCancel={handleOwnAvatarPointerUp}
        onClick={() => {
          if (ownAvatarWasDragged) {
            setOwnAvatarWasDragged(false);
            return;
          }

          openOwnProfile();
        }}
        style={{
          position: "fixed",
          ...style,
          zIndex: 10020,
          width: "60px",
          height: "60px",
          padding: "3px",
          borderRadius: "50%",
          border: "2px solid #00D9FF",
          background: "#082335",
          boxShadow:
            "0 0 22px rgba(0,217,255,.35), 0 8px 22px rgba(0,0,0,.55)",
          display: "grid",
          placeItems: "center",
          cursor: ownAvatarDragStart ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none",
          animation: "ownProfileAvatarIn .45s ease-out"
        }}
      >
        {ownProfile?.fotoPerfil ? (
          <img
            src={ownProfile.fotoPerfil}
            alt=""
            draggable="false"
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover",
              pointerEvents: "none"
            }}
          />
        ) : (
          <span
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontSize: "24px",
              fontWeight: 900,
              background:
                "linear-gradient(145deg,#0C4261,#071827)"
            }}
          >
            {String(
              ownProfile?.nick ||
                user.displayName ||
                user.email ||
                "U"
            )
              .slice(0, 1)
              .toUpperCase()}
          </span>
        )}

        <style>{`
          @keyframes ownProfileAvatarIn {
            from {
              opacity: 0;
              transform: scale(.7);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </button>
    );
  };

  // =========================================
  // VENTANA PERFIL DEL JUGADOR
  // =========================================

  const renderPlayerMenu = () => {
    if (!selectedPlayer) return null;

    const gradientName =
      selectedPlayerProfile?.gradientePerfil || "";

    const gradient =
      GRADIENTS[gradientName] || ["#071827", "#123D59"];

    return (
      <div
        className="player-profile-overlay"
        onClick={closePlayerMenu}
      >
        <section
          className="player-profile-modal"
          onClick={(event) => event.stopPropagation()}
          style={{
            width: "min(94vw, 520px)",
            maxWidth: "520px",
            maxHeight: "92vh",
            overflowY: "auto",
            boxSizing: "border-box",
            padding: "24px 22px"
          }}
        >
          <div className="player-profile-heading">
            PERFIL DEL JUGADOR
          </div>

          <button
            type="button"
            className="player-profile-avatar"
            onClick={() =>
              selectedPlayerPhoto &&
              setExpandedProfilePhoto(true)
            }
            aria-label="Ampliar foto de perfil"
            style={{
              background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
              cursor: selectedPlayerPhoto
                ? "zoom-in"
                : "default",
              width: "clamp(116px, 31vw, 142px)",
              height: "clamp(116px, 31vw, 142px)",
              minWidth: "116px",
              minHeight: "116px",
              padding: 0,
              border: "2px solid rgba(0,217,255,.85)",
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow: "0 0 26px rgba(0,217,255,.2)"
            }}
          >
            {selectedPlayerPhoto ? (
              <img
                src={selectedPlayerPhoto}
                alt={selectedPlayer}
              />
            ) : (
              <span>
                {selectedPlayer.slice(0, 1).toUpperCase()}
              </span>
            )}
          </button>

          {playerPhotoLoading ? (
            <p className="player-profile-photo-status">
              BUSCANDO JUGADOR...
            </p>
          ) : playerPhotoStatus ? (
            <p className="player-profile-photo-status">
              {playerPhotoStatus}
            </p>
          ) : null}

          <h3 className="player-profile-name">
            {selectedPlayerProfile?.nick || selectedPlayer}
          </h3>

          {selectedPlayerProfile?.equipo && (
            <p
              style={{
                color: "#00D9FF",
                textAlign: "center",
                fontSize: "12px",
                fontWeight: "700",
                margin: "5px 0"
              }}
            >
              {selectedPlayerProfile.equipo}
            </p>
          )}

          {selectedPlayerProfile?.biografia && (
            <p
              style={{
                color: "#AABBCB",
                textAlign: "center",
                fontSize: "12px",
                margin: "8px 12px"
              }}
            >
              {selectedPlayerProfile.biografia}
            </p>
          )}

          <div className="player-profile-divider" />

          <button
            type="button"
            className="player-profile-option"
            onClick={openPlayerProfile}
          >
            <span
              className="player-profile-option-icon"
              style={{
                fontSize: "29px",
                width: "42px",
                minWidth: "42px",
                textAlign: "center"
              }}
            >
              ◉
            </span>

            <span>
              <strong>VER PERFIL</strong>
              <small>
                Información y biografía del jugador
              </small>
            </span>

            <b>›</b>
          </button>

          <button
            type="button"
            className="player-profile-option"
            onClick={openPlayerStats}
          >
            <span
              className="player-profile-option-icon"
              style={{
                fontSize: "29px",
                width: "42px",
                minWidth: "42px",
                textAlign: "center"
              }}
            >
              ◈
            </span>

            <span>
              <strong>VER STATS</strong>
              <small>
                Estadísticas individuales del jugador
              </small>
            </span>

            <b>›</b>
          </button>

          <button
            type="button"
            className="player-profile-option"
            onClick={openPlayerPosts}
          >
            <span
              className="player-profile-option-icon"
              style={{
                fontSize: "29px",
                width: "42px",
                minWidth: "42px",
                textAlign: "center"
              }}
            >
              ▣
            </span>

            <span>
              <strong>VER PUBLICACIONES</strong>
              <small>
                Jugadas destacadas de este jugador
              </small>
            </span>

            <b>›</b>
          </button>

          <button
            type="button"
            className="player-profile-close"
            onClick={closePlayerMenu}
          >
            CERRAR
          </button>
        </section>
      </div>
    );
  };

  // =========================================
  // PESTAÑAS PERFIL PÚBLICO
  // =========================================

  const renderPlayerTabs = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(3, minmax(0, 1fr))",
        gap: "9px",
        width: "100%",
        margin: "20px 0 24px",
        padding: "5px",
        borderRadius: "12px",
        background: "rgba(3,12,22,.9)",
        border: "1px solid rgba(0,217,255,.18)"
      }}
    >
      {[
        ["profile", "PERFIL"],
        ["stats", "ESTADÍSTICAS"],
        ["posts", "ACTIVIDAD"]
      ].map(([tab, label]) => (
        <button
          key={tab}
          type="button"
          onClick={() => {
            if (tab === "stats") {
              if (playerView !== "stats" || !playerStats) {
                openPlayerStats();
              }
            } else if (tab === "posts") {
              openPlayerPosts();
            } else {
              setPlayerView("profile");
            }
          }}
          style={{
            minWidth: 0,
            padding: "15px 5px",
            border:
              playerView === tab
                ? "1px solid rgba(0,217,255,.7)"
                : "1px solid transparent",
            borderRadius: "8px",
            background:
              playerView === tab
                ? "linear-gradient(135deg,rgba(0,217,255,.2),rgba(0,91,140,.18))"
                : "transparent",
            color:
              playerView === tab
                ? "#00D9FF"
                : "#8197AA",
            fontSize:
              "clamp(11px, 2.8vw, 13px)",
            fontWeight: 900,
            letterSpacing: ".35px",
            cursor: "pointer"
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // =========================================
  // IDENTIDAD PERFIL PÚBLICO
  // =========================================

  const renderPlayerIdentity = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        margin: "18px 0 12px",
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      {selectedPlayerProfile?.fotoPerfil ? (
        <button
          type="button"
          onClick={() => setExpandedProfilePhoto(true)}
          aria-label="Ampliar foto de perfil"
          title="Ampliar foto"
          style={{
            width: "clamp(82px, 22vw, 104px)",
            height: "clamp(82px, 22vw, 104px)",
            padding: 0,
            border: "2px solid #00D9FF",
            borderRadius: "50%",
            overflow: "hidden",
            background: "transparent",
            cursor: "zoom-in",
            flex: "0 0 auto"
          }}
        >
          <img
            src={selectedPlayerProfile.fotoPerfil}
            alt={
              selectedPlayerProfile.nick ||
              selectedPlayer
            }
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block"
            }}
          />
        </button>
      ) : (
        <div
          style={{
            width: "clamp(82px, 22vw, 104px)",
            height: "clamp(82px, 22vw, 104px)",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "#123D59",
            color: "#fff",
            fontSize: "34px",
            fontWeight: "800"
          }}
        >
          {(
            selectedPlayerProfile?.nick ||
            selectedPlayer ||
            "?"
          )
            .slice(0, 1)
            .toUpperCase()}
        </div>
      )}

      <div style={{ textAlign: "left" }}>
        <strong
          style={{
            color: "#fff",
            display: "block",
            fontSize:
              "clamp(19px, 4vw, 23px)"
          }}
        >
          {selectedPlayerProfile?.nick ||
            selectedPlayer}
        </strong>

        <small
          style={{
            color: "#00D9FF",
            fontWeight: 700
          }}
        >
          {selectedPlayerProfile?.equipo || ""}
        </small>
      </div>
    </div>
  );

  // =========================================
  // PERFIL PÚBLICO
  // =========================================

  const renderPlayerProfile = () => (
    <section
      className="web-section-placeholder"
      onTouchStart={handlePlayerProfileTouchStart}
      onTouchEnd={handlePlayerProfileTouchEnd}
      style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "22px 16px 110px",
        boxSizing: "border-box",
        touchAction: "pan-y"
      }}
    >
      <span className="placeholder-label">
        JUGADOR
      </span>

      <h2>PERFIL</h2>

      <div
        style={{
          margin: "0 auto 10px",
          maxWidth: "520px",
          padding: "8px 12px",
          borderRadius: "9px",
          border:
            "1px solid rgba(0,217,255,.12)",
          background: "rgba(0,217,255,.035)",
          textAlign: "center",
          color: "#6F8A9E",
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: ".8px"
        }}
      >
        ← DESLIZA HACIA LA IZQUIERDA PARA VOLVER A MI PERFIL
      </div>

      {renderPlayerIdentity()}
      {renderPlayerTabs()}

      <div
        style={{
          padding: "20px 16px",
          borderRadius: "12px",
          border:
            "1px solid rgba(0,217,255,.22)",
          background:
            "linear-gradient(145deg,rgba(5,25,43,.95),rgba(3,10,19,.95))",
          textAlign: "left"
        }}
      >
        <small
          style={{
            color: "#00D9FF",
            fontWeight: 800,
            letterSpacing: "1px"
          }}
        >
          BIOGRAFÍA
        </small>

        <p
          style={{
            color:
              selectedPlayerProfile?.biografia
                ? "#D5E0EA"
                : "#71899D",
            fontSize: "15px",
            lineHeight: 1.75,
            margin: "12px 0 0",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere"
          }}
        >
          {selectedPlayerProfile?.biografia ||
            "Este jugador todavía no ha añadido una biografía."}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginTop: "18px",
            paddingTop: "14px",
            borderTop:
              "1px solid rgba(0,217,255,.13)"
          }}
        >
          <span
            style={{
              color: "#91A8BA",
              fontSize: "12px",
              fontWeight: 700
            }}
          >
            {biographyLikes} ME GUSTA
          </span>

          <button
            type="button"
            onClick={toggleBiographyLike}
            disabled={biographyLikeBusy}
            aria-pressed={biographyLiked}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "999px",
              border: biographyLiked
                ? "1px solid rgba(255,75,112,.75)"
                : "1px solid rgba(0,217,255,.4)",
              background: biographyLiked
                ? "rgba(255,55,100,.14)"
                : "rgba(0,217,255,.08)",
              color: biographyLiked
                ? "#FF6B91"
                : "#00D9FF",
              fontSize: "14px",
              fontWeight: 900,
              cursor: biographyLikeBusy
                ? "wait"
                : "pointer",
              opacity: biographyLikeBusy ? 0.65 : 1
            }}
          >
            <span
              style={{
                fontSize: "21px",
                lineHeight: 1
              }}
            >
              {biographyLiked ? "♥" : "♡"}
            </span>

            {biographyLikeBusy
              ? "GUARDANDO..."
              : biographyLiked
                ? "TE GUSTA"
                : "ME GUSTA"}
          </button>
        </div>
      </div>

      <button
        className="primary-button"
        onClick={closePlayerView}
        style={{ marginTop: "20px" }}
      >
        VOLVER A EQUIPOS
      </button>
    </section>
  );

  // =========================================
  // ESTADÍSTICAS
  // =========================================

  const renderPlayerStats = () => (
    <section
      className="web-section-placeholder"
      style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "22px 16px 110px",
        boxSizing: "border-box"
      }}
    >
      <span className="placeholder-label">
        PERFIL DEL JUGADOR
      </span>

      <h2>ESTADÍSTICAS</h2>

      {renderPlayerIdentity()}
      {renderPlayerTabs()}

      {statsLoading && (
        <div className="matches-state">
          <span className="matches-spinner" />
          <p>CARGANDO ESTADÍSTICAS...</p>
        </div>
      )}

      {!statsLoading && statsError && (
        <div className="matches-state matches-error">
          <p>{statsError}</p>
        </div>
      )}

      {!statsLoading && playerStats && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "13px",
              margin: "18px 0"
            }}
          >
            {[
              [
                "🏆",
                "RANKING",
                `#${playerStats.ranking}`
              ],
              [
                "🎯",
                "BAJAS",
                formatNumber(playerStats.kills)
              ],
              [
                "💀",
                "MUERTES",
                formatNumber(playerStats.deaths)
              ],
              [
                "🤝",
                "ASISTENCIAS",
                formatNumber(playerStats.assists)
              ],
              [
                "⚔️",
                "K/D GLOBAL",
                formatNumber(playerStats.kd, 2)
              ],
              [
                "🗺️",
                "MAPAS JUGADOS",
                formatNumber(playerStats.maps)
              ]
            ].map(([icon, label, value]) => (
              <div
                key={label}
                style={{
                  padding: "22px 13px",
                  minHeight: "112px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  border:
                    "1px solid rgba(0,217,255,.3)",
                  borderRadius: "12px",
                  background: "rgba(5,20,35,.75)"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px"
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: "25px",
                      lineHeight: 1
                    }}
                  >
                    {icon}
                  </span>

                  <small
                    style={{
                      display: "block",
                      color: "#8EA6BA",
                      fontSize: "12px",
                      fontWeight: "800",
                      letterSpacing: ".45px"
                    }}
                  >
                    {label}
                  </small>
                </div>

                <strong
                  style={{
                    display: "block",
                    color: "#00D9FF",
                    fontSize:
                      "clamp(27px, 5vw, 34px)",
                    marginTop: "9px",
                    lineHeight: 1.1
                  }}
                >
                  {value}
                </strong>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "10px",
              margin: "15px 0"
            }}
          >
            {[
              [
                "🟢",
                "GANADOS",
                playerStats.hasWins
                  ? formatNumber(playerStats.wins)
                  : "—"
              ],
              [
                "🔴",
                "PERDIDOS",
                playerStats.hasLosses
                  ? formatNumber(playerStats.losses)
                  : "—"
              ],
              [
                "📈",
                "VICTORIAS",
                playerStats.hasMaps
                  ? `${formatNumber(
                      playerStats.winRate,
                      1
                    )}%`
                  : "—"
              ]
            ].map(([icon, label, value]) => (
              <div
                key={label}
                style={{
                  padding: "17px 8px",
                  minHeight: "78px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,.04)",
                  border:
                    "1px solid rgba(255,255,255,.1)"
                }}
              >
                <small
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    color: "#8EA6BA",
                    fontSize: "11px",
                    fontWeight: 800
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ fontSize: "18px" }}
                  >
                    {icon}
                  </span>

                  {label}
                </small>

                <strong
                  style={{
                    color: "#fff",
                    fontSize:
                      "clamp(19px, 3.8vw, 23px)",
                    display: "block",
                    marginTop: "5px"
                  }}
                >
                  {value}
                </strong>
              </div>
            ))}
          </div>

          <p
            style={{
              color: "#71899D",
              fontSize: "12px",
              textAlign: "center",
              marginTop: "15px"
            }}
          >
            POSICIÓN CALCULADA POR BAJAS ACUMULADAS
          </p>
        </>
      )}

      <button
        className="primary-button"
        onClick={closePlayerView}
      >
        VOLVER
      </button>
    </section>
  );

  // =========================================
  // PUBLICACIONES
  // =========================================

  const renderPlayerPosts = () => (
    <section
      className="web-section-placeholder"
      style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "22px 16px 110px",
        boxSizing: "border-box"
      }}
    >
      <span className="placeholder-label">
        PERFIL DEL JUGADOR
      </span>

      <h2>JUGADAS DESTACADAS</h2>

      {renderPlayerIdentity()}
      {renderPlayerTabs()}

      {postsLoading && (
        <div className="matches-state">
          <span className="matches-spinner" />
          <p>CARGANDO PUBLICACIONES...</p>
        </div>
      )}

      {!postsLoading && postsError && (
        <div className="matches-state matches-error">
          <p>{postsError}</p>
        </div>
      )}

      {!postsLoading &&
        !postsError &&
        playerPosts.length === 0 && (
          <div className="matches-state">
            <p>
              ESTE JUGADOR TODAVÍA NO TIENE
              PUBLICACIONES.
            </p>
          </div>
        )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1fr)",
          gap: "18px",
          marginTop: "15px"
        }}
      >
        {playerPosts.map((post) => {
          const isVideo = String(
            post.mediaType || ""
          ).startsWith("video/");

          return (
            <article
              key={post.id}
              style={{
                overflow: "hidden",
                borderRadius: "12px",
                background: "rgba(5,15,27,.9)",
                border:
                  "1px solid rgba(0,217,255,.2)",
                textAlign: "left"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px"
                }}
              >
                {selectedPlayerProfile?.fotoPerfil ? (
                  <img
                    src={
                      selectedPlayerProfile.fotoPerfil
                    }
                    alt=""
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      objectFit: "cover"
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: "#123D59",
                      color: "#fff"
                    }}
                  >
                    {(post.nick ||
                      post.nombre ||
                      "?").slice(0, 1)}
                  </span>
                )}

                <div>
                  <strong
                    style={{
                      color: "#fff",
                      display: "block"
                    }}
                  >
                    {post.nick ||
                      post.nombre ||
                      selectedPlayer}
                  </strong>

                  <small
                    style={{ color: "#00D9FF" }}
                  >
                    {post.equipo ||
                      selectedPlayerProfile?.equipo ||
                      ""}
                  </small>
                </div>
              </div>

              {post.mediaUrl &&
                (isVideo ? (
                  <video
                    src={post.mediaUrl}
                    controls
                    playsInline
                    preload="metadata"
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: "440px",
                      background: "#000"
                    }}
                  />
                ) : (
                  <img
                    src={post.mediaUrl}
                    alt="Publicación del jugador"
                    loading="lazy"
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: "440px",
                      objectFit: "contain",
                      background: "#000"
                    }}
                  />
                ))}

              {post.descripcion && (
                <p
                  style={{
                    color: "#E5EDF5",
                    padding: "12px",
                    margin: 0,
                    fontSize: "13px",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere"
                  }}
                >
                  {post.descripcion}
                </p>
              )}

              <div
                style={{
                  padding: "0 12px 12px",
                  color: "#7890A5",
                  fontSize: "10px"
                }}
              >
                {formatPostDate(post.createdAt)}
              </div>
            </article>
          );
        })}
      </div>

      <button
        className="primary-button"
        onClick={closePlayerView}
      >
        VOLVER
      </button>
    </section>
  );

  // =========================================
  // RETORNO DEL HOOK
  // =========================================

  return {
    ownProfile,
    ownProfileLoading,
    ownProfileOpen,
    ownProfileError,
    ownProfileMessage,
    ownBiographyDraft,
    ownBiographyEditing,
    ownProfileSaving,
    ownPhotoUploading,
    ownGradientSaving,
    ownAvatarPosition,
    ownAvatarDragStart,
    ownAvatarWasDragged,

    selectedPlayer,
    selectedPlayerPhoto,
    playerPhotoLoading,
    playerPhotoStatus,
    selectedPlayerProfile,
    biographyLikes,
    biographyLiked,
    biographyLikeBusy,
    expandedProfilePhoto,

    playerView,
    playerStats,
    statsLoading,
    statsError,
    playerPosts,
    postsLoading,
    postsError,

    resetOwnProfile,
    closePlayerMenu,
    openPlayerMenu,
    openPlayerStats,
    openPlayerPosts,
    closePlayerView,
    toggleBiographyLike,

    renderExpandedProfilePhoto,
    renderOwnProfile,
    renderOwnFloatingAvatar,
    renderPlayerMenu,
    renderPlayerProfile,
    renderPlayerStats,
    renderPlayerPosts
  };
}
