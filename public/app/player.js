import {
  blanked,
  buildQuestions,
  buildSpeakPlan,
  checkAnswer,
  langFromPath,
  lessonFromPath,
  nextIncomplete,
  readWritePicks,
} from "./lesson-flow.js";
import { createQueue } from "./sync-queue.js";

const queue = createQueue(localStorage);

const app = document.getElementById("app");
const ACTIVITIES = ["listen-match", "image-phrase", "speak-score", "read-write"];

// Interface language (cookie nl_ui, set by the top-menu UI switcher;
// independent of the course language in the URL).
const UI_STRINGS = {
  en: { listenTap: "Listen and tap", lookTap: "Look and tap", sayAloud: "Say it aloud", fillWord: "Fill the missing word", offline: "Offline \u2014 your progress will sync.", loading: "Getting your lesson ready\u2026", loadError: "Could not load the lesson.", loadErrorText: "Check your connection and try again.", tryAgain: "Try again", paywallTitle: "This lesson needs a subscription.", paywallText: "Unit 1 (lessons 1-4) is free forever. Unlock every lesson for $3/month or $29/year.", seePlans: "See plans", backFree: "Back to free Unit 1", tapStart: "Tap to start", tagline: "See it, hear it, say it.", whichPicture: "Which picture matches?", whichSentence: "Which sentence matches?", hearAgain: "Hear it again", needsConnection: "Needs connection", needsConnectionText: "Speaking practice needs the internet to check you. Your other progress is safe.", tapMic: "Tap the mic and say the sentence.", noMic: "No microphone found. Check permission and tap the mic to try again.", listening: "Listening\u2026 tap the mic to finish early.", checking: "Checking how you did\u2026", scoringError: "Something went wrong scoring that. Try again.", closeEnough: "Close enough!", closeEnoughText: "That was understood. Listen once more and try to match the tones as you go.", great: "Great!", greatText: "That sounded just right.", almost: "Almost!", goodEnough: "Good enough \u2014 moving on.", tryClearer: "Try once more, a little clearer.", tryAgainTitle: "Try again", goodEffort: "Good effort \u2014 moving on.", listenRepeat: "Listen and repeat after the speaker.", continueBtn: "Continue", correct: "Correct!", notQuite: "Not quite \u2014 listen again and try.", check: "Check", typeIt: "Type it\u2026", activityComplete: "Activity complete!", practiceAgain: "Practice again", practiceComplete: "Practice complete!", lessonComplete: "Lesson {n} complete!", niceWork: "Nice work \u2014 run it back anytime.", canDo: "You can hear it, read it, and say it.", finishLesson: "Finish lesson", exitStage: "Exit current stage?", exitStageText: "Your place in this stage will not be saved.", exitYes: "Yes, exit", exitNo: "Stay" },
  es: { listenTap: "Escucha y toca", lookTap: "Mira y toca", sayAloud: "Dilo en voz alta", fillWord: "Completa la palabra", offline: "Sin conexión — tu progreso se sincronizará.", loading: "Preparando tu lección…", loadError: "No se pudo cargar la lección.", loadErrorText: "Revisa tu conexión e inténtalo de nuevo.", tryAgain: "Intentar de nuevo", paywallTitle: "Esta lección necesita una suscripción.", paywallText: "La Unidad 1 (lecciones 1-4) es gratuita para siempre. Desbloquea todo por $3/mes o $29/año.", seePlans: "Ver planes", backFree: "Volver a la Unidad 1 gratuita", tapStart: "Toca para empezar", tagline: "Míralo. Escúchalo. Dilo.", whichPicture: "¿Qué imagen coincide?", whichSentence: "¿Qué frase coincide?", hearAgain: "Escuchar de nuevo", needsConnection: "Necesita conexión", needsConnectionText: "La práctica oral necesita internet para evaluarte. Tu demás progreso está a salvo.", tapMic: "Toca el micrófono y di la frase.", noMic: "No se encontró micrófono. Revisa el permiso y toca el micrófono para reintentar.", listening: "Escuchando… toca el micrófono para terminar antes.", checking: "Revisando cómo lo hiciste…", scoringError: "Algo salió mal al calificar. Inténtalo de nuevo.", closeEnough: "¡Casi perfecto!", closeEnoughText: "Se entendió. Escucha una vez más e intenta igualar los tonos.", great: "¡Genial!", greatText: "Sonó justo como debía.", almost: "¡Casi!", goodEnough: "Suficiente — seguimos.", tryClearer: "Inténtalo una vez más, un poco más claro.", tryAgainTitle: "Inténtalo de nuevo", goodEffort: "Buen esfuerzo — seguimos.", listenRepeat: "Escucha y repite después del audio.", continueBtn: "Continuar", correct: "¡Correcto!", notQuite: "Casi — escucha de nuevo e inténtalo.", check: "Comprobar", typeIt: "Escríbelo…", activityComplete: "¡Actividad completada!", practiceAgain: "Practicar de nuevo", practiceComplete: "¡Práctica completada!", lessonComplete: "¡Lección {n} completada!", niceWork: "Buen trabajo — repítelo cuando quieras.", canDo: "Ya puedes escucharlo, leerlo y decirlo.", finishLesson: "Terminar la lección", exitStage: "¿Salir de esta etapa?", exitStageText: "No se guardará tu lugar en esta etapa.", exitYes: "Sí, salir", exitNo: "Quedarme" },
  de: { listenTap: "Hören und tippen", lookTap: "Sehen und tippen", sayAloud: "Laut nachsprechen", fillWord: "Fehlendes Wort ergänzen", offline: "Offline — dein Fortschritt wird synchronisiert.", loading: "Deine Lektion wird vorbereitet…", loadError: "Die Lektion konnte nicht geladen werden.", loadErrorText: "Prüfe deine Verbindung und versuche es erneut.", tryAgain: "Erneut versuchen", paywallTitle: "Diese Lektion braucht ein Abo.", paywallText: "Einheit 1 (Lektionen 1-4) ist für immer kostenlos. Schalte alles für $3/Monat oder $29/Jahr frei.", seePlans: "Pläne ansehen", backFree: "Zurück zur kostenlosen Einheit 1", tapStart: "Tippen zum Starten", tagline: "Sehen. Hören. Sprechen.", whichPicture: "Welches Bild passt?", whichSentence: "Welcher Satz passt?", hearAgain: "Nochmal anhören", needsConnection: "Verbindung nötig", needsConnectionText: "Sprechübung braucht Internet zur Prüfung. Dein übriger Fortschritt ist sicher.", tapMic: "Tippe aufs Mikro und sprich den Satz.", noMic: "Kein Mikrofon gefunden. Prüfe die Erlaubnis und tippe erneut aufs Mikro.", listening: "Höre zu… tippe aufs Mikro, um früher zu stoppen.", checking: "Prüfe, wie du warst…", scoringError: "Bei der Bewertung ging etwas schief. Versuch es erneut.", closeEnough: "Knapp genug!", closeEnoughText: "Das wurde verstanden. Höre noch einmal zu und triff die Töne.", great: "Großartig!", greatText: "Das klang genau richtig.", almost: "Fast!", goodEnough: "Gut genug — weiter geht's.", tryClearer: "Versuch es noch einmal, etwas deutlicher.", tryAgainTitle: "Erneut versuchen", goodEffort: "Guter Versuch — weiter geht's.", listenRepeat: "Höre zu und sprich nach.", continueBtn: "Weiter", correct: "Richtig!", notQuite: "Nicht ganz — höre nochmal zu und versuch es.", check: "Prüfen", typeIt: "Tippe es ein…", activityComplete: "Aktivität geschafft!", practiceAgain: "Nochmal üben", practiceComplete: "Übung geschafft!", lessonComplete: "Lektion {n} geschafft!", niceWork: "Gut gemacht — jederzeit wiederholen.", canDo: "Du kannst es hören, lesen und sagen.", finishLesson: "Lektion beenden", exitStage: "Diese Stufe verlassen?", exitStageText: "Dein Platz in dieser Stufe wird nicht gespeichert.", exitYes: "Ja, verlassen", exitNo: "Bleiben" },
  fr: { listenTap: "Écoutez et touchez", lookTap: "Regardez et touchez", sayAloud: "Dites-le à voix haute", fillWord: "Complétez le mot manquant", offline: "Hors ligne — votre progression se synchronisera.", loading: "Préparation de votre leçon…", loadError: "Impossible de charger la leçon.", loadErrorText: "Vérifiez votre connexion et réessayez.", tryAgain: "Réessayer", paywallTitle: "Cette leçon nécessite un abonnement.", paywallText: "L'unité 1 (leçons 1-4) est gratuite pour toujours. Tout débloquer pour $3/mois ou $29/an.", seePlans: "Voir les offres", backFree: "Retour à l'unité 1 gratuite", tapStart: "Touchez pour commencer", tagline: "Regardez. Écoutez. Répétez.", whichPicture: "Quelle image correspond ?", whichSentence: "Quelle phrase correspond ?", hearAgain: "Réécouter", needsConnection: "Connexion requise", needsConnectionText: "L'exercice oral a besoin d'internet pour vous évaluer. Le reste de votre progression est à l'abri.", tapMic: "Touchez le micro et dites la phrase.", noMic: "Aucun micro trouvé. Vérifiez l'autorisation et touchez le micro pour réessayer.", listening: "Écoute… touchez le micro pour finir plus tôt.", checking: "Vérification de votre réponse…", scoringError: "La notation a échoué. Réessayez.", closeEnough: "Presque parfait !", closeEnoughText: "C'était compris. Réécoutez et essayez de suivre les tons.", great: "Super !", greatText: "C'était exactement ça.", almost: "Presque !", goodEnough: "Suffisant — on continue.", tryClearer: "Réessayez une fois, un peu plus clairement.", tryAgainTitle: "Réessayez", goodEffort: "Bel effort — on continue.", listenRepeat: "Écoutez et répétez après l'audio.", continueBtn: "Continuer", correct: "Correct !", notQuite: "Pas tout à fait — réécoutez et réessayez.", check: "Vérifier", typeIt: "Tapez-le…", activityComplete: "Activité terminée !", practiceAgain: "S'entraîner encore", practiceComplete: "Entraînement terminé !", lessonComplete: "Leçon {n} terminée !", niceWork: "Beau travail — recommencez quand vous voulez.", canDo: "Vous pouvez l'entendre, le lire et le dire.", finishLesson: "Terminer la leçon", exitStage: "Quitter cette étape ?", exitStageText: "Votre place dans cette étape ne sera pas enregistrée.", exitYes: "Oui, quitter", exitNo: "Rester" },
  th: { listenTap: "\u0e1f\u0e31\u0e07\u0e41\u0e25\u0e49\u0e27\u0e41\u0e15\u0e30", lookTap: "\u0e14\u0e39\u0e41\u0e25\u0e49\u0e27\u0e41\u0e15\u0e30", sayAloud: "\u0e1e\u0e39\u0e14\u0e2d\u0e2d\u0e01\u0e40\u0e2a\u0e35\u0e22\u0e07", fillWord: "\u0e40\u0e15\u0e34\u0e21\u0e04\u0e33\u0e17\u0e35\u0e48\u0e2b\u0e32\u0e22\u0e44\u0e1b", offline: "\u0e2d\u0e2d\u0e1f\u0e44\u0e25\u0e19\u0e4c — \u0e04\u0e27\u0e32\u0e21\u0e04\u0e37\u0e1a\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e30\u0e0b\u0e34\u0e07\u0e04\u0e4c\u0e20\u0e32\u0e22\u0e2b\u0e25\u0e31\u0e07", loading: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e15\u0e23\u0e35\u0e22\u0e21\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19…", loadError: "\u0e42\u0e2b\u0e25\u0e14\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08", loadErrorText: "\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e01\u0e32\u0e23\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d\u0e41\u0e25\u0e49\u0e27\u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", tryAgain: "\u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", paywallTitle: "\u0e1a\u0e17\u0e19\u0e35\u0e49\u0e15\u0e49\u0e2d\u0e07\u0e2a\u0e21\u0e31\u0e04\u0e23\u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01", paywallText: "\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e17\u0e35\u0e48 1 (\u0e1a\u0e17\u0e17\u0e35\u0e48 1-4) \u0e1f\u0e23\u0e35\u0e15\u0e25\u0e2d\u0e14\u0e44\u0e1b \u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e17\u0e38\u0e01\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19\u0e43\u0e19\u0e23\u0e32\u0e04\u0e32 $3/\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e2b\u0e23\u0e37\u0e2d $29/\u0e1b\u0e35", seePlans: "\u0e14\u0e39\u0e41\u0e1e\u0e47\u0e01\u0e40\u0e01\u0e08", backFree: "\u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e17\u0e35\u0e48 1 \u0e1f\u0e23\u0e35", tapStart: "\u0e41\u0e15\u0e30\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e23\u0e34\u0e48\u0e21", tagline: "\u0e14\u0e39 \u0e1f\u0e31\u0e07 \u0e41\u0e25\u0e49\u0e27\u0e1e\u0e39\u0e14\u0e15\u0e32\u0e21", whichPicture: "\u0e20\u0e32\u0e1e\u0e44\u0e2b\u0e19\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19?", whichSentence: "\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e04\u0e44\u0e2b\u0e19\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19?", hearAgain: "\u0e1f\u0e31\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", needsConnection: "\u0e15\u0e49\u0e2d\u0e07\u0e43\u0e0a\u0e49\u0e2d\u0e34\u0e19\u0e40\u0e17\u0e2d\u0e23\u0e4c\u0e40\u0e19\u0e47\u0e15", needsConnectionText: "\u0e01\u0e32\u0e23\u0e1d\u0e36\u0e01\u0e1e\u0e39\u0e14\u0e15\u0e49\u0e2d\u0e07\u0e43\u0e0a\u0e49\u0e2d\u0e34\u0e19\u0e40\u0e17\u0e2d\u0e23\u0e4c\u0e40\u0e19\u0e47\u0e15\u0e43\u0e19\u0e01\u0e32\u0e23\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a \u0e04\u0e27\u0e32\u0e21\u0e04\u0e37\u0e1a\u0e2b\u0e19\u0e49\u0e32\u0e2d\u0e37\u0e48\u0e19\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13\u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22", tapMic: "\u0e41\u0e15\u0e30\u0e44\u0e21\u0e04\u0e4c\u0e41\u0e25\u0e49\u0e27\u0e1e\u0e39\u0e14\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e04", noMic: "\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e44\u0e21\u0e42\u0e04\u0e23\u0e42\u0e1f\u0e19 \u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e41\u0e25\u0e49\u0e27\u0e41\u0e15\u0e30\u0e44\u0e21\u0e04\u0e4c\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", listening: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e1f\u0e31\u0e07… \u0e41\u0e15\u0e30\u0e44\u0e21\u0e04\u0e4c\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e2b\u0e22\u0e38\u0e14\u0e01\u0e48\u0e2d\u0e19", checking: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a…", scoringError: "\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e19\u0e01\u0e32\u0e23\u0e43\u0e2b\u0e49\u0e04\u0e30\u0e41\u0e19\u0e19 \u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", closeEnough: "\u0e43\u0e01\u0e25\u0e49\u0e40\u0e04\u0e35\u0e22\u0e07\u0e21\u0e32\u0e01!", closeEnoughText: "\u0e40\u0e02\u0e49\u0e32\u0e43\u0e08\u0e44\u0e14\u0e49 \u0e1f\u0e31\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07\u0e41\u0e25\u0e49\u0e27\u0e1e\u0e22\u0e32\u0e22\u0e32\u0e21\u0e43\u0e2b\u0e49\u0e40\u0e2a\u0e35\u0e22\u0e07\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19", great: "\u0e22\u0e2d\u0e14\u0e40\u0e22\u0e35\u0e48\u0e22\u0e21!", greatText: "\u0e1f\u0e31\u0e07\u0e14\u0e39\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07\u0e40\u0e25\u0e22", almost: "\u0e40\u0e01\u0e37\u0e2d\u0e1a\u0e41\u0e25\u0e49\u0e27!", goodEnough: "\u0e14\u0e35\u0e1e\u0e2d\u0e41\u0e25\u0e49\u0e27 — \u0e44\u0e1b\u0e15\u0e48\u0e2d\u0e40\u0e25\u0e22", tryClearer: "\u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07 \u0e1e\u0e39\u0e14\u0e43\u0e2b\u0e49\u0e0a\u0e31\u0e14\u0e01\u0e27\u0e48\u0e32\u0e19\u0e35\u0e49", tryAgainTitle: "\u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", goodEffort: "\u0e1e\u0e22\u0e32\u0e22\u0e32\u0e21\u0e14\u0e35\u0e21\u0e32\u0e01 — \u0e44\u0e1b\u0e15\u0e48\u0e2d\u0e40\u0e25\u0e22", listenRepeat: "\u0e1f\u0e31\u0e07\u0e41\u0e25\u0e49\u0e27\u0e1e\u0e39\u0e14\u0e15\u0e32\u0e21", continueBtn: "\u0e44\u0e1b\u0e15\u0e48\u0e2d", correct: "\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07!", notQuite: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01 — \u0e1f\u0e31\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07\u0e41\u0e25\u0e49\u0e27\u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48", check: "\u0e15\u0e23\u0e27\u0e08\u0e04\u0e33\u0e15\u0e2d\u0e1a", typeIt: "\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e17\u0e35\u0e48\u0e19\u0e35\u0e48…", activityComplete: "\u0e17\u0e33\u0e01\u0e34\u0e08\u0e01\u0e23\u0e23\u0e21\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e41\u0e25\u0e49\u0e27!", practiceAgain: "\u0e1d\u0e36\u0e01\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", practiceComplete: "\u0e1d\u0e36\u0e01\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e41\u0e25\u0e49\u0e27!", lessonComplete: "\u0e08\u0e1a\u0e1a\u0e17\u0e17\u0e35\u0e48 {n} \u0e41\u0e25\u0e49\u0e27!", niceWork: "\u0e17\u0e33\u0e44\u0e14\u0e49\u0e14\u0e35\u0e21\u0e32\u0e01 — \u0e1d\u0e36\u0e01\u0e0b\u0e49\u0e33\u0e44\u0e14\u0e49\u0e17\u0e38\u0e01\u0e40\u0e21\u0e37\u0e48\u0e2d", canDo: "\u0e04\u0e38\u0e13\u0e1f\u0e31\u0e07 \u0e2d\u0e48\u0e32\u0e19 \u0e41\u0e25\u0e30\u0e1e\u0e39\u0e14\u0e44\u0e14\u0e49\u0e41\u0e25\u0e49\u0e27", finishLesson: "\u0e08\u0e1a\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19", exitStage: "\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49?", exitStageText: "\u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13\u0e43\u0e19\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e08\u0e30\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01", exitYes: "\u0e43\u0e0a\u0e48 \u0e2d\u0e2d\u0e01", exitNo: "\u0e2d\u0e22\u0e39\u0e48\u0e15\u0e48\u0e2d" },
  zh: { listenTap: "\u542c\u5e76\u70b9\u9009", lookTap: "\u770b\u5e76\u70b9\u9009", sayAloud: "\u5927\u58f0\u8bf4\u51fa\u6765", fillWord: "\u586b\u5165\u7f3a\u5c11\u7684\u5355\u8bcd", offline: "\u79bb\u7ebf — \u4f60\u7684\u8fdb\u5ea6\u7a0d\u540e\u4f1a\u540c\u6b65。", loading: "\u6b63\u5728\u51c6\u5907\u4f60\u7684\u8bfe\u7a0b…", loadError: "\u65e0\u6cd5\u52a0\u8f7d\u8bfe\u7a0b。", loadErrorText: "\u68c0\u67e5\u4f60\u7684\u8fde\u63a5\u5e76\u91cd\u8bd5。", tryAgain: "\u91cd\u8bd5", paywallTitle: "\u672c\u8bfe\u9700\u8981\u8ba2\u9605。", paywallText: "\u7b2c\u4e00\u5355\u5143（\u7b2c1-4\u8bfe）\u6c38\u4e45\u514d\u8d39。\u4ee5 $3/\u6708 \u6216 $29/\u5e74 \u89e3\u9501\u6240\u6709\u8bfe\u7a0b。", seePlans: "\u67e5\u770b\u5957\u9910", backFree: "\u8fd4\u56de\u514d\u8d39\u7b2c\u4e00\u5355\u5143", tapStart: "\u70b9\u6309\u5f00\u59cb", tagline: "\u770b\u4e00\u770b，\u542c\u4e00\u542c，\u8bf4\u4e00\u8bf4。", whichPicture: "\u54ea\u5f20\u56fe\u7247\u5339\u914d？", whichSentence: "\u54ea\u4e2a\u53e5\u5b50\u5339\u914d？", hearAgain: "\u518d\u542c\u4e00\u6b21", needsConnection: "\u9700\u8981\u7f51\u7edc", needsConnectionText: "\u53e3\u8bed\u7ec3\u4e60\u9700\u8981\u7f51\u7edc\u6765\u68c0\u67e5。\u4f60\u7684\u5176\u4ed6\u8fdb\u5ea6\u662f\u5b89\u5168\u7684。", tapMic: "\u70b9\u6309\u9ea6\u514b\u98ce\u5e76\u8bf4\u51fa\u53e5\u5b50。", noMic: "\u672a\u627e\u5230\u9ea6\u514b\u98ce。\u68c0\u67e5\u6743\u9650\u540e\u70b9\u6309\u9ea6\u514b\u98ce\u91cd\u8bd5。", listening: "\u6b63\u5728\u8046\u542c…\u70b9\u6309\u9ea6\u514b\u98ce\u53ef\u63d0\u524d\u7ed3\u675f。", checking: "\u6b63\u5728\u68c0\u67e5\u4f60\u7684\u8868\u73b0…", scoringError: "\u8bc4\u5206\u51fa\u9519。\u8bf7\u91cd\u8bd5。", closeEnough: "\u975e\u5e38\u63a5\u8fd1！", closeEnoughText: "\u53ef\u4ee5\u7406\u89e3。\u518d\u542c\u4e00\u6b21，\u5c3d\u91cf\u5339\u914d\u58f0\u8c03。", great: "\u592a\u68d2\u4e86！", greatText: "\u542c\u8d77\u6765\u975e\u5e38\u6807\u51c6。", almost: "\u5dee\u4e00\u70b9！", goodEnough: "\u5df2\u7ecf\u591f\u597d\u4e86 — \u7ee7\u7eed。", tryClearer: "\u518d\u8bd5\u4e00\u6b21，\u8bf4\u5f97\u66f4\u6e05\u695a\u4e9b。", tryAgainTitle: "\u91cd\u8bd5", goodEffort: "\u52aa\u529b\u5f88\u597d — \u7ee7\u7eed。", listenRepeat: "\u542c\u5e76\u8ddf\u8bfb。", continueBtn: "\u7ee7\u7eed", correct: "\u6b63\u786e！", notQuite: "\u4e0d\u592a\u5bf9 — \u518d\u542c\u4e00\u6b21\u5e76\u91cd\u8bd5。", check: "\u68c0\u67e5", typeIt: "\u8f93\u5165…", activityComplete: "\u6d3b\u52a8\u5b8c\u6210！", practiceAgain: "\u518d\u7ec3\u4e00\u6b21", practiceComplete: "\u7ec3\u4e60\u5b8c\u6210！", lessonComplete: "\u7b2c{n}\u8bfe\u5b8c\u6210！", niceWork: "\u505a\u5f97\u5f88\u597d — \u968f\u65f6\u518d\u6765\u7ec3\u4e60。", canDo: "\u4f60\u5df2\u7ecf\u80fd\u542c、\u8bfb、\u8bf4\u4e86。", finishLesson: "\u5b8c\u6210\u8bfe\u7a0b", exitStage: "\u9000\u51fa\u5f53\u524d\u9636\u6bb5\uff1f", exitStageText: "\u4f60\u5728\u5f53\u524d\u9636\u6bb5\u7684\u8fdb\u5ea6\u4e0d\u4f1a\u88ab\u4fdd\u5b58\u3002", exitYes: "\u662f\uff0c\u9000\u51fa", exitNo: "\u7559\u4e0b" }
};
const uiLang = (() => {
  const m = (document.cookie || "").match(/(?:^|;\s*)nl_ui=([a-z]{2})/);
  return m && UI_STRINGS[m[1]] ? m[1] : "en";
})();
const S = UI_STRINGS[uiLang];
const ACTIVITY_LABEL = {
  "listen-match": S.listenTap,
  "image-phrase": S.lookTap,
  "speak-score": S.sayAloud,
  "read-write": S.fillWord,
};

const api = {
  async me() {
    const r = await fetch("/api/me", { credentials: "include" });
    return r.ok;
  },
  async anonymous() {
    await fetch("/api/auth/sign-in/anonymous", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  },
  manifestUrl() {
    const lang = langFromPath(location.pathname);
    const lesson = lessonFromPath(location.pathname);
    if (lang === "en" && lesson === "01") return "/api/lessons/01";
    return `/api/lessons/${lang}/${lesson}`;
  },
  async manifest() {
    const r = await fetch(api.manifestUrl(), { credentials: "include" });
    if (!r.ok) throw Object.assign(new Error("manifest failed"), { status: r.status });
    return r.json();
  },
  async progress(lessonId) {
    const r = await fetch(`/api/progress?lesson=${lessonId}`, {
      credentials: "include",
    });
    return r.ok ? (await r.json()).completed : [];
  },
  async postProgress({ lessonId, activity }) {
    const r = await fetch("/api/progress", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, activity }),
    });
    // 4xx is a real rejection (bad order/unknown activity): don't retry it.
    if (!r.ok && r.status < 500) return;
    if (!r.ok) throw new Error("progress failed");
  },
  // Online: post now. Offline or 5xx: queue for later (server completion
  // is idempotent, so a lost response can't double-record).
  async complete(activity, lessonId) {
    if (!navigator.onLine) {
      queue.enqueue(activity, lessonId);
      return;
    }
    try {
      await api.postProgress({ lessonId, activity });
    } catch {
      queue.enqueue(activity, lessonId);
    }
  },
  async score(phraseId, audioBase64, prevVerdict) {
    const r = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phraseId, audio: audioBase64, prevVerdict: prevVerdict ?? null }),
    });
    if (!r.ok) throw new Error("score failed");
    return r.json();
  },
};

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23dce7f8'/%3E%3Ctext x='200' y='235' font-size='120' text-anchor='middle' fill='%231a5feb'%3E%E2%99%AA%3C/text%3E%3C/svg%3E";

function appImg(attrs) {
  const el = h("img", attrs);
  el.addEventListener("error", () => {
    if (!el.src.startsWith("data:")) el.src = PLACEHOLDER;
  });
  return el;
}

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const kid of kids) {
    el.append(kid instanceof Node ? kid : document.createTextNode(kid));
  }
  return el;
}

// Mandarin shows characters primary with pinyin beneath; Thai is
// vocal-only (romanization only, script never shown). Both carry
// scoreText, so gate on the phrase id prefix (same convention as the
// /api/score unspaced branch). Languages without scoreText render
// their text unchanged.
function phraseNodes(phrase) {
  if (!phrase.scoreText || !phrase.id.startsWith("zh-")) return [phrase.text];
  return [
    h("span", { class: "native" }, phrase.scoreText),
    h("span", { class: "roman" }, phrase.text),
  ];
}

// "Exit current stage?" guard. The parrot (leaving the lesson) always
// confirms. A completed stage bar confirms only mid-stage, when leaving
// would lose your place; on the start gate or after the current stage
// is finished, bars navigate straight away.
function stageInProgress(state) {
  return !!state.activity && !(state.completed ?? []).includes(state.activity);
}

function confirmExitStage() {
  return new Promise((resolve) => {
    const yes = h("button", { class: "btn", type: "button" }, S.exitYes);
    const no = h("button", { class: "btn ghost", type: "button" }, S.exitNo);
    const dialog = h(
      "div",
      { class: "dialog-backdrop" },
      h(
        "div",
        { class: "dialog", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "exit-stage-title" },
        h("h2", { id: "exit-stage-title" }, S.exitStage),
        h("p", { class: "sub" }, S.exitStageText),
        h("div", { class: "dialog-actions" }, no, yes),
      ),
    );
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
    };
    const close = (v) => {
      document.removeEventListener?.("keydown", onKey);
      dialog.remove();
      resolve(v);
    };
    yes.addEventListener("click", () => close(true));
    no.addEventListener("click", () => close(false));
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) close(false);
    });
    document.addEventListener?.("keydown", onKey);
    document.body.append(dialog);
    no.focus?.();
  });
}

async function guardExit(state) {
  return !stageInProgress(state) || (await confirmExitStage());
}

function topbar(state, onStage) {
  const done = new Set(state.completed);
  const segs = (state.activities ?? ACTIVITIES).map((a, i) => {
    const bar = h("i", {
      class: done.has(a) ? "done" : a === state.activity ? "now" : "",
    });
    // Completed stages are buttons: tapping one replays that stage
    // (earned progress is kept). Other stages stay plain bars.
    if (done.has(a) && onStage) {
      return h(
        "button",
        {
          class: "seg",
          type: "button",
          "aria-label": `Stage ${i + 1}: ${ACTIVITY_LABEL[a]}`,
          title: ACTIVITY_LABEL[a],
          onclick: async () => {
            if (await guardExit(state)) onStage(a);
          },
        },
        bar,
      );
    }
    return h("span", { class: "seg" }, bar);
  });
  return h(
    "div",
    { class: "topbar" },
    h(
      "a",
      {
        class: "brand",
        href: "/",
        "aria-label": "Nicelingo home",
        onclick: async (e) => {
          e?.preventDefault();
          // The parrot always confirms before leaving a lesson, even
          // on the start gate or after a stage is finished.
          if (await confirmExitStage()) location.href = "/";
        },
      },
      h("img", { src: "/logo/parrot-mark.svg", alt: "" }),
    ),
    h("div", { class: "segments" }, ...segs),
    h("div", { class: "step" }, state.stepText ?? ""),
  );
}

function readLocalCompleted(lessonId) {
  try {
    return JSON.parse(localStorage.getItem(`nicelingo:completed:${lessonId}`) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocalCompleted(lessonId, completed) {
  try {
    localStorage.setItem(`nicelingo:completed:${lessonId}`, JSON.stringify(completed));
    try {
      const now = new Date();
      const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const days = JSON.parse(localStorage.getItem("nl-days") || "[]");
      if (!days.includes(day)) {
        days.push(day);
        localStorage.setItem("nl-days", JSON.stringify(days.slice(-400)));
      }
    } catch {}
  } catch {
    /* private mode: resume degrades to activity one */
  }
}

function updateOfflineBanner() {
  let bar = document.getElementById("offline-bar");
  if (navigator.onLine) {
    bar?.remove();
    return;
  }
  if (!bar) {
    bar = h("div", { id: "offline-bar" }, S.offline);
    document.body.prepend(bar);
  }
}

function confetti() {
  const colors = ["#8CC8FF", "#FFB061", "#FFE066", "#7FE3C4", "#FF9DB5"];
  for (let i = 0; i < 70; i++) {
    const c = h("div", { class: "confetti" });
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.6}s`;
    c.style.borderRadius = i % 2 ? "50%" : "2px";
    document.body.append(c);
    setTimeout(() => c.remove(), 3400);
  }
}

// One voice at random per listen: the default voice plus every extra
// in phrase.audioUrls. Never the same URL twice in a row for a phrase
// (when a choice exists), so tapping repeat audibly changes voice.
// Single-voice phrases play audioUrl as before.
const lastUrlByPhrase = new Map();
function pickAudioUrl(phrase) {
  const urls = [phrase.audioUrl, ...Object.values(phrase.audioUrls ?? {})];
  if (urls.length < 2) return urls[0];
  const fresh = urls.filter((u) => u !== lastUrlByPhrase.get(phrase.id));
  const pick = fresh[Math.floor(Math.random() * fresh.length)];
  lastUrlByPhrase.set(phrase.id, pick);
  return pick;
}
function playAudio(url, btn) {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    btn?.classList.add("playing");
    audio.onended = audio.onerror = () => {
      btn?.classList.remove("playing");
      resolve();
    };
    audio.play().catch(() => {
      btn?.classList.remove("playing");
      resolve();
    });
  });
}

const player = {
  manifest: null,
  state: { activity: null, completed: [], stepText: "" },

  async boot() {
    this.screen(h("div", { class: "loading" }, h("div", { class: "spin" }), h("p", {}, S.loading)));
    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
      updateOfflineBanner();
      window.addEventListener("online", () => {
        updateOfflineBanner();
        queue.flush(api.postProgress).catch(() => {});
      });
      window.addEventListener("offline", updateOfflineBanner);
      // Offline boot: skip session + sync, read manifest and progress
      // from local caches. First-ever visit offline still lands on retry.
      const offline = !navigator.onLine;
      if (!offline) {
        if (!(await api.me())) await api.anonymous();
        await queue.flush(api.postProgress).catch(() => {});
      }
      this.manifest = await api.manifest();
      // Vocal-only languages omit read-write; stale caches fall back.
      this.state.activities = this.manifest.activities ?? ACTIVITIES;
      const params = new URLSearchParams(location.search);
      // Practice runs replay all activities without reading or writing
      // progress: earned completion stays untouched.
      this.practice = params.get("practice") === "1";
      this.state.completed = this.practice
        ? []
        : offline
          ? readLocalCompleted(this.manifest.id)
          : await api.progress(this.manifest.id);
      const demo = params.get("demo");
      const start =
        demo && this.activities().includes(demo)
          ? demo
          : nextIncomplete(this.activities(), this.state.completed);
      if (!start) return this.lessonDone();
      // Browsers block audio before a tap: one start gate unlocks sound
      // for the whole lesson. Demo links skip it for screenshots.
      if (demo) return this.startActivity(start);
      this.startGate(start);
    } catch (e) {
      if (e && (e.status === 401 || e.status === 402)) return this.paywall();
      this.screen(
        h("div", { class: "screen" },
          h("div", { class: "error" }, h("b", {}, S.loadError), h("p", {}, S.loadErrorText)),
          h("button", { class: "btn", onclick: () => this.boot() }, S.tryAgain)),
      );
    }
  },

  paywall() {
    this.screen(
      h("div", { class: "screen" },
        h("div", { class: "sun" }, h("b", {}, S.paywallTitle), h("p", {}, S.paywallText)),
        h("a", { class: "btn", href: "/billing" }, S.seePlans),
        h("p", {}, h("a", { href: "/lesson/01" }, "← " + S.backFree))),
    );
  },

  screen(...nodes) {
    app.replaceChildren(...nodes);
    app.focus({ preventScroll: true });
  },

  startGate(start) {
    const go = h("button", { class: "btn sun" }, S.tapStart);
    go.addEventListener("click", () => this.startActivity(start), { once: true });
    this.screen(
      h("div", { class: "screen" },
        topbar(this.state, (a) => this.startActivity(a)),
        h("div", { class: "celebrate" },
          h("div", { class: "stars" }, "♪"),
          h("h1", {}, `Lesson ${Number(lessonFromPath(location.pathname))}`),
          h("p", { class: "sub" }, S.tagline),
          h("div", { class: "spacer" }),
          go)),
    );
  },

  startActivity(activity) {
    this.state.activity = activity;
    this.state.qIndex = 0;
    if (activity === "listen-match" || activity === "image-phrase") {
      this.state.questions = buildQuestions(this.manifest.phrases).flat();
      this.choiceQuestion();
    } else if (activity === "speak-score") {
      const byId = Object.fromEntries(this.manifest.phrases.map((p) => [p.id, p]));
      this.state.speakPlan = buildSpeakPlan(this.manifest.phrases).map((id) => byId[id]);
      this.state.attempts = [];
      this.speakQuestion();
    } else {
      const byId = Object.fromEntries(this.manifest.phrases.map((p) => [p.id, p]));
      this.state.writePlan = readWritePicks(this.manifest.phrases).map((id) => byId[id]);
      this.writeQuestion();
    }
  },

  choiceQuestion() {
    const { questions, qIndex, activity } = this.state;
    const q = questions[qIndex];
    this.state.stepText = `${qIndex + 1} of ${questions.length}`;
    let locked = false;

    const onPick = async (btn, opt) => {
      if (locked) return;
      if (checkAnswer(q, opt.id)) {
        locked = true;
        btn.classList.add("correct");
        setTimeout(() => this.nextChoice(), 850);
      } else {
        btn.classList.add("wrong");
        setTimeout(() => btn.classList.remove("wrong"), 600);
      }
    };

    const grid = h(
      "div",
      { class: "grid" },
      ...q.options.map((opt) =>
        activity === "listen-match"
          ? h("button", { class: "pick", onclick: (e) => onPick(e.currentTarget, opt) },
              appImg({ src: opt.imageUrl, alt: "" }))
          : h("button", { class: "pick", onclick: (e) => onPick(e.currentTarget, opt) },
              h("span", { class: "opt-text" }, ...phraseNodes(opt))),
      ),
    );

    const body =
      activity === "listen-match"
        ? [
            h("h1", {}, S.whichPicture),
            (() => {
              const b = h("button", { class: "speaker", "aria-label": "Play sound" }, "♪");
              b.addEventListener("click", () => playAudio(pickAudioUrl(q.target), b));
              setTimeout(() => playAudio(pickAudioUrl(q.target), b), 350);
              return b;
            })(),
            grid,
          ]
        : [
            h("h1", {}, S.whichSentence),
            appImg({ class: "hero-img", src: q.target.imageUrl, alt: "" }),
            grid,
          ];
    this.screen(h("div", { class: "screen" }, topbar(this.state, (a) => this.startActivity(a)), ...body));
  },

  nextChoice() {
    this.state.qIndex++;
    if (this.state.qIndex >= this.state.questions.length) this.activityDone();
    else this.choiceQuestion();
  },

  speakQuestion() {
    const { speakPlan, qIndex, attempts } = this.state;
    const phrase = speakPlan[qIndex];
    if (!navigator.onLine) {
      const retry = h("button", { class: "btn" }, S.tryAgain);
      retry.addEventListener("click", () => this.speakQuestion(), { once: true });
      const listen = h("button", { class: "btn ghost" }, S.hearAgain);
      listen.addEventListener("click", () => playAudio(pickAudioUrl(phrase), null));
      this.screen(
        h("div", { class: "screen" },
          topbar(this.state, (a) => this.startActivity(a)),
          h("h1", {}, S.sayAloud),
          appImg({ class: "hero-img", src: phrase.imageUrl, alt: "" }),
          h("div", { class: "phrase-card" }, ...phraseNodes(phrase)),
          h("div", { class: "banner yellow" },
            h("div", { class: "face" }, "!"),
            h("div", {}, h("b", {}, S.needsConnection), h("small", {}, S.needsConnectionText))),
          h("div", { class: "spacer" }),
          h("div", { style: "display:flex;flex-direction:column;gap:0.6rem" }, listen, retry)),
      );
      return;
    }
    this.state.stepText = `${qIndex + 1} of ${speakPlan.length}`;
    const dots = h(
      "div",
      { class: "dots" },
      ...[0, 1, 2].map((i) =>
        h("i", { class: attempts[i] ? `used-${attempts[i]}` : "" }),
      ),
    );
    const mic = h("button", { class: "mic", "aria-label": "Record your voice" }, "🎙");
    const status = h("p", { class: "sub", style: "text-align:center" }, S.tapMic);
    mic.addEventListener("click", () => this.record(phrase, mic, status, dots), { once: true });
    this.screen(
      h("div", { class: "screen" },
        topbar(this.state, (a) => this.startActivity(a)),
        h("h1", {}, S.sayAloud),
        appImg({ class: "hero-img", src: phrase.imageUrl, alt: "" }),
        h("div", { class: "phrase-card" }, ...phraseNodes(phrase)),
        h("div", { class: "mic-wrap" }, mic),
        status,
        dots),
    );
  },

  async record(phrase, mic, status, dots) {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      status.textContent = S.noMic;
      const retry = h("button", { class: "btn ghost" }, S.tryAgain);
      retry.addEventListener("click", () => this.speakQuestion(), { once: true });
      mic.replaceWith(retry);
      return;
    }
    const rec = new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    mic.classList.add("recording");
    const bars = h("div", { class: "bars" }, h("i"), h("i"), h("i"), h("i"), h("i"));
    status.after(bars);
    const stopped = new Promise((resolve) => {
      rec.onstop = resolve;
    });
    // One tap records a fixed window and submits on its own; the mic
    // button acts as a clock face sweeping 12-to-12 while recording.
    // Tapping again just finishes early.
    const RECORD_MS = 8000;
    mic.classList.add("clock");
    mic.style.color = "transparent";
    const hand = h("i", { class: "clock-hand" });
    mic.append(hand);
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = Date.now();
    let sweep;
    let deadline;
    const doStop = () => {
      if (sweep) clearInterval(sweep);
      if (deadline) clearTimeout(deadline);
      if (rec.state !== "inactive") rec.stop();
    };
    const paint = () => {
      const pct = Math.min(100, ((Date.now() - started) / RECORD_MS) * 100);
      mic.style.setProperty("--sweep", pct.toFixed(1));
      hand.style.transform = `translateX(-50%) rotate(${(pct / 100) * 360}deg)`;
    };
    mic.addEventListener("click", doStop, { once: true });
    rec.start();
    status.textContent = S.listening;
    if (!reduceMotion) {
      paint();
      sweep = setInterval(paint, 100);
    }
    deadline = setTimeout(doStop, RECORD_MS);
    await stopped;
    if (sweep) clearInterval(sweep);
    if (deadline) clearTimeout(deadline);
    stream.getTracks().forEach((t) => t.stop());
    bars.remove();
    hand.remove();
    mic.classList.remove("recording");
    mic.classList.remove("clock");
    mic.style.color = "";
    mic.disabled = true;
    status.textContent = S.checking;
    try {
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const prevVerdict = this.state.attempts[this.state.attempts.length - 1] ?? null;
      const { verdict, pass } = await api.score(phrase.id, base64, prevVerdict);
      this.state.attempts.push(verdict);
      this.speakVerdict(phrase, verdict, pass === true);
    } catch {
      status.textContent = S.scoringError;
      mic.disabled = false;
      mic.addEventListener("click", () => this.record(phrase, mic, status, dots), { once: true });
    }
  },

  speakVerdict(phrase, verdict, serverPass) {
    const { attempts, speakPlan, qIndex } = this.state;
    const last = attempts.length >= 3;
    // The server decides passes (attemptPasses): green always; a Thai
    // yellow only as a Clef minor slip with low p(wrong) on a second
    // consecutive yellow. Shown as "Close enough", not a fail.
    const passed = serverPass === true;
    const copy = passed && verdict === "yellow"
      ? [S.closeEnough, S.closeEnoughText]
      : {
          green: [S.great, S.greatText],
          yellow: [S.almost, last ? S.goodEnough : S.tryClearer],
          red: [S.tryAgainTitle, last ? S.goodEffort : S.listenRepeat],
        }[verdict];
    const dots = h(
      "div",
      { class: "dots" },
      ...[0, 1, 2].map((i) => h("i", { class: attempts[i] ? `used-${attempts[i]}` : "" })),
    );
    const next = h("button", { class: "btn" }, passed || last ? S.continueBtn : S.tryAgain);
    next.addEventListener(
      "click",
      () => {
        if (passed || last) {
          this.state.qIndex++;
          this.state.attempts = [];
          if (this.state.qIndex >= speakPlan.length) this.activityDone();
          else this.speakQuestion();
        } else {
          this.state.attempts = [...attempts];
          this.speakQuestionKeepAttempts(phrase);
        }
      },
      { once: true },
    );
    const replay = h("button", { class: "btn ghost" }, S.hearAgain);
    replay.addEventListener("click", () => playAudio(pickAudioUrl(phrase), null));
    this.screen(
      h("div", { class: "screen" },
        topbar(this.state, (a) => this.startActivity(a)),
        appImg({ class: "hero-img", src: phrase.imageUrl, alt: "" }),
        h("div", { class: "phrase-card" }, ...phraseNodes(phrase)),
        h("div", { class: `banner ${verdict}` },
          h("div", { class: "face" }, verdict === "green" ? "✓" : verdict === "yellow" ? "≈" : "!"),
          h("div", {}, h("b", {}, copy[0]), h("small", {}, copy[1]))),
        dots,
        h("div", { class: "spacer" }),
        passed || last ? next : h("div", { style: "display:flex;flex-direction:column;gap:0.6rem" }, next, replay)),
    );
  },

  speakQuestionKeepAttempts(phrase) {
    const keep = this.state.attempts;
    this.speakQuestion();
    this.state.attempts = keep;
    const dots = app.querySelector(".dots");
    if (dots) {
      [...dots.children].forEach((d, i) => {
        d.className = keep[i] ? `used-${keep[i]}` : "";
      });
    }
  },

  writeQuestion() {
    const { writePlan, qIndex } = this.state;
    const phrase = writePlan[qIndex];
    const b = blanked(phrase.text);
    this.state.stepText = `${qIndex + 1} of ${writePlan.length}`;
    const input = h("input", {
      type: "text",
      autocomplete: "off",
      autocapitalize: "off",
      "aria-label": "Missing word",
      placeholder: S.typeIt,
    });
    const msg = h("p", { class: "sub", style: "text-align:center;min-height:1.5em" }, "");
    const check = async () => {
      if (b.check(input.value)) {
        msg.textContent = S.correct;
        setTimeout(() => {
          this.state.qIndex++;
          if (this.state.qIndex >= writePlan.length) this.activityDone();
          else this.writeQuestion();
        }, 800);
      } else {
        msg.textContent = S.notQuite;
      }
    };
    const speaker = h("button", { class: "speaker", "aria-label": "Play sound" }, "♪");
    speaker.addEventListener("click", () => playAudio(pickAudioUrl(phrase), speaker));
    setTimeout(() => playAudio(pickAudioUrl(phrase), speaker), 350);
    const go = h("button", { class: "btn" }, S.check);
    go.addEventListener("click", check);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") check();
    });
    this.screen(
      h("div", { class: "screen" },
        topbar(this.state, (a) => this.startActivity(a)),
        h("h1", {}, S.fillWord),
        speaker,
        h("div", { class: "phrase-card" }, b.prompt),
        h("div", { class: "write-row" }, input, go),
        msg),
    );
  },

  async activityDone() {
    const done = this.state.activity;
    if (!this.practice) {
      try {
        await api.complete(done, this.manifest.id);
      } catch {
        /* progress resumes server-side; display continues */
      }
      writeLocalCompleted(
        this.manifest.id,
        [...this.state.completed, done],
      );
    }
    this.state.completed = [...this.state.completed, done];
    const next = nextIncomplete(this.activities(), this.state.completed);
    confetti();
    const btn = h("button", { class: "btn sun" }, next ? S.continueBtn : S.finishLesson);
    btn.addEventListener(
      "click",
      () => (next ? this.startActivity(next) : this.lessonDone()),
      { once: true },
    );
    this.screen(
      h("div", { class: "screen" },
        topbar(this.state, (a) => this.startActivity(a)),
        h("div", { class: "celebrate" },
          h("div", { class: "stars" }, "★ ★ ★"),
          h("h1", {}, S.activityComplete),
          h("p", { class: "sub" }, ACTIVITY_LABEL[done]),
          h("div", { class: "spacer" }),
          btn)),
    );
  },

  lessonDone() {
    confetti();
    setTimeout(confetti, 900);
    const practice = this.practice;
    const again = practice
      ? h("button", { class: "btn", onclick: () => this.replayPractice() }, S.practiceAgain)
      : h("button", { class: "btn", onclick: () => { location.href = `${location.pathname}?practice=1`; } }, S.practiceAgain);
    this.screen(
      h("div", { class: "screen" },
        h("div", { class: "celebrate" },
          h("div", { class: "stars" }, "★ ★ ★"),
          h("h1", {}, practice ? S.practiceComplete : S.lessonComplete.replace("{n}", String(Number(lessonFromPath(location.pathname))))),
          h("p", { class: "sub" }, practice ? S.niceWork : S.canDo),
          h("div", { class: "spacer" }),
          again,
          h("p", {}, h("a", { href: "/" }, "← All lessons")))),
    );
  },

  activities() {
    return this.manifest?.activities ?? ACTIVITIES;
  },

  replayPractice() {
    this.state.completed = [];
    this.state.activity = null;
    this.startGate(this.activities()[0]);
  },
};

player.boot();
