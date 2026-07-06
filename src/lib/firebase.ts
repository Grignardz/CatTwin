/**
 * Firebase AI Logic client setup.
 *
 * This is the ONLY place the app talks to Gemini. Firebase AI Logic lets the
 * browser call Gemini directly — no custom backend needed — while keeping
 * the actual Gemini API key server-side inside Firebase. The values below
 * (from import.meta.env) are your Firebase *project config*, not a secret:
 * they identify your app to Firebase, they don't grant API access on their
 * own. Abuse protection comes from Firebase App Check (see initAppCheck()).
 *
 * Setup (one-time, in the Firebase console):
 *   1. Create a Firebase project at https://console.firebase.google.com
 *   2. Go to "AI Logic" in the console, click "Get started", choose the
 *      Gemini Developer API provider. Firebase creates & holds the Gemini
 *      key for you — you never paste it into this codebase.
 *   3. Register a Web app in Project Settings, copy the config values into
 *      .env (see .env.example) as VITE_FIREBASE_*.
 *   4. (Strongly recommended before shipping) Set up App Check with
 *      reCAPTCHA v3 and put the site key in VITE_RECAPTCHA_SITE_KEY.
 *   5. For Google sign-in: in the Firebase console go to Authentication >
 *      Sign-in method, enable the "Google" provider. Popup sign-in also
 *      requires the domain you're running on (e.g. localhost) to be listed
 *      under Authentication > Settings > Authorized domains (localhost is
 *      allowed by default).
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend, type AI } from "firebase/ai";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | undefined;
let ai: AI | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfigured) {
    throw new Error(
      "Firebase is not configured. Add VITE_FIREBASE_* values to your .env file (see .env.example).",
    );
  }
  if (!app) {
    app = initializeApp(firebaseConfig);

    // App Check protects your Gemini quota from abuse by unauthorized clients.
    // Safe to skip in local dev without a site key, but required before shipping.
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (recaptchaSiteKey && typeof window !== "undefined") {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }
  return app;
}

function getAiInstance(): AI {
  if (!ai) {
    ai = getAI(getFirebaseApp(), { backend: new GoogleAIBackend() });
  }
  return ai;
}

let auth: Auth | undefined;

function getAuthInstance(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export interface GoogleSignInResult {
  uid: string;
  name: string;
  email: string;
  photoUrl: string | null;
}

/** Opens the Google sign-in popup and returns the resulting profile. */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(getAuthInstance(), provider);
  const user: FirebaseUser = credential.user;
  return {
    uid: user.uid,
    name: user.displayName ?? user.email?.split("@")[0] ?? "Google user",
    email: user.email ?? "",
    photoUrl: user.photoURL,
  };
}

// Stable, non-preview model — supports text + image input, chat, and
// structured JSON output, which covers every AI feature in this app.
const MODEL_NAME = "gemini-2.5-flash";

export function getTextModel(systemInstruction?: string) {
  return getGenerativeModel(getAiInstance(), { model: MODEL_NAME, systemInstruction });
}

export function getJsonModel(schema: import("firebase/ai").Schema) {
  return getGenerativeModel(getAiInstance(), {
    model: MODEL_NAME,
    generationConfig: { responseMimeType: "application/json", responseSchema: schema },
  });
}
