// Interface (UI) localization, independent of the course being
// learned: a Thai learner studying English can navigate in Thai.
// Default comes from the visitor's country; the top-menu UI switcher
// overrides it and is remembered in the nl_ui cookie.
import { COUNTRY_TO_LANG } from "./geo";

export type UiLang = "en" | "es" | "de" | "fr" | "th" | "zh";

export const UI_LANGS: { code: UiLang; name: string; ownName: string; flag: string }[] = [
  { code: "en", name: "English", ownName: "English", flag: "🇬🇧" },
  { code: "es", name: "Spanish", ownName: "Español", flag: "🇪🇸" },
  { code: "de", name: "German", ownName: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "French", ownName: "Français", flag: "🇫🇷" },
  { code: "th", name: "Thai", ownName: "\u0e44\u0e17\u0e22", flag: "🇹🇭" },
  { code: "zh", name: "Chinese", ownName: "\u4e2d\u6587", flag: "🇨🇳" },
];

export function isUiLang(code: string | null | undefined): code is UiLang {
  return !!code && UI_LANGS.some((l) => l.code === code);
}

/** UI language for a request: cookie choice first, then the country
 *  default (Thailand -> Thai, China -> Chinese, ...), then English. */
export function uiLangFor(input: {
  cookie?: string | null;
  country?: string | null;
}): UiLang {
  if (isUiLang(input.cookie)) return input.cookie;
  const byCountry = input.country ? COUNTRY_TO_LANG[input.country.toUpperCase()] : undefined;
  if (isUiLang(byCountry)) return byCountry;
  return "en";
}

export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

const en = {
  signIn: "Sign in", account: "Account", students: "Students", developers: "Developers",
  freeAccount: "Free account", interfaceLanguage: "Interface language",
  heroEyebrow: "See it. Hear it. Say it.", heroTitle: "What do you want to learn?",
  heroLede: "Each lesson pairs eight photos with audio, then scores how you say them.",
  freeLine: "Unit 1 (lessons 1-4) is free. Lesson 5 and up is Premium.",
  hearIt: "Hear it", sayIt: "Say it", chooseLanguage: "Choose a language",
  stepsHeading: "Four steps in every lesson",
  stepListen: "Listen", stepListenText: "Hear a phrase and pick the photo it describes.",
  stepMatch: "Match", stepMatchText: "See a photo and pick the phrase that fits it.",
  stepSpeak: "Speak", stepSpeakText: "Say the phrase aloud and get a pronunciation score.",
  stepWrite: "Write", stepWriteText: "Read the phrase and type the missing word.",
  bandTitle: "Unit 1 is free.", seePlans: "See plans", keepGoingHeading: "Keep going!",
  orStartAnother: "Or start another", courseComplete: "Course complete",
  niceWorkNext: "Nice work! Next up", finishedFreeUnit: "You finished the free unit.",
  unlockEveryLesson: "Unlock every lesson", startHere: "Start here", startHereFree: "Start here · Free",
  keepGoingLabel: "Keep going!", continueLabel: "Continue", lessonWord: "Lesson", unitWord: "Unit",
  stepsComplete: "{done} of {total} steps complete", doneWord: "Done", resumeWord: "Resume",
  notStarted: "Not started", freeBadge: "Free", premiumBadge: "Premium", comingSoon: "Coming soon",
  savedOnDevice: "Your progress is saved on this device only.", signInToKeep: "Sign in to keep it",
  reviewLesson: "Review lesson {n}", startLesson: "Start lesson {n}", resumeLesson: "Resume lesson {n}",
  lessonsDone: "{done} of {total} lessons done", continueLesson: "Continue lesson {n}", reviewWord: "Review",
  billingHeading: "Nicelingo Premium", receiptEmail: "Email for your receipt",
  monthlyPlan: "Monthly", yearlyPlan: "Yearly", subscribeMonthly: "Subscribe monthly",
  subscribeYearly: "Subscribe yearly", cancelAnytime: "Cancel anytime from your receipt or account page.",
  twoMonthsFree: "Two months free, one payment a year.",
  promptpayText30: "One payment by QR from your Thai bank app. 30 days of Premium, no auto-renewal.",
  promptpayText365: "One payment by QR from your Thai bank app. 365 days of Premium, no auto-renewal.",
  payWithPromptPay: "Pay with PromptPay", paymentsNote: "Payments are handled securely by Stripe. Manage or cancel anytime:",
  manageSubscription: "Manage subscription", backToLessons: "Back to lessons",
  subscribedHeading: "You're subscribed", subscribedText: "Your payment went through. All lessons are unlocked.",
  startLearning: "Start learning", almostHeading: "Almost there…",
  almostText: "We're confirming your payment — this usually takes a few seconds. Back to lessons and your progress will unlock automatically.",
  cancelledHeading: "Checkout cancelled", cancelledText: "No charge was made. Unit 1 is still free whenever you want it.",
  createAccountHeading: "Create your free account", nameLabel: "Name", emailLabel: "Email",
  passwordLabel: "Password", createAccountBtn: "Create free account", alreadyRegistered: "Already registered?",
  signInHeading: "Sign in", welcomeBack: "Welcome back.", forgotPassword: "Forgot your password?",
  newToNicelingo: "New to Nicelingo?", yourAccount: "Your account",
  premiumAccountLine: "Unit 1 (lessons 1-4) is free. Lesson 5 and up needs Premium.",
  premiumBtn: "Premium — $3/month or $29/year", subscribeManageLine: "Subscribe, manage, or cancel your subscription.",
  studentsBtn: "Students", studentsLine: "Link a student and see their progress.", signOut: "Sign out",
  backToLanguages: "Back to languages", guestBrowse: "You are browsing as a guest. Create a free account to save your progress.",
  signedInAs: "Signed in as {email}.", tapToStart: "Tap to start", lessonsCount: "{n} lessons", pillDone: "done", pillNext: "next", devManifest: "lesson manifest", devScore: "pronunciation scoring", devProgress: "your progress (sign in first)", devAnonymous: "try without an account", devHealth: "service status", backToNicelingo: "Back to Nicelingo", dayStreak: "{n}-day streak", badgesTitle: "Badges", unitsDone: "{n} units done", nextBadgeOne: "Next badge after {n} more unit", nextBadgeOther: "Next badge after {n} more units", progressTitle: "Your progress", streakKeepLine: "Practice today to keep it going", streakDoneLine: "Practiced today — come back tomorrow to keep it going", streakStartLine: "Do one lesson today to start your streak", badgeHowTo: "Finish {n} units to earn this badge", badgeHowToOne: "Finish {n} unit to earn this badge", phrasesLearned: "{n} phrases learned", signInStreak: "Sign in so you don't lose your {n}-day streak", backToCourse: "Back to the course", goPremium: "Go Premium", monthlyPrice: "$3/month", thbMonthlyPrice: "THB 99/month", thbYearlyPrice: "THB 990/year", yearlyPrice: "$29/year", level1Only: "(Level 1 only)", premiumOpens: "Premium opens every lesson for {monthly} or {yearly}.", everyLessonPrice: "Every lesson {monthly} or {yearly}.", premiumOpensLang: "Premium opens every {name} lesson for {monthly} or {yearly}.", photosCount: "{n} photos", stepsShort: "{n} short steps",
  terms: "Terms",
  privacy: "Privacy",
  refunds: "Refunds",
  contact: "Contact",
  helpAndContact: "Help and contact",
  appLanguage: "App language",
};

export type UiDict = typeof en;

const es: UiDict = {
  signIn: "Iniciar sesión", account: "Cuenta", students: "Estudiantes", developers: "Desarrolladores",
  freeAccount: "Cuenta gratuita", interfaceLanguage: "Idioma de la interfaz",
  heroEyebrow: "Míralo. Escúchalo. Dilo.", heroTitle: "¿Qué quieres aprender?",
  heroLede: "Cada lección combina ocho fotos con audio y luego califica cómo las dices.",
  freeLine: "La Unidad 1 (lecciones 1-4) es gratuita. Desde la lección 5 es Premium.",
  hearIt: "Escuchar", sayIt: "Decirlo", chooseLanguage: "Elige un idioma",
  stepsHeading: "Cuatro pasos en cada lección",
  stepListen: "Escuchar", stepListenText: "Escucha una frase y elige la foto que describe.",
  stepMatch: "Relacionar", stepMatchText: "Mira una foto y elige la frase que encaja.",
  stepSpeak: "Hablar", stepSpeakText: "Di la frase en voz alta y recibe una nota de pronunciación.",
  stepWrite: "Escribir", stepWriteText: "Lee la frase y escribe la palabra que falta.",
  bandTitle: "La Unidad 1 es gratuita.", seePlans: "Ver planes", keepGoingHeading: "¡Sigue así!",
  orStartAnother: "O empieza otro", courseComplete: "Curso completado",
  niceWorkNext: "¡Buen trabajo! Siguiente", finishedFreeUnit: "Terminaste la unidad gratuita.",
  unlockEveryLesson: "Desbloquear todas las lecciones", startHere: "Empieza aquí", startHereFree: "Empieza aquí · Gratis",
  keepGoingLabel: "¡Sigue así!", continueLabel: "Continuar", lessonWord: "Lección", unitWord: "Unidad",
  stepsComplete: "{done} de {total} pasos completados", doneWord: "Hecho", resumeWord: "Continuar",
  notStarted: "Sin empezar", freeBadge: "Gratis", premiumBadge: "Premium", comingSoon: "Muy pronto",
  savedOnDevice: "Tu progreso se guarda solo en este dispositivo.", signInToKeep: "Inicia sesión para conservarlo",
  reviewLesson: "Repasar la lección {n}", startLesson: "Empezar la lección {n}", resumeLesson: "Continuar la lección {n}",
  lessonsDone: "{done} de {total} lecciones hechas", continueLesson: "Continuar la lección {n}", reviewWord: "Repasar",
  billingHeading: "Nicelingo Premium", receiptEmail: "Correo para tu recibo",
  monthlyPlan: "Mensual", yearlyPlan: "Anual", subscribeMonthly: "Suscribirme al mes",
  subscribeYearly: "Suscribirme al año", cancelAnytime: "Cancela cuando quieras desde tu recibo o tu cuenta.",
  twoMonthsFree: "Dos meses gratis, un pago al año.",
  promptpayText30: "Un pago con QR desde tu banco tailandés. 30 días de Premium, sin renovación automática.",
  promptpayText365: "Un pago con QR desde tu banco tailandés. 365 días de Premium, sin renovación automática.",
  payWithPromptPay: "Pagar con PromptPay", paymentsNote: "Stripe procesa los pagos de forma segura. Gestiona o cancela cuando quieras:",
  manageSubscription: "Gestionar suscripción", backToLessons: "Volver a las lecciones",
  subscribedHeading: "Ya tienes tu suscripción", subscribedText: "Tu pago se completó. Todas las lecciones están desbloqueadas.",
  startLearning: "Empezar a aprender", almostHeading: "Ya casi…",
  almostText: "Estamos confirmando tu pago; suele tardar unos segundos. Vuelve a las lecciones y se desbloquearán automáticamente.",
  cancelledHeading: "Pago cancelado", cancelledText: "No se hizo ningún cargo. La Unidad 1 sigue siendo gratuita cuando quieras.",
  createAccountHeading: "Crea tu cuenta gratuita", nameLabel: "Nombre", emailLabel: "Correo",
  passwordLabel: "Contraseña", createAccountBtn: "Crear cuenta gratuita", alreadyRegistered: "¿Ya tienes cuenta?",
  signInHeading: "Iniciar sesión", welcomeBack: "Qué bueno verte de nuevo.", forgotPassword: "¿Olvidaste tu contraseña?",
  newToNicelingo: "¿Nuevo en Nicelingo?", yourAccount: "Tu cuenta",
  premiumAccountLine: "La Unidad 1 (lecciones 1-4) es gratuita. Desde la lección 5 necesitas Premium.",
  premiumBtn: "Premium — $3/mes o $29/año", subscribeManageLine: "Suscríbete, gestiona o cancela tu suscripción.",
  studentsBtn: "Estudiantes", studentsLine: "Vincula a un estudiante y mira su progreso.", signOut: "Cerrar sesión",
  backToLanguages: "Volver a los idiomas", guestBrowse: "Estás navegando como invitado. Crea una cuenta gratuita para guardar tu progreso.",
  signedInAs: "Sesión iniciada como {email}.", tapToStart: "Toca para empezar", lessonsCount: "{n} lecciones", pillDone: "hecho", pillNext: "siguiente", devManifest: "manifiesto de la lección", devScore: "calificación de pronunciación", devProgress: "tu progreso (inicia sesión primero)", devAnonymous: "probar sin cuenta", devHealth: "estado del servicio", backToNicelingo: "Volver a Nicelingo", dayStreak: "Racha de {n} días", badgesTitle: "Insignias", unitsDone: "{n} unidades terminadas", nextBadgeOne: "Siguiente insignia tras {n} unidad m\u00e1s", nextBadgeOther: "Siguiente insignia tras {n} unidades m\u00e1s", progressTitle: "Tu progreso", streakKeepLine: "Practica hoy para mantener tu racha", streakDoneLine: "Ya practicaste hoy — vuelve mañana para mantener tu racha", streakStartLine: "Haz una lección hoy para empezar tu racha", badgeHowTo: "Termina {n} unidades para ganar esta insignia", badgeHowToOne: "Termina {n} unidad para ganar esta insignia", phrasesLearned: "{n} frases aprendidas", signInStreak: "Inicia sesión para no perder tu racha de {n} días", backToCourse: "Volver al curso", goPremium: "Hazte Premium", monthlyPrice: "$3/mes", thbMonthlyPrice: "THB 99/mes", thbYearlyPrice: "THB 990/año", yearlyPrice: "$29/año", level1Only: "(solo Nivel 1)", premiumOpens: "Premium abre todas las lecciones por {monthly} o {yearly}.", everyLessonPrice: "Todas las lecciones {monthly} o {yearly}.", premiumOpensLang: "Premium abre todas las lecciones de {name} por {monthly} o {yearly}.", photosCount: "{n} fotos", stepsShort: "{n} pasos cortos",
  terms: "T\u00e9rminos",
  privacy: "Privacidad",
  refunds: "Reembolsos",
  contact: "Contacto",
  helpAndContact: "Ayuda y contacto",
  appLanguage: "Idioma de la app",
};

const de: UiDict = {
  signIn: "Anmelden", account: "Konto", students: "Schüler", developers: "Entwickler",
  freeAccount: "Kostenloses Konto", interfaceLanguage: "Oberflächensprache",
  heroEyebrow: "Sehen. Hören. Sprechen.", heroTitle: "Was möchtest du lernen?",
  heroLede: "Jede Lektion verbindet acht Fotos mit Audio und bewertet dann deine Aussprache.",
  freeLine: "Einheit 1 (Lektionen 1-4) ist kostenlos. Ab Lektion 5 ist Premium nötig.",
  hearIt: "Anhören", sayIt: "Nachsprechen", chooseLanguage: "Wähle eine Sprache",
  stepsHeading: "Vier Schritte in jeder Lektion",
  stepListen: "Hören", stepListenText: "Höre einen Satz und tippe auf das passende Foto.",
  stepMatch: "Zuordnen", stepMatchText: "Sieh dir ein Foto an und wähle den passenden Satz.",
  stepSpeak: "Sprechen", stepSpeakText: "Sprich den Satz laut aus und erhalte eine Aussprache-Bewertung.",
  stepWrite: "Schreiben", stepWriteText: "Lies den Satz und tippe das fehlende Wort ein.",
  bandTitle: "Einheit 1 ist kostenlos.", seePlans: "Pläne ansehen", keepGoingHeading: "Weiter geht's!",
  orStartAnother: "Oder starte eine andere", courseComplete: "Kurs geschafft",
  niceWorkNext: "Gut gemacht! Als Nächstes", finishedFreeUnit: "Du hast die kostenlose Einheit geschafft.",
  unlockEveryLesson: "Alle Lektionen freischalten", startHere: "Hier starten", startHereFree: "Hier starten · Kostenlos",
  keepGoingLabel: "Weiter geht's!", continueLabel: "Weiter", lessonWord: "Lektion", unitWord: "Einheit",
  stepsComplete: "{done} von {total} Schritten geschafft", doneWord: "Fertig", resumeWord: "Weiter",
  notStarted: "Nicht begonnen", freeBadge: "Kostenlos", premiumBadge: "Premium", comingSoon: "Kommt bald",
  savedOnDevice: "Dein Fortschritt wird nur auf diesem Gerät gespeichert.", signInToKeep: "Melde dich an, um ihn zu behalten",
  reviewLesson: "Lektion {n} wiederholen", startLesson: "Lektion {n} starten", resumeLesson: "Lektion {n} fortsetzen",
  lessonsDone: "{done} von {total} Lektionen geschafft", continueLesson: "Lektion {n} fortsetzen", reviewWord: "Wiederholen",
  billingHeading: "Nicelingo Premium", receiptEmail: "E-Mail für deine Rechnung",
  monthlyPlan: "Monatlich", yearlyPlan: "Jährlich", subscribeMonthly: "Monatlich abonnieren",
  subscribeYearly: "Jährlich abonnieren", cancelAnytime: "Jederzeit über Rechnung oder Konto kündbar.",
  twoMonthsFree: "Zwei Monate gratis, eine Zahlung pro Jahr.",
  promptpayText30: "Einmalzahlung per QR aus deiner thailändischen Bank-App. 30 Tage Premium, keine automatische Verlängerung.",
  promptpayText365: "Einmalzahlung per QR aus deiner thailändischen Bank-App. 365 Tage Premium, keine automatische Verlängerung.",
  payWithPromptPay: "Mit PromptPay zahlen", paymentsNote: "Zahlungen laufen sicher über Stripe. Verwalten oder kündigen jederzeit:",
  manageSubscription: "Abo verwalten", backToLessons: "Zurück zu den Lektionen",
  subscribedHeading: "Du bist abonniert", subscribedText: "Deine Zahlung ist eingegangen. Alle Lektionen sind freigeschaltet.",
  startLearning: "Loslernen", almostHeading: "Fast geschafft…",
  almostText: "Wir bestätigen deine Zahlung — das dauert meist nur wenige Sekunden. Zurück zu den Lektionen, der Rest schaltet sich automatisch frei.",
  cancelledHeading: "Kauf abgebrochen", cancelledText: "Es wurde nichts abgebucht. Einheit 1 bleibt kostenlos, wann immer du willst.",
  createAccountHeading: "Erstelle dein kostenloses Konto", nameLabel: "Name", emailLabel: "E-Mail",
  passwordLabel: "Passwort", createAccountBtn: "Kostenloses Konto erstellen", alreadyRegistered: "Schon registriert?",
  signInHeading: "Anmelden", welcomeBack: "Willkommen zurück.", forgotPassword: "Passwort vergessen?",
  newToNicelingo: "Neu bei Nicelingo?", yourAccount: "Dein Konto",
  premiumAccountLine: "Einheit 1 (Lektionen 1-4) ist kostenlos. Ab Lektion 5 ist Premium nötig.",
  premiumBtn: "Premium — $3/Monat oder $29/Jahr", subscribeManageLine: "Abonnieren, verwalten oder kündigen.",
  studentsBtn: "Schüler", studentsLine: "Verbinde einen Schüler und sieh seinen Fortschritt.", signOut: "Abmelden",
  backToLanguages: "Zurück zu den Sprachen", guestBrowse: "Du surfst als Gast. Erstelle ein kostenloses Konto, um deinen Fortschritt zu speichern.",
  signedInAs: "Angemeldet als {email}.", tapToStart: "Tippen zum Starten", lessonsCount: "{n} Lektionen", pillDone: "fertig", pillNext: "als Nächstes", devManifest: "Lektionsmanifest", devScore: "Aussprache-Bewertung", devProgress: "dein Fortschritt (zuerst anmelden)", devAnonymous: "ohne Konto testen", devHealth: "Dienststatus", backToNicelingo: "Zurück zu Nicelingo", dayStreak: "{n}-Tage-Serie", badgesTitle: "Abzeichen", unitsDone: "{n} Einheiten geschafft", nextBadgeOne: "N\u00e4chstes Abzeichen nach {n} weiterer Einheit", nextBadgeOther: "N\u00e4chstes Abzeichen nach {n} weiteren Einheiten", progressTitle: "Dein Fortschritt", streakKeepLine: "Übe heute, um deine Serie zu halten", streakDoneLine: "Heute schon geübt — komm morgen wieder, um deine Serie zu halten", streakStartLine: "Mache heute eine Lektion, um deine Serie zu starten", badgeHowTo: "Schließe {n} Einheiten ab, um dieses Abzeichen zu erhalten", badgeHowToOne: "Schließe {n} Einheit ab, um dieses Abzeichen zu erhalten", phrasesLearned: "{n} Sätze gelernt", signInStreak: "Melde dich an, damit deine {n}-Tage-Serie nicht verloren geht", backToCourse: "Zurück zum Kurs", goPremium: "Premium holen", monthlyPrice: "$3/Monat", thbMonthlyPrice: "THB 99/Monat", thbYearlyPrice: "THB 990/Jahr", yearlyPrice: "$29/Jahr", level1Only: "(nur Stufe 1)", premiumOpens: "Premium schaltet jede Lektion für {monthly} oder {yearly} frei.", everyLessonPrice: "Jede Lektion {monthly} oder {yearly}.", premiumOpensLang: "Premium schaltet jede {name}-Lektion für {monthly} oder {yearly} frei.", photosCount: "{n} Fotos", stepsShort: "{n} kurze Schritte",
  terms: "AGB",
  privacy: "Datenschutz",
  refunds: "Erstattungen",
  contact: "Kontakt",
  helpAndContact: "Hilfe und Kontakt",
  appLanguage: "App-Sprache",
};

const fr: UiDict = {
  signIn: "Se connecter", account: "Compte", students: "Élèves", developers: "Développeurs",
  freeAccount: "Compte gratuit", interfaceLanguage: "Langue de l'interface",
  heroEyebrow: "Regardez. Écoutez. Répétez.", heroTitle: "Que voulez-vous apprendre ?",
  heroLede: "Chaque leçon associe huit photos à de l'audio, puis note votre prononciation.",
  freeLine: "L'unité 1 (leçons 1-4) est gratuite. À partir de la leçon 5, c'est Premium.",
  hearIt: "Écouter", sayIt: "Répéter", chooseLanguage: "Choisissez une langue",
  stepsHeading: "Quatre étapes dans chaque leçon",
  stepListen: "Écouter", stepListenText: "Écoutez une phrase et touchez la photo qu'elle décrit.",
  stepMatch: "Associer", stepMatchText: "Regardez une photo et choisissez la phrase qui correspond.",
  stepSpeak: "Parler", stepSpeakText: "Dites la phrase à voix haute et recevez une note de prononciation.",
  stepWrite: "Écrire", stepWriteText: "Lisez la phrase et tapez le mot manquant.",
  bandTitle: "L'unité 1 est gratuite.", seePlans: "Voir les offres", keepGoingHeading: "Continuez !",
  orStartAnother: "Ou commencez-en une autre", courseComplete: "Cours terminé",
  niceWorkNext: "Beau travail ! La suite", finishedFreeUnit: "Vous avez terminé l'unité gratuite.",
  unlockEveryLesson: "Débloquer toutes les leçons", startHere: "Commencez ici", startHereFree: "Commencez ici · Gratuit",
  keepGoingLabel: "Continuez !", continueLabel: "Continuer", lessonWord: "Leçon", unitWord: "Unité",
  stepsComplete: "{done} étapes sur {total} terminées", doneWord: "Terminé", resumeWord: "Reprendre",
  notStarted: "Pas commencé", freeBadge: "Gratuit", premiumBadge: "Premium", comingSoon: "Bientôt",
  savedOnDevice: "Votre progression n'est enregistrée que sur cet appareil.", signInToKeep: "Connectez-vous pour la garder",
  reviewLesson: "Revoir la leçon {n}", startLesson: "Commencer la leçon {n}", resumeLesson: "Reprendre la leçon {n}",
  lessonsDone: "{done} leçons sur {total} terminées", continueLesson: "Continuer la leçon {n}", reviewWord: "Revoir",
  billingHeading: "Nicelingo Premium", receiptEmail: "E-mail pour votre reçu",
  monthlyPlan: "Mensuel", yearlyPlan: "Annuel", subscribeMonthly: "S'abonner au mois",
  subscribeYearly: "S'abonner à l'année", cancelAnytime: "Résiliable à tout moment depuis votre reçu ou votre compte.",
  twoMonthsFree: "Deux mois offerts, un paiement par an.",
  promptpayText30: "Un paiement par QR depuis votre banque thaïlandaise. 30 jours de Premium, sans renouvellement automatique.",
  promptpayText365: "Un paiement par QR depuis votre banque thaïlandaise. 365 jours de Premium, sans renouvellement automatique.",
  payWithPromptPay: "Payer avec PromptPay", paymentsNote: "Les paiements sont sécurisés par Stripe. Gérez ou résiliez à tout moment :",
  manageSubscription: "Gérer l'abonnement", backToLessons: "Retour aux leçons",
  subscribedHeading: "Vous êtes abonné", subscribedText: "Votre paiement est passé. Toutes les leçons sont débloquées.",
  startLearning: "Commencer", almostHeading: "Presque…",
  almostText: "Nous confirmons votre paiement — cela prend quelques secondes. Retournez aux leçons, tout se débloquera automatiquement.",
  cancelledHeading: "Paiement annulé", cancelledText: "Aucun montant n'a été prélevé. L'unité 1 reste gratuite quand vous voulez.",
  createAccountHeading: "Créez votre compte gratuit", nameLabel: "Nom", emailLabel: "E-mail",
  passwordLabel: "Mot de passe", createAccountBtn: "Créer un compte gratuit", alreadyRegistered: "Déjà inscrit ?",
  signInHeading: "Se connecter", welcomeBack: "Bon retour.", forgotPassword: "Mot de passe oublié ?",
  newToNicelingo: "Nouveau sur Nicelingo ?", yourAccount: "Votre compte",
  premiumAccountLine: "L'unité 1 (leçons 1-4) est gratuite. À partir de la leçon 5, Premium est requis.",
  premiumBtn: "Premium — $3/mois ou $29/an", subscribeManageLine: "Abonnez-vous, gérez ou résiliez votre abonnement.",
  studentsBtn: "Élèves", studentsLine: "Liez un élève et suivez sa progression.", signOut: "Se déconnecter",
  backToLanguages: "Retour aux langues", guestBrowse: "Vous naviguez en invité. Créez un compte gratuit pour enregistrer votre progression.",
  signedInAs: "Connecté en tant que {email}.", tapToStart: "Touchez pour commencer", lessonsCount: "{n} leçons", pillDone: "terminé", pillNext: "suivant", devManifest: "manifeste de la leçon", devScore: "notation de la prononciation", devProgress: "votre progression (connectez-vous d’abord)", devAnonymous: "essayer sans compte", devHealth: "état du service", backToNicelingo: "Retour à Nicelingo", dayStreak: "Série de {n} jours", badgesTitle: "Badges", unitsDone: "{n} unités terminées", nextBadgeOne: "Prochain badge apr\u00e8s {n} unit\u00e9 suppl\u00e9mentaire", nextBadgeOther: "Prochain badge apr\u00e8s {n} unit\u00e9s suppl\u00e9mentaires", progressTitle: "Vos progrès", streakKeepLine: "Pratiquez aujourd'hui pour garder votre série", streakDoneLine: "Déjà pratiqué aujourd'hui — revenez demain pour garder votre série", streakStartLine: "Faites une leçon aujourd'hui pour commencer votre série", badgeHowTo: "Terminez {n} unités pour l'obtenir", badgeHowToOne: "Terminez {n} unité pour l'obtenir", phrasesLearned: "{n} phrases apprises", signInStreak: "Connectez-vous pour ne pas perdre votre série de {n} jours", backToCourse: "Retour au cours", goPremium: "Passer Premium", monthlyPrice: "$3/mois", thbMonthlyPrice: "THB 99/mois", thbYearlyPrice: "THB 990/an", yearlyPrice: "$29/an", level1Only: "(niveau 1 uniquement)", premiumOpens: "Premium ouvre toutes les leçons pour {monthly} ou {yearly}.", everyLessonPrice: "Toutes les leçons {monthly} ou {yearly}.", premiumOpensLang: "Premium ouvre toutes les leçons de {name} pour {monthly} ou {yearly}.", photosCount: "{n} photos", stepsShort: "{n} étapes courtes",
  terms: "Conditions",
  privacy: "Confidentialit\u00e9",
  refunds: "Remboursements",
  contact: "Contact",
  helpAndContact: "Aide et contact",
  appLanguage: "Langue de l'app",
};

const th: UiDict = {
  signIn: "\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a", account: "\u0e1a\u0e31\u0e0d\u0e0a\u0e35", students: "\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19", developers: "\u0e19\u0e31\u0e01\u0e1e\u0e31\u0e12\u0e19\u0e32",
  freeAccount: "\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e1f\u0e23\u0e35", interfaceLanguage: "\u0e20\u0e32\u0e29\u0e32\u0e02\u0e2d\u0e07\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d",
  heroEyebrow: "\u0e14\u0e39 \u0e1f\u0e31\u0e07 \u0e41\u0e25\u0e49\u0e27\u0e1e\u0e39\u0e14\u0e15\u0e32\u0e21", heroTitle: "\u0e04\u0e38\u0e13\u0e2d\u0e22\u0e32\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e2d\u0e30\u0e44\u0e23?",
  heroLede: "\u0e41\u0e15\u0e48\u0e25\u0e30\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19\u0e08\u0e31\u0e1a\u0e04\u0e39\u0e48\u0e20\u0e32\u0e1e 8 \u0e20\u0e32\u0e1e\u0e01\u0e31\u0e1a\u0e40\u0e2a\u0e35\u0e22\u0e07 \u0e41\u0e25\u0e49\u0e27\u0e43\u0e2b\u0e49\u0e04\u0e30\u0e41\u0e19\u0e19\u0e01\u0e32\u0e23\u0e1e\u0e39\u0e14\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13",
  freeLine: "\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e17\u0e35\u0e48 1 (\u0e1a\u0e17\u0e17\u0e35\u0e48 1-4) \u0e40\u0e23\u0e35\u0e22\u0e19\u0e1f\u0e23\u0e35 \u0e15\u0e31\u0e49\u0e07\u0e41\u0e15\u0e48\u0e1a\u0e17\u0e17\u0e35\u0e48 5 \u0e15\u0e49\u0e2d\u0e07\u0e43\u0e0a\u0e49 Premium",
  hearIt: "\u0e1f\u0e31\u0e07\u0e40\u0e2a\u0e35\u0e22\u0e07", sayIt: "\u0e25\u0e2d\u0e07\u0e1e\u0e39\u0e14", chooseLanguage: "\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e20\u0e32\u0e29\u0e32",
  stepsHeading: "\u0e2a\u0e35\u0e48\u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e43\u0e19\u0e17\u0e38\u0e01\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19",
  stepListen: "\u0e1f\u0e31\u0e07", stepListenText: "\u0e1f\u0e31\u0e07\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e04\u0e41\u0e25\u0e49\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e20\u0e32\u0e1e\u0e17\u0e35\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19",
  stepMatch: "\u0e08\u0e31\u0e1a\u0e04\u0e39\u0e48", stepMatchText: "\u0e14\u0e39\u0e20\u0e32\u0e1e\u0e41\u0e25\u0e49\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e04\u0e17\u0e35\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e19",
  stepSpeak: "\u0e1e\u0e39\u0e14", stepSpeakText: "\u0e1e\u0e39\u0e14\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e04\u0e2d\u0e2d\u0e01\u0e40\u0e2a\u0e35\u0e22\u0e07\u0e41\u0e25\u0e30\u0e23\u0e31\u0e1a\u0e04\u0e30\u0e41\u0e19\u0e19\u0e01\u0e32\u0e23\u0e2d\u0e2d\u0e01\u0e40\u0e2a\u0e35\u0e22\u0e07",
  stepWrite: "\u0e40\u0e02\u0e35\u0e22\u0e19", stepWriteText: "\u0e2d\u0e48\u0e32\u0e19\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e04\u0e41\u0e25\u0e49\u0e27\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e04\u0e33\u0e17\u0e35\u0e48\u0e2b\u0e32\u0e22\u0e44\u0e1b",
  bandTitle: "\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e17\u0e35\u0e48 1 \u0e40\u0e23\u0e35\u0e22\u0e19\u0e1f\u0e23\u0e35", seePlans: "\u0e14\u0e39\u0e41\u0e1e\u0e47\u0e01\u0e40\u0e01\u0e08", keepGoingHeading: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e15\u0e48\u0e2d\u0e40\u0e25\u0e22!",
  orStartAnother: "\u0e2b\u0e23\u0e37\u0e2d\u0e40\u0e23\u0e34\u0e48\u0e21\u0e20\u0e32\u0e29\u0e32\u0e2d\u0e37\u0e48\u0e19", courseComplete: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e08\u0e1a\u0e2b\u0e25\u0e31\u0e01\u0e2a\u0e39\u0e15\u0e23\u0e41\u0e25\u0e49\u0e27",
  niceWorkNext: "\u0e40\u0e01\u0e48\u0e07\u0e21\u0e32\u0e01! \u0e1a\u0e17\u0e15\u0e48\u0e2d\u0e44\u0e1b", finishedFreeUnit: "\u0e04\u0e38\u0e13\u0e40\u0e23\u0e35\u0e22\u0e19\u0e08\u0e1a\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e1f\u0e23\u0e35\u0e41\u0e25\u0e49\u0e27",
  unlockEveryLesson: "\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e17\u0e38\u0e01\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19", startHere: "\u0e40\u0e23\u0e34\u0e48\u0e21\u0e17\u0e35\u0e48\u0e19\u0e35\u0e48", startHereFree: "\u0e40\u0e23\u0e34\u0e48\u0e21\u0e17\u0e35\u0e48\u0e19\u0e35\u0e48 · \u0e1f\u0e23\u0e35",
  keepGoingLabel: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e15\u0e48\u0e2d\u0e40\u0e25\u0e22!", continueLabel: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e15\u0e48\u0e2d", lessonWord: "\u0e1a\u0e17\u0e17\u0e35\u0e48", unitWord: "\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e17\u0e35\u0e48",
  stepsComplete: "\u0e17\u0e33\u0e40\u0e2a\u0e23\u0e47\u0e08 {done} \u0e08\u0e32\u0e01 {total} \u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19", doneWord: "\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e41\u0e25\u0e49\u0e27", resumeWord: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e15\u0e48\u0e2d",
  notStarted: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e40\u0e23\u0e34\u0e48\u0e21", freeBadge: "\u0e1f\u0e23\u0e35", premiumBadge: "\u0e1e\u0e23\u0e35\u0e40\u0e21\u0e35\u0e22\u0e21", comingSoon: "\u0e40\u0e23\u0e47\u0e27\u0e46 \u0e19\u0e35\u0e49",
  savedOnDevice: "\u0e04\u0e27\u0e32\u0e21\u0e04\u0e37\u0e1a\u0e2b\u0e19\u0e49\u0e32\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e44\u0e27\u0e49\u0e43\u0e19\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e19\u0e35\u0e49\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19", signInToKeep: "\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e01\u0e47\u0e1a\u0e44\u0e27\u0e49",
  reviewLesson: "\u0e17\u0e1a\u0e17\u0e27\u0e19\u0e1a\u0e17\u0e17\u0e35\u0e48 {n}", startLesson: "\u0e40\u0e23\u0e34\u0e48\u0e21\u0e1a\u0e17\u0e17\u0e35\u0e48 {n}", resumeLesson: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e1a\u0e17\u0e17\u0e35\u0e48 {n} \u0e15\u0e48\u0e2d",
  lessonsDone: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e40\u0e2a\u0e23\u0e47\u0e08 {done} \u0e08\u0e32\u0e01 {total} \u0e1a\u0e17", continueLesson: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e1a\u0e17\u0e17\u0e35\u0e48 {n} \u0e15\u0e48\u0e2d", reviewWord: "\u0e17\u0e1a\u0e17\u0e27\u0e19",
  billingHeading: "Nicelingo Premium", receiptEmail: "\u0e2d\u0e35\u0e40\u0e21\u0e25\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08",
  monthlyPlan: "\u0e23\u0e32\u0e22\u0e40\u0e14\u0e37\u0e2d\u0e19", yearlyPlan: "\u0e23\u0e32\u0e22\u0e1b\u0e35", subscribeMonthly: "\u0e2a\u0e21\u0e31\u0e04\u0e23\u0e23\u0e32\u0e22\u0e40\u0e14\u0e37\u0e2d\u0e19",
  subscribeYearly: "\u0e2a\u0e21\u0e31\u0e04\u0e23\u0e23\u0e32\u0e22\u0e1b\u0e35", cancelAnytime: "\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e44\u0e14\u0e49\u0e17\u0e38\u0e01\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e08\u0e32\u0e01\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e2b\u0e23\u0e37\u0e2d\u0e2b\u0e19\u0e49\u0e32\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13",
  twoMonthsFree: "\u0e1f\u0e23\u0e35\u0e2a\u0e2d\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e08\u0e48\u0e32\u0e22\u0e04\u0e23\u0e31\u0e49\u0e07\u0e40\u0e14\u0e35\u0e22\u0e27\u0e15\u0e48\u0e2d\u0e1b\u0e35",
  promptpayText30: "\u0e08\u0e48\u0e32\u0e22\u0e04\u0e23\u0e31\u0e49\u0e07\u0e40\u0e14\u0e35\u0e22\u0e27\u0e14\u0e49\u0e27\u0e22 QR \u0e08\u0e32\u0e01\u0e41\u0e2d\u0e1b\u0e18\u0e19\u0e32\u0e04\u0e32\u0e23\u0e44\u0e17\u0e22 Premium 30 \u0e27\u0e31\u0e19 \u0e44\u0e21\u0e48\u0e15\u0e48\u0e2d\u0e2d\u0e32\u0e22\u0e38\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34",
  promptpayText365: "\u0e08\u0e48\u0e32\u0e22\u0e04\u0e23\u0e31\u0e49\u0e07\u0e40\u0e14\u0e35\u0e22\u0e27\u0e14\u0e49\u0e27\u0e22 QR \u0e08\u0e32\u0e01\u0e41\u0e2d\u0e1b\u0e18\u0e19\u0e32\u0e04\u0e32\u0e23\u0e44\u0e17\u0e22 Premium 365 \u0e27\u0e31\u0e19 \u0e44\u0e21\u0e48\u0e15\u0e48\u0e2d\u0e2d\u0e32\u0e22\u0e38\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34",
  payWithPromptPay: "\u0e08\u0e48\u0e32\u0e22\u0e14\u0e49\u0e27\u0e22 PromptPay", paymentsNote: "\u0e01\u0e32\u0e23\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19\u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22\u0e1c\u0e48\u0e32\u0e19 Stripe \u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e2b\u0e23\u0e37\u0e2d\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e44\u0e14\u0e49\u0e17\u0e38\u0e01\u0e40\u0e21\u0e37\u0e48\u0e2d:",
  manageSubscription: "\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01", backToLessons: "\u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19",
  subscribedHeading: "\u0e2a\u0e21\u0e31\u0e04\u0e23\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27", subscribedText: "\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08 \u0e17\u0e38\u0e01\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e41\u0e25\u0e49\u0e27",
  startLearning: "\u0e40\u0e23\u0e34\u0e48\u0e21\u0e40\u0e23\u0e35\u0e22\u0e19", almostHeading: "\u0e40\u0e01\u0e37\u0e2d\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e41\u0e25\u0e49\u0e27…",
  almostText: "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e01\u0e32\u0e23\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19 \u0e43\u0e0a\u0e49\u0e40\u0e27\u0e25\u0e32\u0e40\u0e1e\u0e35\u0e22\u0e07\u0e44\u0e21\u0e48\u0e01\u0e35\u0e48\u0e27\u0e34\u0e19\u0e32\u0e17\u0e35 \u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19\u0e41\u0e25\u0e49\u0e27\u0e08\u0e30\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34",
  cancelledHeading: "\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19", cancelledText: "\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e32\u0e23\u0e40\u0e23\u0e35\u0e22\u0e01\u0e40\u0e01\u0e47\u0e1a\u0e40\u0e07\u0e34\u0e19 \u0e2b\u0e19\u0e48\u0e27\u0e22\u0e17\u0e35\u0e48 1 \u0e22\u0e31\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19\u0e1f\u0e23\u0e35\u0e44\u0e14\u0e49\u0e40\u0e2a\u0e21\u0e2d",
  createAccountHeading: "\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e1f\u0e23\u0e35\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13", nameLabel: "\u0e0a\u0e37\u0e48\u0e2d", emailLabel: "\u0e2d\u0e35\u0e40\u0e21\u0e25",
  passwordLabel: "\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19", createAccountBtn: "\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e1f\u0e23\u0e35", alreadyRegistered: "\u0e21\u0e35\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27?",
  signInHeading: "\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a", welcomeBack: "\u0e22\u0e34\u0e19\u0e14\u0e35\u0e15\u0e49\u0e2d\u0e19\u0e23\u0e31\u0e1a\u0e01\u0e25\u0e31\u0e1a", forgotPassword: "\u0e25\u0e37\u0e21\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19?",
  newToNicelingo: "\u0e40\u0e1e\u0e34\u0e48\u0e07\u0e23\u0e39\u0e49\u0e08\u0e31\u0e01 Nicelingo?", yourAccount: "\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13",
  premiumAccountLine: "\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e17\u0e35\u0e48 1 (\u0e1a\u0e17\u0e17\u0e35\u0e48 1-4) \u0e40\u0e23\u0e35\u0e22\u0e19\u0e1f\u0e23\u0e35 \u0e15\u0e31\u0e49\u0e07\u0e41\u0e15\u0e48\u0e1a\u0e17\u0e17\u0e35\u0e48 5 \u0e15\u0e49\u0e2d\u0e07\u0e43\u0e0a\u0e49 Premium",
  premiumBtn: "Premium — $3/\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e2b\u0e23\u0e37\u0e2d $29/\u0e1b\u0e35", subscribeManageLine: "\u0e2a\u0e21\u0e31\u0e04\u0e23 \u0e08\u0e31\u0e14\u0e01\u0e32\u0e23 \u0e2b\u0e23\u0e37\u0e2d\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13",
  studentsBtn: "\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19", studentsLine: "\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e41\u0e25\u0e30\u0e14\u0e39\u0e04\u0e27\u0e32\u0e21\u0e04\u0e37\u0e1a\u0e2b\u0e19\u0e49\u0e32\u0e02\u0e2d\u0e07\u0e1e\u0e27\u0e01\u0e40\u0e02\u0e32", signOut: "\u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a",
  backToLanguages: "\u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e20\u0e32\u0e29\u0e32", guestBrowse: "\u0e04\u0e38\u0e13\u0e01\u0e33\u0e25\u0e31\u0e07\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19\u0e41\u0e1a\u0e1a\u0e1c\u0e39\u0e49\u0e40\u0e22\u0e35\u0e48\u0e22\u0e21\u0e0a\u0e21 \u0e2a\u0e23\u0e49\u0e32\u0e07\u0e1a\u0e31\u0e0d\u0e0a\u0e35\u0e1f\u0e23\u0e35\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e04\u0e27\u0e32\u0e21\u0e04\u0e37\u0e1a\u0e2b\u0e19\u0e49\u0e32",
  signedInAs: "\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a\u0e43\u0e19\u0e0a\u0e37\u0e48\u0e2d {email}", tapToStart: "\u0e41\u0e15\u0e30\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e23\u0e34\u0e48\u0e21", lessonsCount: "{n} \u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19", pillDone: "\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e41\u0e25\u0e49\u0e27", pillNext: "\u0e15\u0e48\u0e2d\u0e44\u0e1b", devManifest: "\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19", devScore: "\u0e01\u0e32\u0e23\u0e43\u0e2b\u0e49\u0e04\u0e30\u0e41\u0e19\u0e19\u0e01\u0e32\u0e23\u0e2d\u0e2d\u0e01\u0e40\u0e2a\u0e35\u0e22\u0e07", devProgress: "\u0e04\u0e27\u0e32\u0e21\u0e04\u0e37\u0e1a\u0e2b\u0e19\u0e49\u0e32\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13 (\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a\u0e01\u0e48\u0e2d\u0e19)", devAnonymous: "\u0e25\u0e2d\u0e07\u0e43\u0e0a\u0e49\u0e42\u0e14\u0e22\u0e44\u0e21\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e21\u0e35\u0e1a\u0e31\u0e0d\u0e0a\u0e35", devHealth: "\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23", backToNicelingo: "\u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b Nicelingo", goPremium: "\u0e2a\u0e21\u0e31\u0e04\u0e23 Premium", photosCount: "{n} \u0e20\u0e32\u0e1e", stepsShort: "{n} \u0e02\u0e31\u0e49\u0e19\u0e15\u0e2d\u0e19\u0e2a\u0e31\u0e49\u0e19\u0e46", premiumOpens: "Premium \u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e17\u0e38\u0e01\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19\u0e43\u0e19\u0e23\u0e32\u0e04\u0e32 {monthly} \u0e2b\u0e23\u0e37\u0e2d {yearly}", everyLessonPrice: "\u0e17\u0e38\u0e01\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19 {monthly} \u0e2b\u0e23\u0e37\u0e2d {yearly}", premiumOpensLang: "Premium \u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e17\u0e38\u0e01\u0e1a\u0e17\u0e40\u0e23\u0e35\u0e22\u0e19\u0e20\u0e32\u0e29\u0e32{name}\u0e43\u0e19\u0e23\u0e32\u0e04\u0e32 {monthly} \u0e2b\u0e23\u0e37\u0e2d {yearly}", monthlyPrice: "$3/\u0e40\u0e14\u0e37\u0e2d\u0e19", thbMonthlyPrice: "THB 99/\u0e40\u0e14\u0e37\u0e2d\u0e19", thbYearlyPrice: "THB 990/\u0e1b\u0e35", yearlyPrice: "$29/\u0e1b\u0e35", level1Only: "(\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e23\u0e30\u0e14\u0e31\u0e1a 1)", dayStreak: "\u0e15\u0e48\u0e2d\u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07 {n} \u0e27\u0e31\u0e19", badgesTitle: "\u0e40\u0e2b\u0e23\u0e35\u0e22\u0e0d\u0e23\u0e32\u0e07\u0e27\u0e31\u0e25", unitsDone: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e08\u0e1a {n} \u0e2b\u0e19\u0e48\u0e27\u0e22", nextBadgeOne: "\u0e40\u0e2b\u0e23\u0e35\u0e22\u0e0d\u0e16\u0e31\u0e14\u0e44\u0e1b\u0e2b\u0e25\u0e31\u0e07\u0e2d\u0e35\u0e01 {n} \u0e2b\u0e19\u0e48\u0e27\u0e22", nextBadgeOther: "\u0e40\u0e2b\u0e23\u0e35\u0e22\u0e0d\u0e16\u0e31\u0e14\u0e44\u0e1b\u0e2b\u0e25\u0e31\u0e07\u0e2d\u0e35\u0e01 {n} \u0e2b\u0e19\u0e48\u0e27\u0e22", progressTitle: "\u0e04\u0e27\u0e32\u0e21\u0e01\u0e49\u0e32\u0e27\u0e2b\u0e19\u0e49\u0e32\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13", streakKeepLine: "\u0e1d\u0e36\u0e01\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e23\u0e31\u0e01\u0e29\u0e32\u0e2a\u0e15\u0e23\u0e35\u0e04", streakDoneLine: "\u0e1d\u0e36\u0e01\u0e41\u0e25\u0e49\u0e27\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49 \u2014 \u0e01\u0e25\u0e31\u0e1a\u0e21\u0e32\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e23\u0e31\u0e01\u0e29\u0e32\u0e2a\u0e15\u0e23\u0e35\u0e04", streakStartLine: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e2b\u0e19\u0e36\u0e48\u0e07\u0e1a\u0e17\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e23\u0e34\u0e48\u0e21\u0e2a\u0e15\u0e23\u0e35\u0e04", badgeHowTo: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e08\u0e1a {n} \u0e2b\u0e19\u0e48\u0e27\u0e22\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e23\u0e31\u0e1a\u0e40\u0e2b\u0e23\u0e35\u0e22\u0e0d\u0e19\u0e35\u0e49", badgeHowToOne: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e08\u0e1a {n} \u0e2b\u0e19\u0e48\u0e27\u0e22\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e23\u0e31\u0e1a\u0e40\u0e2b\u0e23\u0e35\u0e22\u0e0d\u0e19\u0e35\u0e49", phrasesLearned: "\u0e40\u0e23\u0e35\u0e22\u0e19\u0e23\u0e39\u0e49 {n} \u0e27\u0e25\u0e35\u0e41\u0e25\u0e49\u0e27", signInStreak: "\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e44\u0e21\u0e48\u0e43\u0e2b\u0e49\u0e2a\u0e15\u0e23\u0e35\u0e04 {n} \u0e27\u0e31\u0e19\u0e2b\u0e32\u0e22\u0e44\u0e1b", backToCourse: "\u0e01\u0e25\u0e31\u0e1a\u0e44\u0e1b\u0e17\u0e35\u0e48\u0e04\u0e2d\u0e23\u0e4c\u0e2a",
  terms: "\u0e02\u0e49\u0e2d\u0e01\u0e33\u0e2b\u0e19\u0e14",
  privacy: "\u0e04\u0e27\u0e32\u0e21\u0e40\u0e1b\u0e47\u0e19\u0e2a\u0e48\u0e27\u0e19\u0e15\u0e31\u0e27",
  refunds: "\u0e01\u0e32\u0e23\u0e04\u0e37\u0e19\u0e40\u0e07\u0e34\u0e19",
  contact: "\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d",
  helpAndContact: "\u0e04\u0e27\u0e32\u0e21\u0e0a\u0e48\u0e27\u0e22\u0e40\u0e2b\u0e25\u0e37\u0e2d\u0e41\u0e25\u0e30\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d",
  appLanguage: "\u0e20\u0e32\u0e29\u0e32\u0e02\u0e2d\u0e07\u0e41\u0e2d\u0e1b",
};

const zh: UiDict = {
  signIn: "\u767b\u5f55", account: "\u8d26\u6237", students: "\u5b66\u751f", developers: "\u5f00\u53d1\u8005",
  freeAccount: "\u514d\u8d39\u8d26\u6237", interfaceLanguage: "\u754c\u9762\u8bed\u8a00",
  heroEyebrow: "\u770b\u4e00\u770b，\u542c\u4e00\u542c，\u8bf4\u4e00\u8bf4。", heroTitle: "\u4f60\u60f3\u5b66\u4ec0\u4e48？",
  heroLede: "\u6bcf\u8282\u8bfe\u5c06\u516b\u5f20\u56fe\u7247\u4e0e\u97f3\u9891\u914d\u5bf9，\u7136\u540e\u4e3a\u4f60\u7684\u53d1\u97f3\u6253\u5206。",
  freeLine: "\u7b2c\u4e00\u5355\u5143（\u7b2c1-4\u8bfe）\u514d\u8d39。\u7b2c5\u8bfe\u8d77\u9700\u8981 Premium。",
  hearIt: "\u542c\u4e00\u542c", sayIt: "\u8bf4\u4e00\u8bf4", chooseLanguage: "\u9009\u62e9\u8bed\u8a00",
  stepsHeading: "\u6bcf\u8282\u8bfe\u56db\u4e2a\u6b65\u9aa4",
  stepListen: "\u542c", stepListenText: "\u542c\u4e00\u53e5\u8bdd，\u9009\u62e9\u5bf9\u5e94\u7684\u56fe\u7247。",
  stepMatch: "\u914d\u5bf9", stepMatchText: "\u770b\u56fe\u7247，\u9009\u62e9\u5bf9\u5e94\u7684\u53e5\u5b50。",
  stepSpeak: "\u8bf4", stepSpeakText: "\u5927\u58f0\u8bf4\u51fa\u53e5\u5b50，\u83b7\u5f97\u53d1\u97f3\u8bc4\u5206。",
  stepWrite: "\u5199", stepWriteText: "\u8bfb\u53e5\u5b50，\u8f93\u5165\u7f3a\u5c11\u7684\u5355\u8bcd。",
  bandTitle: "\u7b2c\u4e00\u5355\u5143\u514d\u8d39。", seePlans: "\u67e5\u770b\u5957\u9910", keepGoingHeading: "\u7ee7\u7eed\u52a0\u6cb9！",
  orStartAnother: "\u6216\u5f00\u59cb\u53e6\u4e00\u95e8", courseComplete: "\u8bfe\u7a0b\u5b8c\u6210",
  niceWorkNext: "\u592a\u68d2\u4e86！\u4e0b\u4e00\u8bfe", finishedFreeUnit: "\u4f60\u5b8c\u6210\u4e86\u514d\u8d39\u5355\u5143。",
  unlockEveryLesson: "\u89e3\u9501\u6240\u6709\u8bfe\u7a0b", startHere: "\u4ece\u8fd9\u91cc\u5f00\u59cb", startHereFree: "\u4ece\u8fd9\u91cc\u5f00\u59cb · \u514d\u8d39",
  keepGoingLabel: "\u7ee7\u7eed\u52a0\u6cb9！", continueLabel: "\u7ee7\u7eed", lessonWord: "\u8bfe", unitWord: "\u5355\u5143",
  stepsComplete: "\u5df2\u5b8c\u6210 {total} \u6b65\u4e2d\u7684 {done} \u6b65", doneWord: "\u5b8c\u6210", resumeWord: "\u7ee7\u7eed",
  notStarted: "\u672a\u5f00\u59cb", freeBadge: "\u514d\u8d39", premiumBadge: "Premium", comingSoon: "\u5373\u5c06\u63a8\u51fa",
  savedOnDevice: "\u4f60\u7684\u8fdb\u5ea6\u53ea\u4fdd\u5b58\u5728\u8fd9\u53f0\u8bbe\u5907\u4e0a。", signInToKeep: "\u767b\u5f55\u5373\u53ef\u4fdd\u5b58",
  reviewLesson: "\u590d\u4e60\u7b2c{n}\u8bfe", startLesson: "\u5f00\u59cb\u7b2c{n}\u8bfe", resumeLesson: "\u7ee7\u7eed\u7b2c{n}\u8bfe",
  lessonsDone: "\u5df2\u5b8c\u6210 {total} \u8bfe\u4e2d\u7684 {done} \u8bfe", continueLesson: "\u7ee7\u7eed\u7b2c{n}\u8bfe", reviewWord: "\u590d\u4e60",
  billingHeading: "Nicelingo Premium", receiptEmail: "\u63a5\u6536\u6536\u636e\u7684\u90ae\u7bb1",
  monthlyPlan: "\u6708\u5ea6", yearlyPlan: "\u5e74\u5ea6", subscribeMonthly: "\u6309\u6708\u8ba2\u9605",
  subscribeYearly: "\u6309\u5e74\u8ba2\u9605", cancelAnytime: "\u53ef\u968f\u65f6\u901a\u8fc7\u6536\u636e\u6216\u8d26\u6237\u9875\u9762\u53d6\u6d88。",
  twoMonthsFree: "\u6bcf\u5e74\u4ed8\u4e00\u6b21，\u514d\u8d39\u4e24\u4e2a\u6708。",
  promptpayText30: "\u901a\u8fc7\u6cf0\u56fd\u94f6\u884c\u5e94\u7528\u626b\u7801\u652f\u4ed8\u4e00\u6b21。Premium 30\u5929，\u4e0d\u81ea\u52a8\u7eed\u8d39。",
  promptpayText365: "\u901a\u8fc7\u6cf0\u56fd\u94f6\u884c\u5e94\u7528\u626b\u7801\u652f\u4ed8\u4e00\u6b21。Premium 365\u5929，\u4e0d\u81ea\u52a8\u7eed\u8d39。",
  payWithPromptPay: "\u4f7f\u7528 PromptPay \u652f\u4ed8", paymentsNote: "\u4ed8\u6b3e\u7531 Stripe \u5b89\u5168\u5904\u7406。\u968f\u65f6\u7ba1\u7406\u6216\u53d6\u6d88：",
  manageSubscription: "\u7ba1\u7406\u8ba2\u9605", backToLessons: "\u8fd4\u56de\u8bfe\u7a0b",
  subscribedHeading: "\u8ba2\u9605\u6210\u529f", subscribedText: "\u4ed8\u6b3e\u5b8c\u6210。\u6240\u6709\u8bfe\u7a0b\u5df2\u89e3\u9501。",
  startLearning: "\u5f00\u59cb\u5b66\u4e60", almostHeading: "\u9a6c\u4e0a\u5c31\u597d…",
  almostText: "\u6b63\u5728\u786e\u8ba4\u4f60\u7684\u4ed8\u6b3e，\u901a\u5e38\u53ea\u9700\u51e0\u79d2。\u8fd4\u56de\u8bfe\u7a0b\u540e\u4f1a\u81ea\u52a8\u89e3\u9501。",
  cancelledHeading: "\u7ed3\u8d26\u5df2\u53d6\u6d88", cancelledText: "\u672a\u4ea7\u751f\u4efb\u4f55\u8d39\u7528。\u7b2c\u4e00\u5355\u5143\u968f\u65f6\u514d\u8d39。",
  createAccountHeading: "\u521b\u5efa\u514d\u8d39\u8d26\u6237", nameLabel: "\u59d3\u540d", emailLabel: "\u90ae\u7bb1",
  passwordLabel: "\u5bc6\u7801", createAccountBtn: "\u521b\u5efa\u514d\u8d39\u8d26\u6237", alreadyRegistered: "\u5df2\u6709\u8d26\u6237？",
  signInHeading: "\u767b\u5f55", welcomeBack: "\u6b22\u8fce\u56de\u6765。", forgotPassword: "\u5fd8\u8bb0\u5bc6\u7801？",
  newToNicelingo: "\u7b2c\u4e00\u6b21\u4f7f\u7528 Nicelingo？", yourAccount: "\u4f60\u7684\u8d26\u6237",
  premiumAccountLine: "\u7b2c\u4e00\u5355\u5143（\u7b2c1-4\u8bfe）\u514d\u8d39。\u7b2c5\u8bfe\u8d77\u9700\u8981 Premium。",
  premiumBtn: "Premium — $3/\u6708 \u6216 $29/\u5e74", subscribeManageLine: "\u8ba2\u9605、\u7ba1\u7406\u6216\u53d6\u6d88\u4f60\u7684\u8ba2\u9605。",
  studentsBtn: "\u5b66\u751f", studentsLine: "\u5173\u8054\u5b66\u751f\u5e76\u67e5\u770b\u4ed6\u4eec\u7684\u8fdb\u5ea6。", signOut: "\u9000\u51fa\u767b\u5f55",
  backToLanguages: "\u8fd4\u56de\u8bed\u8a00\u9009\u62e9", guestBrowse: "\u4f60\u6b63\u5728\u4ee5\u8bbf\u5ba2\u8eab\u4efd\u6d4f\u89c8。\u521b\u5efa\u514d\u8d39\u8d26\u6237\u5373\u53ef\u4fdd\u5b58\u8fdb\u5ea6。",
  signedInAs: "\u5df2\u767b\u5f55：{email}。", tapToStart: "\u70b9\u6309\u5f00\u59cb", lessonsCount: "{n}\u8282\u8bfe", pillDone: "\u5b8c\u6210", pillNext: "\u4e0b\u4e00\u6b65", devManifest: "\u8bfe\u7a0b\u6e05\u5355", devScore: "\u53d1\u97f3\u8bc4\u5206", devProgress: "\u4f60\u7684\u8fdb\u5ea6（\u8bf7\u5148\u767b\u5f55）", devAnonymous: "\u65e0\u9700\u8d26\u6237\u8bd5\u7528", devHealth: "\u670d\u52a1\u72b6\u6001", backToNicelingo: "\u8fd4\u56de Nicelingo", goPremium: "\u5f00\u901a Premium", photosCount: "{n} \u5f20\u7167\u7247", stepsShort: "{n} \u4e2a\u77ed\u6b65\u9aa4", premiumOpens: "Premium \u4ee5 {monthly} \u6216 {yearly} \u89e3\u9501\u6240\u6709\u8bfe\u7a0b。", everyLessonPrice: "\u6240\u6709\u8bfe\u7a0b {monthly} \u6216 {yearly}。", premiumOpensLang: "Premium \u4ee5 {monthly} \u6216 {yearly} \u89e3\u9501\u6240\u6709{name}\u8bfe\u7a0b。", monthlyPrice: "$3/\u6708", thbMonthlyPrice: "THB 99/\u6708", thbYearlyPrice: "THB 990/\u5e74", yearlyPrice: "$29/\u5e74", level1Only: "(\u4ec5\u7b2c1\u7ea7)", dayStreak: "\u8fde\u7eed\u5b66\u4e60 {n} \u5929", badgesTitle: "\u5fbd\u7ae0", unitsDone: "\u5df2\u5b8c\u6210 {n} \u4e2a\u5355\u5143", nextBadgeOne: "\u518d\u5b8c\u6210 {n} \u4e2a\u5355\u5143\u83b7\u5f97\u4e0b\u4e00\u679a\u5fbd\u7ae0", nextBadgeOther: "\u518d\u5b8c\u6210 {n} \u4e2a\u5355\u5143\u83b7\u5f97\u4e0b\u4e00\u679a\u5fbd\u7ae0", progressTitle: "\u4f60\u7684\u8fdb\u5ea6", streakKeepLine: "\u4eca\u5929\u7ec3\u4e00\u7ec3\uff0c\u4fdd\u6301\u8fde\u5b66", streakDoneLine: "\u4eca\u5929\u5df2\u7ec3\u4e60 \u2014 \u660e\u5929\u56de\u6765\u7ee7\u7eed\u4fdd\u6301", streakStartLine: "\u4eca\u5929\u5b66\u4e00\u8bfe\uff0c\u5f00\u542f\u4f60\u7684\u8fde\u5b66", badgeHowTo: "\u5b8c\u6210 {n} \u4e2a\u5355\u5143\u5373\u53ef\u83b7\u5f97\u6b64\u5fbd\u7ae0", badgeHowToOne: "\u5b8c\u6210 {n} \u4e2a\u5355\u5143\u5373\u53ef\u83b7\u5f97\u6b64\u5fbd\u7ae0", phrasesLearned: "\u5df2\u5b66\u4f1a {n} \u4e2a\u77ed\u8bed", signInStreak: "\u767b\u5f55\u5373\u53ef\u4fdd\u4f4f\u4f60\u7684 {n} \u5929\u8fde\u5b66\u7eaa\u5f55", backToCourse: "\u8fd4\u56de\u8bfe\u7a0b",
  terms: "\u6761\u6b3e",
  privacy: "\u9690\u79c1",
  refunds: "\u9000\u6b3e",
  contact: "\u8054\u7cfb",
  helpAndContact: "\u5e2e\u52a9\u4e0e\u8054\u7cfb",
  appLanguage: "\u5e94\u7528\u8bed\u8a00",
};

export const STRINGS: Record<UiLang, UiDict> = { en, es, de, fr, th, zh };

export function t(lang: UiLang): UiDict {
  return STRINGS[lang] ?? en;
}

/** Badge teaser with correct singular/plural: "Next badge after N
 *  more unit(s)" where N counts down from the next tier. */
export function nextBadgeText(ui: UiLang, done: number, target: number): string {
  const d = t(ui);
  const n = Math.max(target - done, 1);
  return fmt(n === 1 ? d.nextBadgeOne : d.nextBadgeOther, { n });
}

// ---- Curriculum title localization (unit + lesson titles) ----
// Titles are built from a small atom vocabulary, so they localize by
// translating atoms and reassembling with the language's joiners.
const UNIT_ATOMS: Record<string, Partial<Record<UiLang, string>>> = {
  Yesterday: { es: "Ayer", de: "Gestern", fr: "Hier", th: "\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e27\u0e32\u0e19", zh: "\u6628\u5929" },
  Tomorrow: { es: "Mañana", de: "Morgen", fr: "Demain", th: "\u0e1e\u0e23\u0e38\u0e48\u0e07\u0e19\u0e35\u0e49", zh: "\u660e\u5929" },
  Once: { es: "Antes", de: "Einst", fr: "Autrefois", th: "\u0e04\u0e23\u0e31\u0e49\u0e07\u0e2b\u0e19\u0e36\u0e48\u0e07", zh: "\u66fe\u7ecf" },
  Would: { es: "Querría", de: "Würde", fr: "Voudrait", th: "\u0e2d\u0e22\u0e32\u0e01\u0e08\u0e30", zh: "\u60f3\u8981" },
  Asking: { es: "Preguntando", de: "Fragen", fr: "Questions", th: "\u0e01\u0e32\u0e23\u0e16\u0e32\u0e21", zh: "\u63d0\u95ee" },
  Likes: { es: "Gustos", de: "Vorlieben", fr: "Goûts", th: "\u0e04\u0e27\u0e32\u0e21\u0e0a\u0e2d\u0e1a", zh: "\u559c\u597d" },
  People: { es: "Gente", de: "Menschen", fr: "Gens", th: "\u0e1c\u0e39\u0e49\u0e04\u0e19", zh: "\u4eba\u4eec" },
  "More People": { es: "Más gente", de: "Mehr Menschen", fr: "Plus de gens", th: "\u0e1c\u0e39\u0e49\u0e04\u0e19\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21", zh: "\u66f4\u591a\u4eba" },
  Animals: { es: "Animales", de: "Tiere", fr: "Animaux", th: "\u0e2a\u0e31\u0e15\u0e27\u0e4c", zh: "\u52a8\u7269" },
  "More Animals": { es: "Más animales", de: "Mehr Tiere", fr: "Plus d'animaux", th: "\u0e2a\u0e31\u0e15\u0e27\u0e4c\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21", zh: "\u66f4\u591a\u52a8\u7269" },
  Athletes: { es: "Atletas", de: "Sportler", fr: "Athlètes", th: "\u0e19\u0e31\u0e01\u0e01\u0e35\u0e2c\u0e32", zh: "\u8fd0\u52a8\u5458" },
  Musicians: { es: "Músicos", de: "Musiker", fr: "Musiciens", th: "\u0e19\u0e31\u0e01\u0e14\u0e19\u0e15\u0e23\u0e35", zh: "\u97f3\u4e50\u5bb6" },
  Elders: { es: "Mayores", de: "Ältere", fr: "Aînés", th: "\u0e1c\u0e39\u0e49\u0e2a\u0e39\u0e07\u0e2d\u0e32\u0e22\u0e38", zh: "\u957f\u8f88" },
  Helpers: { es: "Ayudantes", de: "Helfer", fr: "Aides", th: "\u0e1c\u0e39\u0e49\u0e0a\u0e48\u0e27\u0e22", zh: "\u5e2e\u624b" },
  Pets: { es: "Mascotas", de: "Haustiere", fr: "Animaux de compagnie", th: "\u0e2a\u0e31\u0e15\u0e27\u0e4c\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07", zh: "\u5ba0\u7269" },
  Workers: { es: "Trabajadores", de: "Arbeiter", fr: "Travailleurs", th: "\u0e04\u0e19\u0e17\u0e33\u0e07\u0e32\u0e19", zh: "\u5de5\u4eba" },
  "More Workers": { es: "Más trabajadores", de: "Mehr Arbeiter", fr: "Plus de travailleurs", th: "\u0e04\u0e19\u0e17\u0e33\u0e07\u0e32\u0e19\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21", zh: "\u66f4\u591a\u5de5\u4eba" },
  Family: { es: "Familia", de: "Familie", fr: "Famille", th: "\u0e04\u0e23\u0e2d\u0e1a\u0e04\u0e23\u0e31\u0e27", zh: "\u5bb6\u5ead" },
  "First Words": { es: "Primeras palabras", de: "Erste Wörter", fr: "Premiers mots", th: "\u0e04\u0e33\u0e41\u0e23\u0e01", zh: "\u6700\u521d\u7684\u8bcd\u8bed" },
  "Daily Actions": { es: "Acciones diarias", de: "Alltagsaktionen", fr: "Actions quotidiennes", th: "\u0e01\u0e34\u0e08\u0e27\u0e31\u0e15\u0e23\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e27\u0e31\u0e19", zh: "\u65e5\u5e38\u6d3b\u52a8" },
  Feelings: { es: "Sentimientos", de: "Gefühle", fr: "Sentiments", th: "\u0e04\u0e27\u0e32\u0e21\u0e23\u0e39\u0e49\u0e2a\u0e36\u0e01", zh: "\u611f\u53d7" },
  "Life & Fun": { es: "Vida y diversión", de: "Leben & Spaß", fr: "Vie et plaisir", th: "\u0e0a\u0e35\u0e27\u0e34\u0e15\u0e41\u0e25\u0e30\u0e04\u0e27\u0e32\u0e21\u0e2a\u0e19\u0e38\u0e01", zh: "\u751f\u6d3b\u4e0e\u4e50\u8da3" },
  More: { es: "Más", de: "Mehr", fr: "Plus", th: "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21", zh: "\u66f4\u591a" },
};

export function localizeUnitTitle(ui: UiLang, title: string): string {
  if (ui === "en" || !isUiLang(ui)) return title;
  const joiner = ui === "es" ? " y " : ui === "de" ? " & " : ui === "fr" ? " et " : ui === "th" ? " \u0e41\u0e25\u0e30 " : "\u548c";
  const parts = title.split(" · ");
  const out: string[] = [];
  for (const part of parts) {
    const atoms = part.split(" & ");
    const translated: string[] = [];
    for (const atom of atoms) {
      const hit = UNIT_ATOMS[atom]?.[ui];
      if (!hit) return title;
      translated.push(hit);
    }
    out.push(translated.join(joiner));
  }
  return out.join(" · ");
}

const LEVEL_TITLES: Record<string, Partial<Record<UiLang, string>>> = {
  Beginner: { es: "Principiante", de: "Anfänger", fr: "Débutant", th: "\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19", zh: "\u521d\u7ea7" },
  Elementary: { es: "Elemental", de: "Grundlagen", fr: "Élémentaire", th: "\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e1e\u0e37\u0e49\u0e19\u0e10\u0e32\u0e19", zh: "\u57fa\u7840" },
  Intermediate: { es: "Intermedio", de: "Mittelstufe", fr: "Intermédiaire", th: "\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e01\u0e25\u0e32\u0e07", zh: "\u4e2d\u7ea7" },
  "Upper-Intermediate": { es: "Intermedio alto", de: "Obere Mittelstufe", fr: "Intermédiaire supérieur", th: "\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e01\u0e25\u0e32\u0e07\u0e2a\u0e39\u0e07", zh: "\u4e2d\u9ad8\u7ea7" },
  Advanced: { es: "Avanzado", de: "Fortgeschritten", fr: "Avancé", th: "\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e2a\u0e39\u0e07", zh: "\u9ad8\u7ea7" },
};

export function localizeLevelTitle(ui: UiLang, title: string): string {
  if (ui === "en") return title;
  return LEVEL_TITLES[title]?.[ui] ?? title;
}

// Verb atoms for lesson titles: [es gerund, es past, es future, de/fr
// infinitive, th base, zh base]. Past/future in th/zh derive by rule.
const VERB_ATOMS: Record<string, [string, string, string, string, string, string, string]> = {
  Eating: ["comiendo", "comió", "comerá", "essen", "manger", "\u0e01\u0e34\u0e19", "\u5403"],
  Drinking: ["bebiendo", "bebió", "beberá", "trinken", "boire", "\u0e14\u0e37\u0e48\u0e21", "\u559d"],
  Reading: ["leyendo", "leyó", "leerá", "lesen", "lire", "\u0e2d\u0e48\u0e32\u0e19", "\u8bfb"],
  Writing: ["escribiendo", "escribió", "escribirá", "schreiben", "écrire", "\u0e40\u0e02\u0e35\u0e22\u0e19", "\u5199"],
  Running: ["corriendo", "corrió", "correrá", "rennen", "courir", "\u0e27\u0e34\u0e48\u0e07", "\u8dd1"],
  Sleeping: ["durmiendo", "durmió", "dormirá", "schlafen", "dormir", "\u0e19\u0e2d\u0e19", "\u7761"],
  Walking: ["caminando", "caminó", "caminará", "gehen", "marcher", "\u0e40\u0e14\u0e34\u0e19", "\u8d70"],
  Swimming: ["nadando", "nadó", "nadará", "schwimmen", "nager", "\u0e27\u0e48\u0e32\u0e22\u0e19\u0e49\u0e33", "\u6e38\u6cf3"],
  Cooking: ["cocinando", "cocinó", "cocinará", "kochen", "cuisiner", "\u0e17\u0e33\u0e2d\u0e32\u0e2b\u0e32\u0e23", "\u505a\u996d"],
  Playing: ["jugando", "jugó", "jugará", "spielen", "jouer", "\u0e40\u0e25\u0e48\u0e19", "\u73a9"],
  Working: ["trabajando", "trabajó", "trabajará", "arbeiten", "travailler", "\u0e17\u0e33\u0e07\u0e32\u0e19", "\u5de5\u4f5c"],
  Shopping: ["comprando", "compró", "comprará", "einkaufen", "faire les courses", "\u0e0a\u0e49\u0e2d\u0e1b\u0e1b\u0e34\u0e49\u0e07", "\u8d2d\u7269"],
  Laughing: ["riendo", "se rió", "se reirá", "lachen", "rire", "\u0e2b\u0e31\u0e27\u0e40\u0e23\u0e32\u0e30", "\u7b11"],
  Crying: ["llorando", "lloró", "llorará", "weinen", "pleurer", "\u0e23\u0e49\u0e2d\u0e07\u0e44\u0e2b\u0e49", "\u54ed"],
  Jumping: ["saltando", "saltó", "saltará", "springen", "sauter", "\u0e01\u0e23\u0e30\u0e42\u0e14\u0e14", "\u8df3"],
  Talking: ["hablando", "habló", "hablará", "sprechen", "parler", "\u0e1e\u0e39\u0e14", "\u8bf4\u8bdd"],
  Listening: ["escuchando", "escuchó", "escuchará", "zuhören", "écouter", "\u0e1f\u0e31\u0e07", "\u542c"],
  Clapping: ["aplaudiendo", "aplaudió", "aplaudirá", "klatschen", "applaudir", "\u0e15\u0e1a\u0e21\u0e37\u0e2d", "\u62cd\u624b"],
  Waving: ["saludando", "saludó", "saludará", "winken", "saluer", "\u0e42\u0e1a\u0e01\u0e21\u0e37\u0e2d", "\u6325\u624b"],
  Diving: ["buceando", "buceó", "buceará", "tauchen", "plonger", "\u0e14\u0e33\u0e19\u0e49\u0e33", "\u8df3\u6c34"],
  Smiling: ["sonriendo", "sonrió", "sonreirá", "lächeln", "sourire", "\u0e22\u0e34\u0e49\u0e21", "\u5fae\u7b11"],
  Dancing: ["bailando", "bailó", "bailará", "tanzen", "danser", "\u0e40\u0e15\u0e49\u0e19", "\u8df3\u821e"],
  Singing: ["cantando", "cantó", "cantará", "singen", "chanter", "\u0e23\u0e49\u0e2d\u0e07\u0e40\u0e1e\u0e25\u0e07", "\u5531\u6b4c"],
  Drawing: ["dibujando", "dibujó", "dibujará", "zeichnen", "dessiner", "\u0e27\u0e32\u0e14\u0e23\u0e39\u0e1b", "\u753b\u753b"],
  Hiding: ["escondiendo", "escondió", "esconderá", "sich verstecken", "se cacher", "\u0e0b\u0e48\u0e2d\u0e19", "\u8eb2\u85cf"],
};
const PAST_TO_GERUND: Record<string, string> = {
  Ate: "Eating", Drank: "Drinking", Read: "Reading", Wrote: "Writing", Ran: "Running",
  Slept: "Sleeping", Walked: "Walking", Swam: "Swimming", Cooked: "Cooking", Played: "Playing",
  Worked: "Working", Shopped: "Shopping", Laughed: "Laughing", Cried: "Crying", Jumped: "Jumping",
  Talked: "Talking", Listened: "Listening", Clapped: "Clapping", Waved: "Waving", Dove: "Diving",
  Smiled: "Smiling", Danced: "Dancing", Sang: "Singing", Drew: "Drawing", Hid: "Hiding",
};
const BASE_TO_GERUND: Record<string, string> = Object.fromEntries(
  Object.entries(PAST_TO_GERUND).map(([past, ger]) => {
    const base: Record<string, string> = { Ate: "Eat", Drank: "Drink", Read: "Read", Wrote: "Write", Ran: "Run", Slept: "Sleep", Walked: "Walk", Swam: "Swim", Cooked: "Cook", Played: "Play", Worked: "Work", Shopped: "Shop", Laughed: "Laugh", Cried: "Cry", Jumped: "Jump", Talked: "Talk", Listened: "Listen", Clapped: "Clap", Waved: "Wave", Dove: "Dive", Smiled: "Smile", Danced: "Dance", Sang: "Sing", Drew: "Draw", Hid: "Hide" };
    return [base[past], ger];
  }),
);

function verbForm(ui: UiLang, gerund: string, form: "present" | "past" | "future" | "continuous"): string | null {
  const v = VERB_ATOMS[gerund];
  if (!v) return null;
  if (ui === "es") return form === "past" ? v[1] : form === "future" ? v[2] : v[0];
  if (ui === "de") return v[3];
  if (ui === "fr") return v[4];
  if (ui === "th") return form === "future" ? `\u0e08\u0e30${v[5]}` : form === "continuous" ? `\u0e01\u0e33\u0e25\u0e31\u0e07${v[5]}` : v[5];
  if (ui === "zh") return form === "future" ? `\u5c06${v[6]}` : form === "continuous" ? `\u6b63\u5728${v[6]}` : v[6];
  return gerund;
}

export function localizeLessonTitle(ui: UiLang, title: string): string {
  if (ui === "en" || !isUiLang(ui)) return title;
  const question = title.endsWith("?");
  let body = question ? title.slice(0, -1) : title;
  const joiner = ui === "es" ? " y " : ui === "de" ? " & " : ui === "fr" ? " et " : ui === "th" ? " \u0e41\u0e25\u0e30 " : "\u548c";
  // Like & Want: <Gerund>
  if (body.startsWith("Like & Want: ")) {
    const ger = body.slice("Like & Want: ".length);
    const hit = verbForm(ui, ger, "present");
    if (!hit) return title;
    const prefix = ui === "es" ? "Gustar y querer: " : ui === "de" ? "Mögen & wollen: " : ui === "fr" ? "Aimer et vouloir : " : ui === "th" ? "\u0e0a\u0e2d\u0e1a\u0e41\u0e25\u0e30\u0e2d\u0e22\u0e32\u0e01: " : "\u559c\u6b22\u548c\u60f3\u8981：";
    return prefix + hit + (question ? "?" : "");
  }
  let animals = "";
  if (body.startsWith("Animals ")) {
    animals = ui === "es" ? "Animales " : ui === "de" ? "Tiere " : ui === "fr" ? "Animaux " : ui === "th" ? "\u0e2a\u0e31\u0e15\u0e27\u0e4c " : "\u52a8\u7269";
    body = body.slice("Animals ".length);
  }
  let form: "present" | "past" | "future" | "continuous" = "present";
  if (body.startsWith("Were ")) { form = "continuous"; body = body.slice(5); }
  else if (body.startsWith("Will ")) { form = "future"; body = body.slice(5); }
  // After Were/Will the second verb may stay gerund ("Were Eating & Drinking")
  // or become base; handle each token by dictionary lookup.
  const tokens = body.split(" & ");
  const out: string[] = [];
  for (const tok of tokens) {
    let ger: string | undefined;
    let tokForm: "present" | "past" | "future" | "continuous" = form;
    if (VERB_ATOMS[tok]) ger = tok;
    else if (PAST_TO_GERUND[tok]) { ger = PAST_TO_GERUND[tok]; if (form === "present") tokForm = "past"; }
    else if (BASE_TO_GERUND[tok]) ger = BASE_TO_GERUND[tok];
    if (!ger) return title;
    const hit = verbForm(ui, ger, tokForm);
    if (!hit) return title;
    out.push(hit);
  }
  // de/fr infinitive titles read better capitalised for de.
  const joined = out.join(joiner);
  return animals + joined + (question ? "?" : "");
}

// Course-language names in each UI language (for coverage lists).
const LANG_NAMES: Record<string, Partial<Record<UiLang, string>>> = {
  en: { es: "Inglés", de: "Englisch", fr: "Anglais", th: "\u0e2d\u0e31\u0e07\u0e01\u0e24\u0e29", zh: "\u82f1\u8bed" },
  es: { en: "Spanish", es: "Español", de: "Spanisch", fr: "Espagnol", th: "\u0e2a\u0e40\u0e1b\u0e19", zh: "\u897f\u73ed\u7259\u8bed" },
  fr: { en: "French", es: "Francés", de: "Französisch", fr: "Français", th: "\u0e1d\u0e23\u0e31\u0e48\u0e07\u0e40\u0e28\u0e2a", zh: "\u6cd5\u8bed" },
  de: { en: "German", es: "Alemán", de: "Deutsch", fr: "Allemand", th: "\u0e40\u0e22\u0e2d\u0e23\u0e21\u0e31\u0e19", zh: "\u5fb7\u8bed" },
  zh: { en: "Mandarin", es: "Chino mandarín", de: "Mandarin", fr: "Mandarin", th: "\u0e08\u0e35\u0e19\u0e01\u0e25\u0e32\u0e07", zh: "\u666e\u901a\u8bdd" },
  th: { en: "Thai", es: "Tailandés", de: "Thailändisch", fr: "Thaï", zh: "\u6cf0\u8bed" },
  xx: {}, yy: {},
};

export function localizeLangName(ui: UiLang, code: string, fallback: string): string {
  if (ui === "en") return fallback;
  if (code === ui) {
    // A language's own name for itself (Español, Français, ...).
    const self: Partial<Record<UiLang, string>> = { es: "Español", de: "Deutsch", fr: "Français", th: "\u0e44\u0e17\u0e22", zh: "\u4e2d\u6587" };
    return self[ui] ?? fallback;
  }
  return LANG_NAMES[code]?.[ui] ?? fallback;
}

export function andWord(ui: UiLang): string {
  return ui === "es" ? "y" : ui === "de" ? "und" : ui === "fr" ? "et" : ui === "th" ? "\u0e41\u0e25\u0e30" : ui === "zh" ? "\u548c" : "and";
}
