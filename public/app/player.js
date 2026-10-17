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
  en: { listenTap: "Listen and tap", lookTap: "Look and tap", sayAloud: "Say it aloud", fillWord: "Fill the missing word", offline: "Offline \u2014 your progress will sync.", loading: "Getting your lesson ready\u2026", loadError: "Could not load the lesson.", loadErrorText: "Check your connection and try again.", tryAgain: "Try again", paywallTitle: "This lesson needs a subscription.", paywallText: "Unit 1 (lessons 1-4) is free forever. Unlock every lesson for $3/month or $29/year.", seePlans: "See plans", backFree: "Back to free Unit 1", tapStart: "Tap to start", tagline: "See it, hear it, say it.", whichPicture: "Which picture matches?", whichSentence: "Which sentence matches?", hearAgain: "Hear it again", needsConnection: "Needs connection", needsConnectionText: "Speaking practice needs the internet to check you. Your other progress is safe.", tapMic: "Tap the mic and say the sentence.", noMic: "No microphone found. Check permission and tap the mic to try again.", listening: "Listening\u2026 tap the mic to finish early.", checking: "Checking how you did\u2026", scoringError: "Something went wrong scoring that. Try again.", closeEnough: "Close enough!", closeEnoughText: "That was understood. Listen once more and try to match the tones as you go.", great: "Great!", greatText: "That sounded just right.", almost: "Almost!", goodEnough: "Good enough \u2014 moving on.", tryClearer: "Try once more, a little clearer.", tryAgainTitle: "Try again", goodEffort: "Good effort \u2014 moving on.", listenRepeat: "Listen and repeat after the speaker.", continueBtn: "Continue", correct: "Correct!", notQuite: "Not quite \u2014 listen again and try.", check: "Check", typeIt: "Type it\u2026", activityComplete: "Activity complete!", practiceAgain: "Practice again", practiceComplete: "Practice complete!", lessonComplete: "Lesson {n} complete!", niceWork: "Nice work \u2014 run it back anytime.", canDo: "You can hear it, read it, and say it.", finishLesson: "Finish lesson", shareDone: "I just finished Lesson {n} on Nicelingo and learned {phrases} new phrases!", checkpointTitle: "Unit {n} checkpoint", practiseTitle: "Practise my mistakes", dailyReviewTitle: "Daily review", challengeTitle: "Level {n} challenge", challengeLocked: "Pass every unit checkpoint in this level to unlock", challengeIntro: "3 scenes, 12 lines to say out loud", sceneOf: "Scene {a} of {b}", levelDoneTitle: "Level {n} complete!", learnedLine: "You can say {n} phrases", startUnitOne: "Start at Unit 1 instead", subscribeToOpen: "Subscribe to open this level", phrasesFixed: "{n} phrases fixed", stillToPractise: "{n} still to practise", reviewEmpty: "No mistakes to practise right now", checkpointIntro: "10 questions, about 3 minutes", checkpointStart: "Start checkpoint", checkpointPassedText: "Checkpoint passed", checkpointFail: "So close!", checkpointScoreLine: "{n} of 10", checkpointLocked: "Finish all 4 lessons to unlock", continueToUnit: "Continue to Unit {n}", tryAgainCp: "Try again", practiseThese: "Practise these", playWordAria: "Play {word}, meaning {gloss}", helpWords: "Help with words", nextLesson: "Next lesson", lessonPage: "Lesson page", closeWord: "Close", shareBtn: "Share", copyLink: "Copy link", copied: "Copied!", exitStage: "Exit current stage?", exitStageText: "Your place in this stage will not be saved.", exitYes: "Yes, exit", exitNo: "Stay" },
  es: { listenTap: "Escucha y toca", lookTap: "Mira y toca", sayAloud: "Dilo en voz alta", fillWord: "Completa la palabra", offline: "Sin conexión — tu progreso se sincronizará.", loading: "Preparando tu lección…", loadError: "No se pudo cargar la lección.", loadErrorText: "Revisa tu conexión e inténtalo de nuevo.", tryAgain: "Intentar de nuevo", paywallTitle: "Esta lección necesita una suscripción.", paywallText: "La Unidad 1 (lecciones 1-4) es gratuita para siempre. Desbloquea todo por $3/mes o $29/año.", seePlans: "Ver planes", backFree: "Volver a la Unidad 1 gratuita", tapStart: "Toca para empezar", tagline: "Míralo. Escúchalo. Dilo.", whichPicture: "¿Qué imagen coincide?", whichSentence: "¿Qué frase coincide?", hearAgain: "Escuchar de nuevo", needsConnection: "Necesita conexión", needsConnectionText: "La práctica oral necesita internet para evaluarte. Tu demás progreso está a salvo.", tapMic: "Toca el micrófono y di la frase.", noMic: "No se encontró micrófono. Revisa el permiso y toca el micrófono para reintentar.", listening: "Escuchando… toca el micrófono para terminar antes.", checking: "Revisando cómo lo hiciste…", scoringError: "Algo salió mal al calificar. Inténtalo de nuevo.", closeEnough: "¡Casi perfecto!", closeEnoughText: "Se entendió. Escucha una vez más e intenta igualar los tonos.", great: "¡Genial!", greatText: "Sonó justo como debía.", almost: "¡Casi!", goodEnough: "Suficiente — seguimos.", tryClearer: "Inténtalo una vez más, un poco más claro.", tryAgainTitle: "Inténtalo de nuevo", goodEffort: "Buen esfuerzo — seguimos.", listenRepeat: "Escucha y repite después del audio.", continueBtn: "Continuar", correct: "¡Correcto!", notQuite: "Casi — escucha de nuevo e inténtalo.", check: "Comprobar", typeIt: "Escríbelo…", activityComplete: "¡Actividad completada!", practiceAgain: "Practicar de nuevo", practiceComplete: "¡Práctica completada!", lessonComplete: "¡Lección {n} completada!", niceWork: "Buen trabajo — repítelo cuando quieras.", canDo: "Ya puedes escucharlo, leerlo y decirlo.", finishLesson: "Terminar la lección", shareDone: "¡Acabo de terminar la lección {n} en Nicelingo y aprendí {phrases} frases nuevas!", checkpointTitle: "Control de la unidad {n}", practiseTitle: "Practicar mis errores", challengeTitle: "Desafío del nivel {n}", challengeLocked: "Supera todos los controles de unidad de este nivel para desbloquearlo", challengeIntro: "3 escenas, 12 frases para decir en voz alta", sceneOf: "Escena {a} de {b}", levelDoneTitle: "¡Nivel {n} completado!", learnedLine: "Ya puedes decir {n} frases", startUnitOne: "Empezar en la unidad 1", subscribeToOpen: "Suscríbete para abrir este nivel", phrasesFixed: "{n} frases corregidas", stillToPractise: "{n} por practicar todavía", reviewEmpty: "No hay errores que practicar ahora", checkpointIntro: "10 preguntas, unos 3 minutos", checkpointStart: "Empezar el control", checkpointPassedText: "Control superado", checkpointFail: "¡Casi!", checkpointScoreLine: "{n} de 10", checkpointLocked: "Termina las 4 lecciones para desbloquearlo", continueToUnit: "Continuar a la unidad {n}", tryAgainCp: "Intentarlo de nuevo", practiseThese: "Practicar estos", playWordAria: "Escuchar {word}, que significa {gloss}", helpWords: "Ayuda con las palabras", nextLesson: "Lección siguiente", lessonPage: "Página de lecciones", closeWord: "Cerrar", shareBtn: "Compartir", copyLink: "Copiar enlace", copied: "¡Copiado!", exitStage: "¿Salir de esta etapa?", exitStageText: "No se guardará tu lugar en esta etapa.", exitYes: "Sí, salir", exitNo: "Quedarme" },
  de: { listenTap: "Hören und tippen", lookTap: "Sehen und tippen", sayAloud: "Laut nachsprechen", fillWord: "Fehlendes Wort ergänzen", offline: "Offline — dein Fortschritt wird synchronisiert.", loading: "Deine Lektion wird vorbereitet…", loadError: "Die Lektion konnte nicht geladen werden.", loadErrorText: "Prüfe deine Verbindung und versuche es erneut.", tryAgain: "Erneut versuchen", paywallTitle: "Diese Lektion braucht ein Abo.", paywallText: "Einheit 1 (Lektionen 1-4) ist für immer kostenlos. Schalte alles für $3/Monat oder $29/Jahr frei.", seePlans: "Pläne ansehen", backFree: "Zurück zur kostenlosen Einheit 1", tapStart: "Tippen zum Starten", tagline: "Sehen. Hören. Sprechen.", whichPicture: "Welches Bild passt?", whichSentence: "Welcher Satz passt?", hearAgain: "Nochmal anhören", needsConnection: "Verbindung nötig", needsConnectionText: "Sprechübung braucht Internet zur Prüfung. Dein übriger Fortschritt ist sicher.", tapMic: "Tippe aufs Mikro und sprich den Satz.", noMic: "Kein Mikrofon gefunden. Prüfe die Erlaubnis und tippe erneut aufs Mikro.", listening: "Höre zu… tippe aufs Mikro, um früher zu stoppen.", checking: "Prüfe, wie du warst…", scoringError: "Bei der Bewertung ging etwas schief. Versuch es erneut.", closeEnough: "Knapp genug!", closeEnoughText: "Das wurde verstanden. Höre noch einmal zu und triff die Töne.", great: "Großartig!", greatText: "Das klang genau richtig.", almost: "Fast!", goodEnough: "Gut genug — weiter geht's.", tryClearer: "Versuch es noch einmal, etwas deutlicher.", tryAgainTitle: "Erneut versuchen", goodEffort: "Guter Versuch — weiter geht's.", listenRepeat: "Höre zu und sprich nach.", continueBtn: "Weiter", correct: "Richtig!", notQuite: "Nicht ganz — höre nochmal zu und versuch es.", check: "Prüfen", typeIt: "Tippe es ein…", activityComplete: "Aktivität geschafft!", practiceAgain: "Nochmal üben", practiceComplete: "Übung geschafft!", lessonComplete: "Lektion {n} geschafft!", niceWork: "Gut gemacht — jederzeit wiederholen.", canDo: "Du kannst es hören, lesen und sagen.", finishLesson: "Lektion beenden", shareDone: "Ich habe gerade Lektion {n} bei Nicelingo geschafft und {phrases} neue Sätze gelernt!", checkpointTitle: "Test zu Einheit {n}", practiseTitle: "Meine Fehler üben", challengeTitle: "Level-{n}-Challenge", challengeLocked: "Bestehe alle Einheiten-Tests dieses Levels zum Freischalten", challengeIntro: "3 Szenen, 12 Sätze zum Lautsprechen", sceneOf: "Szene {a} von {b}", levelDoneTitle: "Level {n} geschafft!", learnedLine: "Du kannst {n} Sätze sagen", startUnitOne: "Stattdessen bei Einheit 1 starten", subscribeToOpen: "Abonnieren, um dieses Level zu öffnen", phrasesFixed: "{n} Sätze gefestigt", stillToPractise: "{n} noch zu üben", reviewEmpty: "Gerade keine Fehler zu üben", checkpointIntro: "10 Fragen, etwa 3 Minuten", checkpointStart: "Test starten", checkpointPassedText: "Test bestanden", checkpointFail: "Knapp daneben!", checkpointScoreLine: "{n} von 10", checkpointLocked: "Schließe alle 4 Lektionen ab, um ihn freizuschalten", continueToUnit: "Weiter zu Einheit {n}", tryAgainCp: "Nochmal versuchen", practiseThese: "Diese üben", playWordAria: "{word} abspielen, Bedeutung {gloss}", helpWords: "Worthilfe", nextLesson: "Nächste Lektion", lessonPage: "Lektionsseite", closeWord: "Schließen", shareBtn: "Teilen", copyLink: "Link kopieren", copied: "Kopiert!", exitStage: "Diese Stufe verlassen?", exitStageText: "Dein Platz in dieser Stufe wird nicht gespeichert.", exitYes: "Ja, verlassen", exitNo: "Bleiben" },
  fr: { listenTap: "Écoutez et touchez", lookTap: "Regardez et touchez", sayAloud: "Dites-le à voix haute", fillWord: "Complétez le mot manquant", offline: "Hors ligne — votre progression se synchronisera.", loading: "Préparation de votre leçon…", loadError: "Impossible de charger la leçon.", loadErrorText: "Vérifiez votre connexion et réessayez.", tryAgain: "Réessayer", paywallTitle: "Cette leçon nécessite un abonnement.", paywallText: "L'unité 1 (leçons 1-4) est gratuite pour toujours. Tout débloquer pour $3/mois ou $29/an.", seePlans: "Voir les offres", backFree: "Retour à l'unité 1 gratuite", tapStart: "Touchez pour commencer", tagline: "Regardez. Écoutez. Répétez.", whichPicture: "Quelle image correspond ?", whichSentence: "Quelle phrase correspond ?", hearAgain: "Réécouter", needsConnection: "Connexion requise", needsConnectionText: "L'exercice oral a besoin d'internet pour vous évaluer. Le reste de votre progression est à l'abri.", tapMic: "Touchez le micro et dites la phrase.", noMic: "Aucun micro trouvé. Vérifiez l'autorisation et touchez le micro pour réessayer.", listening: "Écoute… touchez le micro pour finir plus tôt.", checking: "Vérification de votre réponse…", scoringError: "La notation a échoué. Réessayez.", closeEnough: "Presque parfait !", closeEnoughText: "C'était compris. Réécoutez et essayez de suivre les tons.", great: "Super !", greatText: "C'était exactement ça.", almost: "Presque !", goodEnough: "Suffisant — on continue.", tryClearer: "Réessayez une fois, un peu plus clairement.", tryAgainTitle: "Réessayez", goodEffort: "Bel effort — on continue.", listenRepeat: "Écoutez et répétez après l'audio.", continueBtn: "Continuer", correct: "Correct !", notQuite: "Pas tout à fait — réécoutez et réessayez.", check: "Vérifier", typeIt: "Tapez-le…", activityComplete: "Activité terminée !", practiceAgain: "S'entraîner encore", practiceComplete: "Entraînement terminé !", lessonComplete: "Leçon {n} terminée !", niceWork: "Beau travail — recommencez quand vous voulez.", canDo: "Vous pouvez l'entendre, le lire et le dire.", finishLesson: "Terminer la leçon", shareDone: "Je viens de terminer la leçon {n} sur Nicelingo et appris {phrases} nouvelles phrases !", checkpointTitle: "Test de l'unité {n}", practiseTitle: "Pratiquer mes erreurs", challengeTitle: "Défi du niveau {n}", challengeLocked: "Réussissez tous les tests d'unité de ce niveau pour le débloquer", challengeIntro: "3 scènes, 12 phrases à dire à voix haute", sceneOf: "Scène {a} sur {b}", levelDoneTitle: "Niveau {n} terminé !", learnedLine: "Vous savez dire {n} phrases", startUnitOne: "Commencer plutôt à l'unité 1", subscribeToOpen: "Abonnez-vous pour ouvrir ce niveau", phrasesFixed: "{n} phrases corrigées", stillToPractise: "{n} encore à pratiquer", reviewEmpty: "Aucune erreur à pratiquer pour le moment", checkpointIntro: "10 questions, environ 3 minutes", checkpointStart: "Commencer le test", checkpointPassedText: "Test réussi", checkpointFail: "Dommage, si près !", checkpointScoreLine: "{n} sur 10", checkpointLocked: "Terminez les 4 leçons pour le débloquer", continueToUnit: "Continuer vers l'unité {n}", tryAgainCp: "Réessayer", practiseThese: "Pratiquer ceux-ci", playWordAria: "Écouter {word}, qui signifie {gloss}", helpWords: "Aide pour les mots", nextLesson: "Leçon suivante", lessonPage: "Page des leçons", closeWord: "Fermer", shareBtn: "Partager", copyLink: "Copier le lien", copied: "Copié !", exitStage: "Quitter cette étape ?", exitStageText: "Votre place dans cette étape ne sera pas enregistrée.", exitYes: "Oui, quitter", exitNo: "Rester" },
  th: { listenTap: "\u0e1f\u0e31\u0e07\u0e41\u0e25\u0e49\u0e27\u0e41\u0e15\u0e30", lookTap: "\u0e14\u0e39\u0e41\u0e25\u0e49\u0e27\u0e41\u0e15\u0e30", sayAloud: "\u0e1e\u0e39\u0e14\u0e2d\u0e2d\u0e01\u0e40\u0e2a\u0e35\u0e22\u0e07", fillWord: "\u0e40\u0e15\u0e34\u0e21\u0e04\u0e33\u0e17\u0e35\u0e48\u0e2b\u0e32\u0e22\u0e44\u0e1b", offline: "\u0e2d\u0e2d\u0e1f\u0e44\u0e25\u0e19\u0e4c — \u0e04\u0e27\u0e32\u0e21\u0e04\u0e37\u0e1a\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e30\u0e0b\u0e34\u0e07\u0e04\u0e4c\u0e20\u0e32\u0e22\u0e2b\u0e25\u0e31\u0e07", loading: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e15\u0e23\u0e35\u0e22\u0e21\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19…", loadError: "\u0e42\u0e2b\u0e25\u0e14\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08", loadErrorText: "\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e01\u0e32\u0e23\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d\u0e41\u0e25\u0e49\u0e27\u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", tryAgain: "\u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", paywallTitle: "\u0e1a\u0e17\u0e19\u0e35\u0e49\u0e15\u0e49\u0e2d\u0e07\u0e2a\u0e21\u0e31\u0e04\u0e23\u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01", paywallText: "\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e17\u0e35\u0e48 1 (\u0e1a\u0e17\u0e17\u0e35\u0e48 1-4) \u0e1f\u0e23\u0e35\u0e15\u0e25\u0e2d\u0e14\u0e44\u0e1b \u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e17\u0e38\u0e01\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19\u0e43\u0e19\u0e23\u0e32\u0e04\u0e32 $3/\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e2b\u0e23\u0e37\u0e2d $29/\u0e1b\u0e35", seePlans: "\u0e14\u0e39\u0e41\u0e1e\u0e47\u0e01\u0e40\u0e01\u0e08", backFree: "\u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e17\u0e35\u0e48 1 \u0e1f\u0e23\u0e35", tapStart: "\u0e41\u0e15\u0e30\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e23\u0e34\u0e48\u0e21", tagline: "\u0e14\u0e39 \u0e1f\u0e31\u0e07 \u0e41\u0e25\u0e49\u0e27\u0e1e\u0e39\u0e14\u0e15\u0e32\u0e21", whichPicture: "\u0e20\u0e32\u0e1e\u0e44\u0e2b\u0e19\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19?", whichSentence: "\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e04\u0e44\u0e2b\u0e19\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19?", hearAgain: "\u0e1f\u0e31\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", needsConnection: "\u0e15\u0e49\u0e2d\u0e07\u0e43\u0e0a\u0e49\u0e2d\u0e34\u0e19\u0e40\u0e17\u0e2d\u0e23\u0e4c\u0e40\u0e19\u0e47\u0e15", needsConnectionText: "\u0e01\u0e32\u0e23\u0e1d\u0e36\u0e01\u0e1e\u0e39\u0e14\u0e15\u0e49\u0e2d\u0e07\u0e43\u0e0a\u0e49\u0e2d\u0e34\u0e19\u0e40\u0e17\u0e2d\u0e23\u0e4c\u0e40\u0e19\u0e47\u0e15\u0e43\u0e19\u0e01\u0e32\u0e23\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a \u0e04\u0e27\u0e32\u0e21\u0e04\u0e37\u0e1a\u0e2b\u0e19\u0e49\u0e32\u0e2d\u0e37\u0e48\u0e19\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13\u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22", tapMic: "\u0e41\u0e15\u0e30\u0e44\u0e21\u0e04\u0e4c\u0e41\u0e25\u0e49\u0e27\u0e1e\u0e39\u0e14\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e04", noMic: "\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e44\u0e21\u0e42\u0e04\u0e23\u0e42\u0e1f\u0e19 \u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e41\u0e25\u0e49\u0e27\u0e41\u0e15\u0e30\u0e44\u0e21\u0e04\u0e4c\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", listening: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e1f\u0e31\u0e07… \u0e41\u0e15\u0e30\u0e44\u0e21\u0e04\u0e4c\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e2b\u0e22\u0e38\u0e14\u0e01\u0e48\u0e2d\u0e19", checking: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a…", scoringError: "\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e19\u0e01\u0e32\u0e23\u0e43\u0e2b\u0e49\u0e04\u0e30\u0e41\u0e19\u0e19 \u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", closeEnough: "\u0e43\u0e01\u0e25\u0e49\u0e40\u0e04\u0e35\u0e22\u0e07\u0e21\u0e32\u0e01!", closeEnoughText: "\u0e40\u0e02\u0e49\u0e32\u0e43\u0e08\u0e44\u0e14\u0e49 \u0e1f\u0e31\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07\u0e41\u0e25\u0e49\u0e27\u0e1e\u0e22\u0e32\u0e22\u0e32\u0e21\u0e43\u0e2b\u0e49\u0e40\u0e2a\u0e35\u0e22\u0e07\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19", great: "\u0e22\u0e2d\u0e14\u0e40\u0e22\u0e35\u0e48\u0e22\u0e21!", greatText: "\u0e1f\u0e31\u0e07\u0e14\u0e39\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07\u0e40\u0e25\u0e22", almost: "\u0e40\u0e01\u0e37\u0e2d\u0e1a\u0e41\u0e25\u0e49\u0e27!", goodEnough: "\u0e14\u0e35\u0e1e\u0e2d\u0e41\u0e25\u0e49\u0e27 — \u0e44\u0e1b\u0e15\u0e48\u0e2d\u0e40\u0e25\u0e22", tryClearer: "\u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07 \u0e1e\u0e39\u0e14\u0e43\u0e2b\u0e49\u0e0a\u0e31\u0e14\u0e01\u0e27\u0e48\u0e32\u0e19\u0e35\u0e49", tryAgainTitle: "\u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", goodEffort: "\u0e1e\u0e22\u0e32\u0e22\u0e32\u0e21\u0e14\u0e35\u0e21\u0e32\u0e01 — \u0e44\u0e1b\u0e15\u0e48\u0e2d\u0e40\u0e25\u0e22", listenRepeat: "\u0e1f\u0e31\u0e07\u0e41\u0e25\u0e49\u0e27\u0e1e\u0e39\u0e14\u0e15\u0e32\u0e21", continueBtn: "\u0e44\u0e1b\u0e15\u0e48\u0e2d", correct: "\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07!", notQuite: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01 — \u0e1f\u0e31\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07\u0e41\u0e25\u0e49\u0e27\u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48", check: "\u0e15\u0e23\u0e27\u0e08\u0e04\u0e33\u0e15\u0e2d\u0e1a", typeIt: "\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e17\u0e35\u0e48\u0e19\u0e35\u0e48…", activityComplete: "\u0e17\u0e33\u0e01\u0e34\u0e08\u0e01\u0e23\u0e23\u0e21\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e41\u0e25\u0e49\u0e27!", practiceAgain: "\u0e1d\u0e36\u0e01\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", practiceComplete: "\u0e1d\u0e36\u0e01\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e41\u0e25\u0e49\u0e27!", lessonComplete: "\u0e08\u0e1a\u0e1a\u0e17\u0e17\u0e35\u0e48 {n} \u0e41\u0e25\u0e49\u0e27!", niceWork: "\u0e17\u0e33\u0e44\u0e14\u0e49\u0e14\u0e35\u0e21\u0e32\u0e01 — \u0e1d\u0e36\u0e01\u0e0b\u0e49\u0e33\u0e44\u0e14\u0e49\u0e17\u0e38\u0e01\u0e40\u0e21\u0e37\u0e48\u0e2d", canDo: "\u0e04\u0e38\u0e13\u0e1f\u0e31\u0e07 \u0e2d\u0e48\u0e32\u0e19 \u0e41\u0e25\u0e30\u0e1e\u0e39\u0e14\u0e44\u0e14\u0e49\u0e41\u0e25\u0e49\u0e27", finishLesson: "\u0e08\u0e1a\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19", shareDone: "\u0e09\u0e31\u0e19\u0e40\u0e1e\u0e34\u0e48\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19\u0e08\u0e1a\u0e1a\u0e17\u0e17\u0e35\u0e48 {n} \u0e1a\u0e19 Nicelingo \u0e41\u0e25\u0e30\u0e40\u0e23\u0e35\u0e22\u0e19\u0e23\u0e39\u0e49 {phrases} \u0e27\u0e25\u0e35\u0e43\u0e2b\u0e21\u0e48!", checkpointTitle: "\u0e41\u0e1a\u0e1a\u0e17\u0e14\u0e2a\u0e2d\u0e1a\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e17\u0e35\u0e48 {n}", practiseTitle: "\u0e1d\u0e36\u0e01\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e02\u0e2d\u0e07\u0e09\u0e31\u0e19", challengeTitle: "\u0e04\u0e27\u0e32\u0e21\u0e17\u0e49\u0e32\u0e17\u0e32\u0e22\u0e23\u0e30\u0e14\u0e31\u0e1a {n}", challengeLocked: "\u0e1c\u0e48\u0e32\u0e19\u0e41\u0e1a\u0e1a\u0e17\u0e14\u0e2a\u0e2d\u0e1a\u0e17\u0e38\u0e01\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e43\u0e19\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e19\u0e35\u0e49\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01", challengeIntro: "3 \u0e09\u0e32\u0e01 12 \u0e1b\u0e23\u0e30\u0e42\u0e22\u0e04\u0e43\u0e2b\u0e49\u0e1e\u0e39\u0e14\u0e2d\u0e2d\u0e01\u0e40\u0e2a\u0e35\u0e22\u0e07", sceneOf: "\u0e09\u0e32\u0e01\u0e17\u0e35\u0e48 {a} \u0e08\u0e32\u0e01 {b}", levelDoneTitle: "\u0e08\u0e1a\u0e23\u0e30\u0e14\u0e31\u0e1a {n} \u0e41\u0e25\u0e49\u0e27!", learnedLine: "\u0e04\u0e38\u0e13\u0e1e\u0e39\u0e14\u0e44\u0e14\u0e49 {n} \u0e27\u0e25\u0e35", startUnitOne: "\u0e40\u0e23\u0e34\u0e48\u0e21\u0e17\u0e35\u0e48\u0e2b\u0e19\u0e48\u0e27\u0e22 1 \u0e41\u0e17\u0e19", subscribeToOpen: "\u0e2a\u0e21\u0e31\u0e04\u0e23\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e1b\u0e34\u0e14\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e19\u0e35\u0e49", phrasesFixed: "\u0e41\u0e01\u0e49\u0e44\u0e02\u0e44\u0e14\u0e49 {n} \u0e27\u0e25\u0e35", stillToPractise: "\u0e22\u0e31\u0e07\u0e15\u0e49\u0e2d\u0e07\u0e1d\u0e36\u0e01\u0e2d\u0e35\u0e01 {n}", reviewEmpty: "\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14\u0e43\u0e2b\u0e49\u0e1d\u0e36\u0e01", checkpointIntro: "10 \u0e04\u0e33\u0e16\u0e32\u0e21 \u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13 3 \u0e19\u0e32\u0e17\u0e35", checkpointStart: "\u0e40\u0e23\u0e34\u0e48\u0e21\u0e41\u0e1a\u0e1a\u0e17\u0e14\u0e2a\u0e2d\u0e1a", checkpointPassedText: "\u0e1c\u0e48\u0e32\u0e19\u0e41\u0e1a\u0e1a\u0e17\u0e14\u0e2a\u0e2d\u0e1a\u0e41\u0e25\u0e49\u0e27", checkpointFail: "\u0e40\u0e01\u0e37\u0e2d\u0e1a\u0e41\u0e25\u0e49\u0e27!", checkpointScoreLine: "{n} \u0e08\u0e32\u0e01 10", checkpointLocked: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e04\u0e23\u0e1a 4 \u0e1a\u0e17\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01", continueToUnit: "\u0e44\u0e1b\u0e15\u0e48\u0e2d\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e17\u0e35\u0e48 {n}", tryAgainCp: "\u0e25\u0e2d\u0e07\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07", practiseThese: "\u0e1d\u0e36\u0e01\u0e04\u0e33\u0e40\u0e2b\u0e25\u0e48\u0e32\u0e19\u0e35\u0e49", playWordAria: "\u0e40\u0e25\u0e48\u0e19 {word} \u0e2b\u0e21\u0e32\u0e22\u0e16\u0e36\u0e07 {gloss}", helpWords: "\u0e0a\u0e48\u0e27\u0e22\u0e14\u0e39\u0e04\u0e33\u0e28\u0e31\u0e1e\u0e17\u0e4c", nextLesson: "\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19\u0e16\u0e31\u0e14\u0e44\u0e1b", lessonPage: "\u0e2b\u0e19\u0e49\u0e32\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19", closeWord: "\u0e1b\u0e34\u0e14", shareBtn: "\u0e41\u0e0a\u0e23\u0e4c", copyLink: "\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01\u0e25\u0e34\u0e07\u0e01\u0e4c", copied: "\u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01\u0e41\u0e25\u0e49\u0e27!", exitStage: "\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49?", exitStageText: "\u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13\u0e43\u0e19\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e08\u0e30\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01", exitYes: "\u0e43\u0e0a\u0e48 \u0e2d\u0e2d\u0e01", exitNo: "\u0e2d\u0e22\u0e39\u0e48\u0e15\u0e48\u0e2d" },
  zh: { listenTap: "\u542c\u5e76\u70b9\u9009", lookTap: "\u770b\u5e76\u70b9\u9009", sayAloud: "\u5927\u58f0\u8bf4\u51fa\u6765", fillWord: "\u586b\u5165\u7f3a\u5c11\u7684\u5355\u8bcd", offline: "\u79bb\u7ebf — \u4f60\u7684\u8fdb\u5ea6\u7a0d\u540e\u4f1a\u540c\u6b65。", loading: "\u6b63\u5728\u51c6\u5907\u4f60\u7684\u8bfe\u7a0b…", loadError: "\u65e0\u6cd5\u52a0\u8f7d\u8bfe\u7a0b。", loadErrorText: "\u68c0\u67e5\u4f60\u7684\u8fde\u63a5\u5e76\u91cd\u8bd5。", tryAgain: "\u91cd\u8bd5", paywallTitle: "\u672c\u8bfe\u9700\u8981\u8ba2\u9605。", paywallText: "\u7b2c\u4e00\u5355\u5143（\u7b2c1-4\u8bfe）\u6c38\u4e45\u514d\u8d39。\u4ee5 $3/\u6708 \u6216 $29/\u5e74 \u89e3\u9501\u6240\u6709\u8bfe\u7a0b。", seePlans: "\u67e5\u770b\u5957\u9910", backFree: "\u8fd4\u56de\u514d\u8d39\u7b2c\u4e00\u5355\u5143", tapStart: "\u70b9\u6309\u5f00\u59cb", tagline: "\u770b\u4e00\u770b，\u542c\u4e00\u542c，\u8bf4\u4e00\u8bf4。", whichPicture: "\u54ea\u5f20\u56fe\u7247\u5339\u914d？", whichSentence: "\u54ea\u4e2a\u53e5\u5b50\u5339\u914d？", hearAgain: "\u518d\u542c\u4e00\u6b21", needsConnection: "\u9700\u8981\u7f51\u7edc", needsConnectionText: "\u53e3\u8bed\u7ec3\u4e60\u9700\u8981\u7f51\u7edc\u6765\u68c0\u67e5。\u4f60\u7684\u5176\u4ed6\u8fdb\u5ea6\u662f\u5b89\u5168\u7684。", tapMic: "\u70b9\u6309\u9ea6\u514b\u98ce\u5e76\u8bf4\u51fa\u53e5\u5b50。", noMic: "\u672a\u627e\u5230\u9ea6\u514b\u98ce。\u68c0\u67e5\u6743\u9650\u540e\u70b9\u6309\u9ea6\u514b\u98ce\u91cd\u8bd5。", listening: "\u6b63\u5728\u8046\u542c…\u70b9\u6309\u9ea6\u514b\u98ce\u53ef\u63d0\u524d\u7ed3\u675f。", checking: "\u6b63\u5728\u68c0\u67e5\u4f60\u7684\u8868\u73b0…", scoringError: "\u8bc4\u5206\u51fa\u9519。\u8bf7\u91cd\u8bd5。", closeEnough: "\u975e\u5e38\u63a5\u8fd1！", closeEnoughText: "\u53ef\u4ee5\u7406\u89e3。\u518d\u542c\u4e00\u6b21，\u5c3d\u91cf\u5339\u914d\u58f0\u8c03。", great: "\u592a\u68d2\u4e86！", greatText: "\u542c\u8d77\u6765\u975e\u5e38\u6807\u51c6。", almost: "\u5dee\u4e00\u70b9！", goodEnough: "\u5df2\u7ecf\u591f\u597d\u4e86 — \u7ee7\u7eed。", tryClearer: "\u518d\u8bd5\u4e00\u6b21，\u8bf4\u5f97\u66f4\u6e05\u695a\u4e9b。", tryAgainTitle: "\u91cd\u8bd5", goodEffort: "\u52aa\u529b\u5f88\u597d — \u7ee7\u7eed。", listenRepeat: "\u542c\u5e76\u8ddf\u8bfb。", continueBtn: "\u7ee7\u7eed", correct: "\u6b63\u786e！", notQuite: "\u4e0d\u592a\u5bf9 — \u518d\u542c\u4e00\u6b21\u5e76\u91cd\u8bd5。", check: "\u68c0\u67e5", typeIt: "\u8f93\u5165…", activityComplete: "\u6d3b\u52a8\u5b8c\u6210！", practiceAgain: "\u518d\u7ec3\u4e00\u6b21", practiceComplete: "\u7ec3\u4e60\u5b8c\u6210！", lessonComplete: "\u7b2c{n}\u8bfe\u5b8c\u6210！", niceWork: "\u505a\u5f97\u5f88\u597d — \u968f\u65f6\u518d\u6765\u7ec3\u4e60。", canDo: "\u4f60\u5df2\u7ecf\u80fd\u542c、\u8bfb、\u8bf4\u4e86。", finishLesson: "\u5b8c\u6210\u8bfe\u7a0b", shareDone: "\u6211\u521a\u521a\u5728 Nicelingo \u5b8c\u6210\u4e86\u7b2c {n} \u8bfe\uff0c\u5b66\u4f1a\u4e86 {phrases} \u4e2a\u65b0\u77ed\u8bed\uff01", checkpointTitle: "\u7b2c {n} \u5355\u5143\u6d4b\u8bd5", practiseTitle: "\u7ec3\u4e60\u6211\u7684\u9519\u8bef", challengeTitle: "\u7b2c {n} \u7ea7\u6311\u6218", challengeLocked: "\u901a\u8fc7\u672c\u7ea7\u6240\u6709\u5355\u5143\u6d4b\u8bd5\u5373\u53ef\u89e3\u9501", challengeIntro: "3 \u4e2a\u573a\u666f\uff0c12 \u53e5\u8bdd\u8981\u5927\u58f0\u8bf4", sceneOf: "\u7b2c {a} \u5e55\uff0c\u5171 {b} \u5e55", levelDoneTitle: "\u7b2c {n} \u7ea7\u5b8c\u6210\uff01", learnedLine: "\u4f60\u80fd\u8bf4 {n} \u4e2a\u77ed\u8bed", startUnitOne: "\u6539\u4e3a\u4ece\u7b2c 1 \u5355\u5143\u5f00\u59cb", subscribeToOpen: "\u8ba2\u9605\u4ee5\u5f00\u542f\u672c\u7ea7", phrasesFixed: "\u5df2\u7ea0\u6b63 {n} \u4e2a\u77ed\u8bed", stillToPractise: "\u8fd8\u5269 {n} \u4e2a\u8981\u7ec3\u4e60", reviewEmpty: "\u76ee\u524d\u6ca1\u6709\u9519\u8bef\u53ef\u7ec3\u4e60", checkpointIntro: "10 \u9053\u9898\uff0c\u7ea6 3 \u5206\u949f", checkpointStart: "\u5f00\u59cb\u6d4b\u8bd5", checkpointPassedText: "\u6d4b\u8bd5\u901a\u8fc7", checkpointFail: "\u5c31\u5dee\u4e00\u70b9\uff01", checkpointScoreLine: "{n} / 10", checkpointLocked: "\u5b8c\u6210\u5168\u90e8 4 \u8bfe\u5373\u53ef\u89e3\u9501", continueToUnit: "\u7ee7\u7eed\u7b2c {n} \u5355\u5143", tryAgainCp: "\u518d\u8bd5\u4e00\u6b21", practiseThese: "\u7ec3\u4e60\u8fd9\u4e9b", playWordAria: "\u64ad\u653e {word}\uff0c\u610f\u601d\u662f {gloss}", helpWords: "\u8bcd\u8bed\u5e2e\u52a9", nextLesson: "\u4e0b\u4e00\u8bfe", lessonPage: "\u8bfe\u7a0b\u9875\u9762", closeWord: "\u5173\u95ed", shareBtn: "\u5206\u4eab", copyLink: "\u590d\u5236\u94fe\u63a5", copied: "\u5df2\u590d\u5236\uff01", exitStage: "\u9000\u51fa\u5f53\u524d\u9636\u6bb5\uff1f", exitStageText: "\u4f60\u5728\u5f53\u524d\u9636\u6bb5\u7684\u8fdb\u5ea6\u4e0d\u4f1a\u88ab\u4fdd\u5b58\u3002", exitYes: "\u662f\uff0c\u9000\u51fa", exitNo: "\u7559\u4e0b" }
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

const SHARE_SVGS = {
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.7 3H21l-7.3 8.3L22.2 21h-6.7l-5.2-6.2L4.4 21H1l7.8-8.9L1.5 3h6.9l4.7 5.6L17.7 3zm-1.2 16h1.9L6.4 4.9H4.4L16.5 19z"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.1L3 20l1.5-5.4A8.5 8.5 0 1 1 21 11.5z"/><path d="M9 9.5c.5 2.5 3 5 5.5 5.5l1-1.5 2.5 1c-.5 1.5-1.5 2-3 1.5C10.5 14 7 10.5 6 6c-.5-1.5 0-2.5 1.5-3l1 2.5L9 9.5z" fill="currentColor" stroke="none"/></svg>`,
  line: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.1L3 20l1.5-5.4A8.5 8.5 0 1 1 21 11.5z"/><text x="12" y="14.5" text-anchor="middle" font-size="5.5" font-weight="800" fill="currentColor" stroke="none" font-family="sans-serif">LINE</text></svg>`,
  telegram: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.9 4.4l-3.1 14.7c-.2 1-.8 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9L18.5 6c.4-.3-.1-.5-.6-.2L6.9 12.7 2.1 11.2c-1-.3-1-1 .2-1.5l18.8-7.3c.9-.3 1.6.2 1.4 1.5z"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.7c0-.9.3-1.6 1.6-1.6h1.6V4.2c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4v2.7H7.6V14h2.7v8h3.2z"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>`,
};

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
// Only one sound at a time, across phrase playback and word slices.
let activeAudio = null;
let activeCleanup = null;
function stopActiveAudio() {
  try {
    activeAudio?.pause();
  } catch { /* not playing */ }
  activeCleanup?.();
  activeAudio = null;
  activeCleanup = null;
}

function playAudio(url, btn, rate = 1) {
  return new Promise((resolve) => {
    stopActiveAudio();
    const audio = new Audio(url);
    activeAudio = audio;
    if (rate !== 1) {
      audio.playbackRate = rate;
      audio.preservesPitch = true;
    }
    btn?.classList.add("playing");
    const done = () => {
      btn?.classList.remove("playing");
      if (activeAudio === audio) {
        activeAudio = null;
        activeCleanup = null;
      }
      resolve();
    };
    activeCleanup = () => btn?.classList.remove("playing");
    audio.onended = audio.onerror = done;
    audio.play().catch(done);
  });
}

// Play one word: its own recording when it has one (Mandarin),
// otherwise the slice of the phrase audio between start and end,
// padded 30 ms each side with 10 ms fades so it does not click.
// Slices always come from the default voice — timings were measured
// on that clip, and extra voices run at different speeds.
function playWordAudio(phrase, word, chip) {
  stopActiveAudio();
  const audio = new Audio(word.audioUrl ?? phrase.audioUrl);
  activeAudio = audio;
  chip?.classList.add("playing");
  const sliced = !word.audioUrl && word.start != null && word.end != null;
  const start = sliced ? Math.max(0, word.start - 0.03) : 0;
  const end = sliced ? word.end + 0.03 : Infinity;
  let timer = null;
  const done = () => {
    if (timer) clearInterval(timer);
    chip?.classList.remove("playing");
    if (activeAudio === audio) {
      activeAudio = null;
      activeCleanup = null;
    }
  };
  activeCleanup = () => {
    if (timer) clearInterval(timer);
    chip?.classList.remove("playing");
  };
  audio.onended = audio.onerror = done;
  const begin = () => {
    if (sliced) {
      try {
        audio.currentTime = start;
      } catch { /* metadata not ready: plays from 0 */ }
      audio.volume = 0;
      timer = setInterval(() => {
        const t = audio.currentTime;
        if (t >= end) {
          audio.pause();
          done();
          return;
        }
        const fadeIn = Math.min(1, Math.max(0, (t - start) / 0.01));
        const fadeOut = Math.min(1, Math.max(0, (end - t) / 0.01));
        audio.volume = Math.min(fadeIn, fadeOut);
      }, 5);
    }
    audio.play().catch(done);
  };
  if (sliced && audio.readyState < 1 && audio.addEventListener) {
    audio.addEventListener("loadedmetadata", begin, { once: true });
    audio.load();
  } else {
    begin();
  }
}

let closeOpenWordPop = null;
let escListenerBound = false;

// Word chips are hidden by default: a phrase renders as plain text
// until its help button is pressed, and that is the only time the
// tappable words appear. Every rendered phrase registers its wrapper
// here so the help button can find and toggle it.
const phraseWraps = new Set();

function phraseDisplay(phrase) {
  const wrap = h("span", { class: "phrase-wrap" });
  wrap._phrase = phrase;
  wrap._wordsOn = false;
  wrap.append(...phraseNodes(phrase));
  phraseWraps.add(wrap);
  return [wrap];
}

function renderPhraseWrap(wrap) {
  const phrase = wrap._phrase;
  if (!wrap._wordsOn) closeOpenWordPop?.();
  wrap.replaceChildren(
    ...(wrap._wordsOn && phrase.words?.length ? wordChips(phrase) : phraseNodes(phrase)),
  );
}

// The help button that replaces slow playback: pressing it reveals
// the phrase's tappable words; pressing it again hides them.
function helpButton(phrase, onToggle) {
  const b = h(
    "button",
    { class: "speaker help", "aria-label": S.helpWords, title: S.helpWords, "aria-pressed": "false" },
    "?",
  );
  let on = false;
  b.addEventListener("click", () => {
    on = !on;
    b.setAttribute("aria-pressed", String(on));
    if (on) b.classList.add("on");
    else b.classList.remove("on");
    for (const wrap of phraseWraps) {
      if (wrap._phrase?.id === phrase.id) {
        wrap._wordsOn = on;
        renderPhraseWrap(wrap);
      }
    }
    onToggle?.(on);
  });
  return b;
}

// On listen-match pages the phrase text is not on screen yet (that
// is the question), so help reveals it in a card under the play row
// instead of toggling an existing phrase. Returns [playRow, card].
function listenHelpRow(phrase, speaker) {
  const card = h("div", { class: "phrase-card help-reveal" }, ...phraseDisplay(phrase));
  card.hidden = true;
  const row = h(
    "div",
    { class: "play-row" },
    speaker,
    helpButton(phrase, (on) => { card.hidden = !on; }),
  );
  return [row, card];
}

// Tappable word chips for one phrase. Tapping a chip plays the word
// and opens its meaning popup. The popup stays until it is dismissed
// on purpose: tap the same chip again, tap another chip, press
// Escape, use its close button, or turn help off. It never times
// out and a stray tap elsewhere does not close it.
function wordChips(phrase) {
  const row = h("span", { class: "word-row" });
  let openPop = null;
  let openChip = null;
  const close = () => {
    openPop?.remove();
    openPop = null;
    openChip = null;
    if (closeOpenWordPop === close) closeOpenWordPop = null;
  };
  closeOpenWordPop = close;
  if (!escListenerBound && document.addEventListener) {
    escListenerBound = true;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeOpenWordPop?.();
    });
  }
  for (const word of phrase.words) {
    const chip = h(
      "button",
      {
        class: "word-chip",
        type: "button",
        "aria-label": S.playWordAria.replace("{word}", word.text).replace("{gloss}", word.gloss),
        onclick: (e) => {
          e?.stopPropagation();
          if (openChip === chip) {
            close();
            stopActiveAudio();
            return;
          }
          close();
          openChip = chip;
          playWordAudio(phrase, word, chip);
          const popKids = word.chars
            ? [
                h("span", { class: "pop-native" }, word.chars),
                h("span", { class: "pop-roman" }, word.text),
                h("span", { class: "pop-gloss" }, word.gloss),
              ]
            : [h("b", {}, word.text), h("span", { class: "pop-gloss" }, word.gloss)];
          const closeBtn = h(
            "button",
            { class: "pop-close", type: "button", "aria-label": S.closeWord },
            "×",
          );
          closeBtn.addEventListener("click", (ev) => {
            ev?.stopPropagation();
            close();
          });
          openPop = h(
            "span",
            { class: "word-pop", role: "status", "aria-live": "polite" },
            ...popKids,
            closeBtn,
          );
          cell.append(openPop);
        },
      },
      ...(word.chars
        ? [h("span", { class: "native" }, word.chars), h("span", { class: "roman" }, word.text)]
        : [word.text]),
    );
    const cell = h("span", { class: "word-cell" }, chip);
    row.append(cell);
  }
  return [row];
}

// Mic clock: while recording, the mic button becomes a clock face
// whose hand sweeps 12-to-12 over the record window (with a conic
// progress fill). Returns a stop function that restores the button.
// Shared by lessons, checkpoints/reviews, and level challenges.
function startMicClock(mic, recordMs) {
  mic.classList.add("clock");
  mic.style.color = "transparent";
  const hand = h("i", { class: "clock-hand" });
  mic.append(hand);
  const reduceMotion =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  const started = Date.now();
  const paint = () => {
    const pct = Math.min(100, ((Date.now() - started) / recordMs) * 100);
    mic.style.setProperty("--sweep", pct.toFixed(1));
    hand.style.transform = `translateX(-50%) rotate(${(pct / 100) * 360}deg)`;
  };
  let sweep = null;
  if (!reduceMotion) {
    paint();
    sweep = setInterval(paint, 100);
  }
  return () => {
    if (sweep) clearInterval(sweep);
    hand.remove();
    mic.classList.remove("clock");
    mic.style.color = "";
  };
}

// Record one answer for phraseStats. Server-first; if the POST
// fails (offline, no session yet), keep it on the device instead.
function recordAttempt(phrase, activity, correct, score, helped) {
  const lang = langFromPath(location.pathname);
  const body = { phraseId: phrase.id, lang, activity, correct, score: score ?? null, helped: helped === true };
  const keepLocal = () => {
    try {
      const arr = JSON.parse(localStorage.getItem("nl-attempts") ?? "[]");
      arr.push({ ...body, at: new Date().toISOString() });
      localStorage.setItem("nl-attempts", JSON.stringify(arr.slice(-500)));
    } catch { /* storage unavailable */ }
  };
  fetch("/api/attempts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => { if (!r.ok) keepLocal(); }).catch(keepLocal);
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

    const reveal = h("div", { class: "reveal" });
    let attempted = false;
    const onPick = async (btn, opt) => {
      if (locked) return;
      if (!attempted) {
        attempted = true;
        recordAttempt(q.target, activity, checkAnswer(q, opt.id));
      }
      if (checkAnswer(q, opt.id)) {
        locked = true;
        btn.classList.add("correct");
        // The answer is out: now the phrase may be shown as tappable
        // words (never before, so chips can't give it away).
        if (q.target.words?.length && !reveal.childNodes?.length) {
          reveal.append(h("div", { class: "phrase-card" }, ...phraseDisplay(q.target)));
        }
        setTimeout(() => this.nextChoice(), q.target.words?.length ? 2400 : 850);
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
            ...(() => {
              const b = h("button", { class: "speaker", "aria-label": "Play sound" }, "♪");
              b.addEventListener("click", () => playAudio(pickAudioUrl(q.target), b));
              setTimeout(() => playAudio(pickAudioUrl(q.target), b), 350);
              return listenHelpRow(q.target, b);
            })(),
            grid,
            reveal,
          ]
        : [
            h("h1", {}, S.whichSentence),
            appImg({ class: "hero-img", src: q.target.imageUrl, alt: "" }),
            grid,
            reveal,
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
          h("div", { class: "phrase-card" }, ...phraseDisplay(phrase)),
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
    const speaker = h("button", { class: "speaker", "aria-label": "Play sound" }, "♪");
    speaker.addEventListener("click", () => playAudio(pickAudioUrl(phrase), speaker));
    this.screen(
      h("div", { class: "screen" },
        topbar(this.state, (a) => this.startActivity(a)),
        h("h1", {}, S.sayAloud),
        appImg({ class: "hero-img", src: phrase.imageUrl, alt: "" }),
        h("div", { class: "phrase-card" }, ...phraseDisplay(phrase)),
        h("div", { class: "play-row" }, speaker, helpButton(phrase)),
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
    const stopClock = startMicClock(mic, RECORD_MS);
    let deadline;
    const doStop = () => {
      stopClock();
      if (deadline) clearTimeout(deadline);
      if (rec.state !== "inactive") rec.stop();
    };
    mic.addEventListener("click", doStop, { once: true });
    rec.start();
    status.textContent = S.listening;
    deadline = setTimeout(doStop, RECORD_MS);
    await stopped;
    stopClock();
    if (deadline) clearTimeout(deadline);
    stream.getTracks().forEach((t) => t.stop());
    bars.remove();
    mic.classList.remove("recording");
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
      const { verdict, pass, score } = await api.score(phrase.id, base64, prevVerdict);
      recordAttempt(phrase, "speak-score", typeof score === "number" ? score >= 70 : pass === true, typeof score === "number" ? score : null);
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
        h("div", { class: "phrase-card" }, ...phraseDisplay(phrase)),
        h("div", { class: `banner ${verdict}` },
          h("div", { class: "face" }, verdict === "green" ? "✓" : verdict === "yellow" ? "≈" : "!"),
          h("div", {}, h("b", {}, copy[0]), h("small", {}, copy[1]))),
        dots,
        h("div", { class: "spacer" }),
        passed || last ? next : h("div", { style: "display:flex;flex-direction:column;gap:0.6rem" }, next, h("div", { class: "play-row" }, replay, helpButton(phrase)))),
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
    let attempted = false;
    const check = async () => {
      if (!attempted) {
        attempted = true;
        recordAttempt(phrase, "read-write", b.check(input.value));
      }
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
    // Chips for every word except the blanked one (always the last),
    // so tappable words can never reveal the answer.
    // The hidden-words rendering uses phrase.text, so the prompt
    // text itself must drop the blanked (last) word too.
    const shownWords = phrase.words?.slice(0, -1);
    const promptNodes = shownWords?.length
      ? [
          ...phraseDisplay({
            ...phrase,
            text: shownWords.map((w) => w.text).join(" "),
            words: shownWords,
          }),
          " ______.",
        ]
      : [b.prompt];
    this.screen(
      h("div", { class: "screen" },
        topbar(this.state, (a) => this.startActivity(a)),
        h("h1", {}, S.fillWord),
        h("div", { class: "play-row" }, speaker, helpButton(phrase)),
        h("div", { class: "phrase-card" }, ...promptNodes),
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
    const lang = langFromPath(location.pathname);
    const lessonNum = Number(lessonFromPath(location.pathname));
    const nextNum = String(lessonNum + 1).padStart(3, "0");
    this.screen(
      h("div", { class: "screen" },
        h("div", { class: "celebrate" },
          h("div", { class: "stars" }, "★ ★ ★"),
          h("h1", {}, practice ? S.practiceComplete : S.lessonComplete.replace("{n}", String(lessonNum))),
          h("p", { class: "sub" }, practice ? S.niceWork : S.canDo),
          this.shareRow(),
          h("div", { class: "spacer" }),
          h("div", { class: "complete-actions" },
            again,
            h("a", { class: "btn", href: `/lesson/${lang}/${nextNum}` }, S.nextLesson)),
          h("p", {}, h("a", { href: `/${lang}` }, `← ${S.lessonPage}`)))),
    );
  },

  // Icon-only share row (keeps the celebration screen neat): native
  // share sheet where available, then X, WhatsApp, LINE, Telegram,
  // Facebook, and copy-link, each a 44px round button with a label
  // for screen readers. Message uses this lesson's real phrase count.
  shareRow() {
    const lang = langFromPath(location.pathname);
    const n = Number(lessonFromPath(location.pathname));
    const text = S.shareDone
      .replace("{n}", String(n))
      .replace("{phrases}", String(this.manifest?.phrases.length ?? 0));
    const url = `${location.origin ?? ""}/${lang}`;
    const encText = encodeURIComponent(text);
    const encUrl = encodeURIComponent(url);
    const full = encodeURIComponent(`${text} ${url}`);
    const icon = (label, svg, attrs) => {
      const el = h(attrs.href ? "a" : "button", {
        class: "share-icon",
        "aria-label": label,
        title: label,
        ...attrs,
      });
      el.innerHTML = svg;
      return el;
    };
    const kids = [];
    if (navigator.share) {
      const b = icon(S.shareBtn, SHARE_SVGS.share, { type: "button" });
      b.addEventListener("click", () =>
        navigator.share({ title: "Nicelingo", text, url }).catch(() => {}),
      );
      kids.push(b);
    }
    kids.push(
      icon("X", SHARE_SVGS.x, { href: `https://twitter.com/intent/tweet?text=${encText}&url=${encUrl}`, target: "_blank", rel: "noopener" }),
      icon("WhatsApp", SHARE_SVGS.whatsapp, { href: `https://wa.me/?text=${full}`, target: "_blank", rel: "noopener" }),
      icon("LINE", SHARE_SVGS.line, { href: `https://line.me/R/msg/text/?${full}`, target: "_blank", rel: "noopener" }),
      icon("Telegram", SHARE_SVGS.telegram, { href: `https://t.me/share/url?url=${encUrl}&text=${encText}`, target: "_blank", rel: "noopener" }),
      icon("Facebook", SHARE_SVGS.facebook, { href: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}&quote=${encText}`, target: "_blank", rel: "noopener" }),
    );
    const copy = icon(S.copyLink, SHARE_SVGS.copy, { type: "button" });
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
        copy.innerHTML = SHARE_SVGS.check;
        copy.setAttribute("aria-label", S.copied);
        setTimeout(() => {
          copy.innerHTML = SHARE_SVGS.copy;
          copy.setAttribute("aria-label", S.copyLink);
        }, 2000);
      } catch { /* clipboard unavailable: button stays a no-op */ }
    });
    kids.push(copy);
    return h("div", { class: "share-icons", role: "group", "aria-label": S.shareBtn }, ...kids);
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

// ---- Unit checkpoints (Feature 2) -------------------------------------
// A 10-question mixed review run by a small session runner over the
// same question kinds as lessons. The server builds the set and
// enforces access; this runner only presents it, records attempts,
// and posts the milestone at the end.

function cpSegments(idx, total, doneCount) {
  const ids = Array.from({ length: total }, (_, i) => `q${i}`);
  return topbar({
    completed: ids.slice(0, doneCount),
    activity: ids[idx] ?? null,
    activities: ids,
    stepText: `${Math.min(idx + 1, total)} of ${total}`,
  });
}

function normalizeAnswer(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[.!?]+$/, "")
    .trim();
}

function runSession({ questions, pool, title, onDone }) {
  let idx = 0;
  let score = 0;
  const missed = [];
  const total = questions.length;

  const finish = () => onDone({ score, total, missed, questions });
  const next = () => {
    idx++;
    if (idx >= total) finish();
    else render();
  };
  const answer = (q, correct, scoreVal) => {
    recordAttempt(q.phrase, q.activity, correct, scoreVal ?? null, q.helped === true);
    if (correct) score++;
    else missed.push(q);
  };
  const frame = (...kids) =>
    player.screen(
      h("div", { class: "screen" }, cpSegments(idx, total, idx), h("h1", {}, title), ...kids),
    );

  function renderChoice(q) {
    const others = pool.filter((p) => p.id !== q.phrase.id);
    const picks = [q.phrase, ...shuffleArr(others).slice(0, 3)];
    const options = shuffleArr(picks);
    let attempted = false;
    let locked = false;
    const msg = h("p", { class: "sub", style: "text-align:center;min-height:1.5em" }, "");
    const onPick = (btn, opt) => {
      if (locked) return;
      const right = opt.id === q.phrase.id;
      if (!attempted) {
        attempted = true;
        answer(q, right);
      }
      if (right) {
        locked = true;
        btn.classList.add("correct");
        msg.textContent = S.correct;
        setTimeout(next, 900);
      } else {
        btn.classList.add("wrong");
        msg.textContent = S.notQuite;
        setTimeout(() => btn.classList.remove("wrong"), 600);
      }
    };
    const grid = h(
      "div",
      { class: "grid" },
      ...options.map((opt) => {
        const btn = h(
          "button",
          { class: "pick" },
          ...(q.activity === "listen-match"
            ? [appImg({ src: opt.imageUrl, alt: "" })]
            : [h("span", { class: "opt-text" }, ...phraseNodes(opt))]),
        );
        btn.addEventListener("click", () => onPick(btn, opt));
        return btn;
      }),
    );
    if (q.activity === "listen-match") {
      const speaker = h("button", { class: "speaker", "aria-label": "Play sound" }, "♪");
      speaker.addEventListener("click", () => playAudio(pickAudioUrl(q.phrase), speaker));
      setTimeout(() => playAudio(pickAudioUrl(q.phrase), speaker), 350);
      frame(
        ...listenHelpRow(q.phrase, speaker),
        grid,
        msg,
      );
    } else {
      frame(appImg({ class: "hero-img", src: q.phrase.imageUrl, alt: "" }), grid, msg);
    }
  }

  function renderWrite(q) {
    const b = blanked(q.phrase.text);
    const input = h("input", {
      type: "text",
      autocomplete: "off",
      autocapitalize: "off",
      "aria-label": "Missing word",
      placeholder: S.typeIt,
    });
    const msg = h("p", { class: "sub", style: "text-align:center;min-height:1.5em" }, "");
    let attempted = false;
    const check = () => {
      const right = normalizeAnswer(input.value) === normalizeAnswer(b.answer);
      if (!attempted) {
        attempted = true;
        answer(q, right);
      }
      if (right) {
        msg.textContent = S.correct;
        setTimeout(next, 900);
      } else {
        msg.textContent = S.notQuite;
      }
    };
    const go = h("button", { class: "btn" }, S.check);
    go.addEventListener("click", check);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") check();
    });
    const speaker = h("button", { class: "speaker", "aria-label": "Play sound" }, "♪");
    speaker.addEventListener("click", () => playAudio(pickAudioUrl(q.phrase), speaker));
    // Hear the sentence as soon as the question loads, like lessons.
    setTimeout(() => playAudio(pickAudioUrl(q.phrase), speaker), 350);
    const shownWords = q.phrase.words?.slice(0, -1);
    const promptNodes = shownWords?.length
      ? [
          ...phraseDisplay({
            ...q.phrase,
            text: shownWords.map((w) => w.text).join(" "),
            words: shownWords,
          }),
          " ______.",
        ]
      : [b.prompt];
    frame(
      h("div", { class: "play-row" }, speaker, helpButton(q.phrase)),
      h("div", { class: "phrase-card" }, ...promptNodes),
      h("div", { class: "write-row" }, input, go),
      msg,
    );
  }

  function renderSpeak(q) {
    // Recall round (Phase 1b): image only, no text and no audio
    // first. Pressing help reveals the text and turns the round
    // into a normal speak round, recorded as recall-with-help.
    const isRecall = q.activity === "recall";
    const mic = h("button", { class: "mic", "aria-label": "Record your voice" }, "🎙");
    const status = h("p", { class: "sub", style: "text-align:center" }, S.tapMic);
    const speaker = h("button", { class: "speaker", "aria-label": "Play sound" }, "♪");
    speaker.addEventListener("click", () => playAudio(pickAudioUrl(q.phrase), speaker));
    mic.addEventListener("click", async () => {
      // Not disabled while recording: a disabled button fires no
      // clicks, which would break tap-again-to-finish-early.
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        status.textContent = S.noMic;
        mic.disabled = false;
        return;
      }
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      const stopped = new Promise((resolve) => { rec.onstop = resolve; });
      const stop = () => { if (rec.state !== "inactive") rec.stop(); };
      mic.classList.add("recording");
      const stopClock = startMicClock(mic, 8000);
      mic.addEventListener("click", stop, { once: true });
      rec.start();
      status.textContent = S.listening;
      const deadline = setTimeout(stop, 8000);
      await stopped;
      stopClock();
      clearTimeout(deadline);
      stream.getTracks().forEach((t) => t.stop());
      mic.classList.remove("recording");
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
        const res = await api.score(q.phrase.id, base64, null);
        const sc = typeof res.score === "number" ? res.score : res.pass ? 100 : 0;
        answer(q, sc >= 70, sc);
        status.textContent = sc >= 70 ? S.correct : S.notQuite;
        const nx = h("button", { class: "btn" }, S.continueBtn);
        nx.addEventListener("click", next);
        frame(
          appImg({ class: "hero-img", src: q.phrase.imageUrl, alt: "" }),
          h("div", { class: "phrase-card" }, ...phraseDisplay(q.phrase)),
          status,
          nx,
        );
      } catch {
        status.textContent = S.scoringError;
        mic.disabled = false;
      }
    }, { once: true });
    if (isRecall) {
      const card = h("div", { class: "phrase-card" }, ...phraseDisplay(q.phrase));
      card.hidden = true;
      frame(
        appImg({ class: "hero-img", src: q.phrase.imageUrl, alt: "" }),
        card,
        h("div", { class: "play-row" }, helpButton(q.phrase, (on) => { if (on) { q.helped = true; card.hidden = false; } else card.hidden = true; })),
        h("div", { class: "mic-wrap" }, mic),
        status,
      );
    } else {
      frame(
        appImg({ class: "hero-img", src: q.phrase.imageUrl, alt: "" }),
        h("div", { class: "phrase-card" }, ...phraseDisplay(q.phrase)),
        h("div", { class: "play-row" }, speaker, helpButton(q.phrase)),
        h("div", { class: "mic-wrap" }, mic),
        status,
      );
    }
  }

  function render() {
    const q = questions[idx];
    if (q.activity === "speak-score" || q.activity === "recall") renderSpeak(q);
    else if (q.activity === "read-write") renderWrite(q);
    else renderChoice(q);
  }

  render();
}

function shuffleArr(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function bootCheckpoint(lang, level, unit) {
  player.screen(h("div", { class: "screen" }, h("p", { class: "sub" }, S.loading)));
  if (!(await api.me())) await api.anonymous();
  let data = null;
  let status = 0;
  try {
    const r = await fetch(`/api/checkpoint/${lang}/${level}/${unit}`, { credentials: "include" });
    status = r.status;
    if (r.ok) data = await r.json();
  } catch { /* offline */ }
  const title = S.checkpointTitle.replace("{n}", String(unit));
  if (!data) {
    const msg =
      status === 402
        ? h("p", { class: "sub" }, S.checkpointLocked)
        : status === 403
          ? h("p", { class: "sub" }, S.checkpointLocked)
          : h("p", { class: "sub" }, S.loadError);
    player.screen(
      h("div", { class: "screen" },
        cpSegments(0, 10, 0),
        h("h1", {}, title),
        msg,
        h("div", { class: "spacer" }),
        status === 402
          ? h("a", { class: "btn", href: "/billing" }, S.seePlans ?? "See plans")
          : h("a", { class: "btn", href: `/${lang}` }, S.backToCourse ?? "Back")),
    );
    return;
  }
  const start = h("button", { class: "btn" }, S.checkpointStart);
  start.addEventListener("click", () => {
    runSession({
      questions: data.questions,
      pool: data.pool,
      title,
      onDone: async ({ score, total, missed }) => {
        const passed = score >= 8;
        await fetch("/api/milestones", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "checkpoint", lang, level, unit, score }),
        }).catch(() => {});
        if (passed) {
          confetti();
          setTimeout(confetti, 900);
        }
        const missedList = missed.length
          ? h("div", { class: "cp-missed" },
              ...missed.map((q) => {
                const b = h("button", { class: "btn ghost", "aria-label": "Play sound" }, "♪");
                b.addEventListener("click", () => playAudio(pickAudioUrl(q.phrase), b));
                return h("div", { class: "cp-missed-row" }, b, h("span", {}, q.phrase.text));
              }))
          : null;
        const continueBtn = h("a", { class: "btn", href: `/${lang}` }, S.continueToUnit.replace("{n}", String(unit + 1)));
        const againBtn = h("button", { class: "btn ghost" }, S.tryAgainCp);
        againBtn.addEventListener("click", () => location.reload());
        const practiseBtn = h(
          "a",
          {
            class: "btn ghost",
            href: `/${lang}/review?phrases=${missed.map((q) => q.phrase.id).join(",")}`,
          },
          S.practiseThese,
        );
        player.screen(
          h("div", { class: "screen" },
            cpSegments(total, total, total),
            h("div", { class: "celebrate" },
              h("img", { class: "cp-parrot", src: "/logo/parrot-mark.svg", alt: "" }),
              h("h1", {}, passed ? S.checkpointPassedText : S.checkpointFail),
              h("p", { class: "sub" }, S.checkpointScoreLine.replace("{n}", String(score))),
              ...(passed ? [h("div", { class: "cp-badge" }, `Unit ${unit} ✓`)] : []),
              // Missed phrases (with play buttons) belong on the
              // not-passed screen; on a pass they read as a stray
              // button under the badge, and Practise these already
              // covers reviewing them.
              ...(!passed && missedList ? [missedList] : []),
              h("div", { class: "spacer" }),
              h("div", { class: "complete-actions" },
                continueBtn,
                ...(missed.length ? [practiseBtn] : []),
                ...(!passed || !missed.length ? [againBtn] : [])),
              h("p", {}, h("a", { href: `/${lang}` }, `← ${S.lessonPage}`)))),
        );
      },
    });
  });
  player.screen(
    h("div", { class: "screen" },
      cpSegments(0, data.questions.length, 0),
      h("h1", {}, title),
      h("p", { class: "sub" }, S.checkpointIntro),
      h("div", { class: "spacer" }),
      start),
  );
}

async function bootReview(lang) {
  player.screen(h("div", { class: "screen" }, h("p", { class: "sub" }, S.loading)));
  if (!(await api.me())) await api.anonymous();
  const qs = new URLSearchParams(location.search).get("phrases");
  let data = null;
  try {
    const r = await fetch(`/api/review/${lang}${qs ? `?phrases=${encodeURIComponent(qs)}` : ""}`, { credentials: "include" });
    if (r.ok) data = await r.json();
  } catch { /* offline */ }
  const courseBtn = h("a", { class: "btn", href: `/${lang}` }, S.backToCourse ?? "Back");
  if (!data?.questions?.length) {
    player.screen(
      h("div", { class: "screen" },
        cpSegments(0, 1, 0),
        h("h1", {}, S.practiseTitle),
        h("p", { class: "sub" }, S.reviewEmpty),
        h("div", { class: "spacer" }),
        courseBtn),
    );
    return;
  }
  const sessionIds = data.questions.map((q) => q.phrase.id);
  runSession({
    questions: data.questions,
    pool: data.pool,
    title: S.dailyReviewTitle ?? S.practiseTitle,
    onDone: async () => {
      let fixed = 0;
      let remaining = 0;
      try {
        const r = await fetch(`/api/review/${lang}`, { credentials: "include" });
        if (r.ok) {
          const after = await r.json();
          const weakNow = new Set(after.weakIds ?? []);
          fixed = sessionIds.filter((id) => !weakNow.has(id)).length;
          remaining = after.weakCount ?? 0;
        }
      } catch { /* counts unavailable offline */ }
      player.screen(
        h("div", { class: "screen" },
          cpSegments(sessionIds.length, sessionIds.length, sessionIds.length),
          h("div", { class: "celebrate" },
            h("img", { class: "cp-parrot", src: "/logo/parrot-mark.svg", alt: "" }),
            h("h1", {}, S.phrasesFixed.replace("{n}", String(fixed))),
            h("p", { class: "sub" }, S.stillToPractise.replace("{n}", String(remaining))),
            h("div", { class: "spacer" }),
            courseBtn)),
      );
    },
  });
}

// ---- Level scene challenge + test out (Feature 4) ---------------------
// 12 spoken lines in 3 scenes. Challenge: one retry per line, better
// score counts, pass at average 75 with no line below 40. Test out:
// no retries, pass at average 85 with no line below 50; the server
// re-derives scores from recorded attempts and applies the effects.

async function bootChallenge(lang, level, mode) {
  const title = S.challengeTitle.replace("{n}", String(level));
  player.screen(h("div", { class: "screen" }, h("p", { class: "sub" }, S.loading)));
  if (!(await api.me())) await api.anonymous();
  let data = null;
  let status = 0;
  try {
    const r = await fetch(`/api/challenge/${lang}/${level}?mode=${mode}`, { credentials: "include" });
    status = r.status;
    if (r.ok) data = await r.json();
  } catch { /* offline */ }
  if (!data) {
    player.screen(
      h("div", { class: "screen" },
        cpSegments(0, 12, 0),
        h("h1", {}, title),
        h("p", { class: "sub" }, status === 402 ? S.subscribeToOpen : S.challengeLocked),
        h("div", { class: "spacer" }),
        status === 402
          ? h("a", { class: "btn", href: "/billing" }, S.subscribeToOpen)
          : h("a", { class: "btn", href: `/${lang}` }, S.backToCourse ?? "Back")),
    );
    return;
  }
  const lines = data.scenes.flatMap((s) => s.lines);
  const best = new Array(lines.length).fill(0);
  const tried = new Array(lines.length).fill(0);
  let idx = 0;

  const frame = (...kids) =>
    player.screen(
      h("div", { class: "screen" },
        cpSegments(idx, lines.length, idx),
        h("p", { class: "sub" }, S.sceneOf.replace("{a}", String(Math.floor(idx / 4) + 1)).replace("{b}", "3")),
        h("h1", {}, title),
        ...kids),
    );

  function renderLine() {
    const phrase = lines[idx];
    // Phase 1b: the final line of each scene is a recall line —
    // scene image only, no audio or text first (never in test out).
    const isRecallLine = mode !== "testout" && idx % 4 === 3;
    let lineHelped = false;
    const mic = h("button", { class: "mic", "aria-label": "Record your voice" }, "🎙");
    const status = h("p", { class: "sub", style: "text-align:center" }, S.tapMic);
    const speaker = h("button", { class: "speaker", "aria-label": "Play sound" }, "♪");
    speaker.addEventListener("click", () => playAudio(pickAudioUrl(phrase), speaker));
    if (!isRecallLine) setTimeout(() => playAudio(pickAudioUrl(phrase), speaker), 350);
    mic.addEventListener("click", async () => {
      // Not disabled while recording: a disabled button fires no
      // clicks, which would break tap-again-to-finish-early.
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        status.textContent = S.noMic;
        mic.disabled = false;
        return;
      }
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      const stopped = new Promise((resolve) => { rec.onstop = resolve; });
      const stop = () => { if (rec.state !== "inactive") rec.stop(); };
      mic.classList.add("recording");
      const stopClock = startMicClock(mic, 8000);
      mic.addEventListener("click", stop, { once: true });
      rec.start();
      status.textContent = S.listening;
      const deadline = setTimeout(stop, 8000);
      await stopped;
      stopClock();
      clearTimeout(deadline);
      stream.getTracks().forEach((t) => t.stop());
      mic.classList.remove("recording");
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
        const res = await api.score(phrase.id, base64, null);
        const sc = typeof res.score === "number" ? res.score : res.pass ? 100 : 0;
        tried[idx]++;
        best[idx] = Math.max(best[idx], sc);
        recordAttempt(phrase, isRecallLine ? "recall" : "speak-score", sc >= 70, sc, lineHelped);
        const canRetry = mode !== "testout" && tried[idx] < 2;
        const nx = h("button", { class: "btn" }, S.continueBtn);
        nx.addEventListener("click", () => {
          idx++;
          if (idx >= lines.length) finish();
          else renderLine();
        });
        const retry = h("button", { class: "btn ghost" }, S.tryAgainCp);
        retry.addEventListener("click", renderLine);
        frame(
          appImg({ class: "hero-img", src: phrase.imageUrl, alt: "" }),
          h("div", { class: "phrase-card" }, ...phraseDisplay(phrase)),
          h("p", { class: "sub", style: "text-align:center" }, `${sc}`),
          h("div", { style: "display:flex;flex-direction:column;gap:0.6rem" }, nx, ...(canRetry ? [retry] : [])),
        );
      } catch {
        status.textContent = S.scoringError;
        mic.disabled = false;
      }
    }, { once: true });
    if (isRecallLine) {
      const card = h("div", { class: "phrase-card" }, ...phraseDisplay(phrase));
      card.hidden = true;
      frame(
        appImg({ class: "hero-img", src: phrase.imageUrl, alt: "" }),
        card,
        h("div", { class: "play-row" }, helpButton(phrase, (on) => { if (on) { lineHelped = true; card.hidden = false; } else card.hidden = true; })),
        h("div", { class: "mic-wrap" }, mic),
        status,
      );
    } else {
      frame(
        appImg({ class: "hero-img", src: phrase.imageUrl, alt: "" }),
        h("div", { class: "phrase-card" }, ...phraseDisplay(phrase)),
        h("div", { class: "play-row" }, speaker, helpButton(phrase)),
        h("div", { class: "mic-wrap" }, mic),
        status,
      );
    }
  }

  async function finish() {
    const phraseIds = lines.map((p) => p.id);
    let result = { passed: false, phrasesLearned: 0 };
    try {
      const r = await fetch("/api/level-complete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, level, mode, phraseIds }),
      });
      if (r.ok) result = await r.json();
    } catch { /* offline: show local result without effects */ }
    const weakLines = lines.filter((_, i) => best[i] < 75);
    const missedList = weakLines.length
      ? h("div", { class: "cp-missed" },
          ...weakLines.map((p) => {
            const b = h("button", { class: "btn ghost", "aria-label": "Play sound" }, "♪");
            b.addEventListener("click", () => playAudio(pickAudioUrl(p), b));
            return h("div", { class: "cp-missed-row" }, b, h("span", {}, p.text));
          }))
      : null;
    const courseBtn = h("a", { class: "btn", href: `/${lang}` }, S.backToCourse ?? "Back");
    if (result.billingRequired) {
      player.screen(
        h("div", { class: "screen" },
          cpSegments(lines.length, lines.length, lines.length),
          h("div", { class: "celebrate" },
            h("img", { class: "cp-parrot", src: "/logo/parrot-mark.svg", alt: "" }),
            h("h1", {}, S.challengePassedText ?? S.levelDoneTitle.replace("{n}", String(level))),
            h("p", { class: "sub" }, S.subscribeToOpen),
            h("div", { class: "spacer" }),
            h("a", { class: "btn", href: "/billing" }, S.subscribeToOpen),
            courseBtn)),
      );
      return;
    }
    if (result.passed) confetti();
    const againBtn = h("button", { class: "btn ghost" }, S.tryAgainCp);
    againBtn.addEventListener("click", () => location.reload());
    const practiseBtn = h(
      "a",
      { class: "btn ghost", href: `/${lang}/review?phrases=${weakLines.map((p) => p.id).join(",")}` },
      S.practiseThese,
    );
    const nextLevelBtn = h("a", { class: "btn", href: `/${lang}?level=${level + 1}` }, S.continueToUnit.replace("{n}", String(level + 1)));
    player.screen(
      h("div", { class: "screen" },
        cpSegments(lines.length, lines.length, lines.length),
        h("div", { class: "celebrate" },
          h("img", { class: "cp-parrot", src: "/logo/parrot-mark.svg", alt: "" }),
          h("h1", {}, result.passed ? S.levelDoneTitle.replace("{n}", String(level)) : S.checkpointFail),
          h("p", { class: "sub" }, S.learnedLine.replace("{n}", String(result.phrasesLearned ?? 0))),
          ...(missedList ? [missedList] : []),
          h("div", { class: "spacer" }),
          result.passed
            ? nextLevelBtn
            : mode === "testout"
              ? h("a", { class: "btn", href: `/${lang}` }, S.startUnitOne)
              : h("div", { style: "display:flex;flex-direction:column;gap:0.6rem" }, againBtn, ...(weakLines.length ? [practiseBtn] : [])),
          result.passed && weakLines.length ? practiseBtn : null,
          result.passed ? courseBtn : null)),
    );
  }

  const start = h("button", { class: "btn" }, S.checkpointStart);
  start.addEventListener("click", renderLine);
  player.screen(
    h("div", { class: "screen" },
      cpSegments(0, lines.length, 0),
      h("h1", {}, title),
      h("p", { class: "sub" }, S.challengeIntro),
      h("div", { class: "spacer" }),
      start),
  );
}

const cpPath = location.pathname.match(/^\/([a-z]{2})\/checkpoint\/(\d+)\/(\d+)\/?$/);
const reviewPath = location.pathname.match(/^\/([a-z]{2})\/review\/?$/);
const challengePath = location.pathname.match(/^\/([a-z]{2})\/challenge\/(\d+)\/?$/);
if (cpPath) {
  bootCheckpoint(cpPath[1], Number(cpPath[2]), Number(cpPath[3]));
} else if (challengePath) {
  const mode = new URLSearchParams(location.search).get("mode") === "testout" ? "testout" : "challenge";
  bootChallenge(challengePath[1], Number(challengePath[2]), mode);
} else if (reviewPath) {
  bootReview(reviewPath[1]);
} else {
  player.boot();
}
