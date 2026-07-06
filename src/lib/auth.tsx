/**
 * localStorage-based auth + per-user, per-cat data store.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Cat {
  id: string;
  name: string;
  breed: string;
  age: string;
  photo?: string; // base64 data URL
  // ── Extended digital profile (Phase 1) ──────────────────────────────────
  dob?: string; // ISO date YYYY-MM-DD
  gender?: "male" | "female" | "unknown";
  weightKg?: number; // current weight snapshot (kept in sync loosely with weight logs)
  targetWeightKg?: number;
  color?: string;
  environment?: "indoor" | "outdoor" | "both";
  allergies?: string;
  existingDiseases?: string;
  medicalNotes?: string;
  microchipId?: string;
  neutered?: "yes" | "no" | "unknown";
  addedAt: string;
}

export interface WeightLog {
  id: string;
  catId: string;
  weight: number; // kg
  date: string; // ISO date string YYYY-MM-DD
  note?: string;
  loggedAt: string;
}

export interface SleepLog {
  id: string;
  catId: string;
  hours: number;
  activity: "sedentary" | "light" | "moderate" | "active";
  bcs: number;
  date: string;
  loggedAt: string;
}

export interface Meal {
  id: string;
  catId: string;
  time: string;
  label: string;
  food: string;
  brand: string;
  amount: string;
  reminder: boolean;
  createdAt: string;
}

export interface HydrationLog {
  id: string;
  catId: string;
  ml: number; // milliliters of water consumed
  date: string; // ISO date YYYY-MM-DD
  loggedAt: string;
}

export interface ChatMessage {
  id: string;
  catId: string;
  role: "assistant" | "user";
  text: string;
  actions?: { label: string; to: string }[];
  createdAt: string;
}

export interface VetRecord {
  id: string;
  catId: string;
  type: "vaccine" | "deworming" | "medical";
  name: string;
  date: string;
  status: "complete" | "due_soon" | "not_due";
  note?: string;
  createdAt: string;
}

export interface UserPreferences {
  units: "kg" | "lbs";
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY";
  notifVet: boolean;
  notifWeight: boolean;
  notifFeeding: boolean;
  browserNotifications: boolean; // native Notification API for feeding reminders while tab is open
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  authProvider?: "password" | "google"; // how this account was created/last signed in
  avatar?: string; // base64 data URL, user's profile picture
  phone?: string;
  country?: string;
  cats: Cat[];
  weightLogs: WeightLog[];
  sleepLogs: SleepLog[];
  meals: Meal[];
  vetRecords: VetRecord[];
  hydrationLogs: HydrationLog[];
  chatMessages: ChatMessage[];
  dismissedNotifications: string[]; // notification ids the user has dismissed
  preferences: UserPreferences;
  createdAt: string;
}

const DEFAULT_PREFS: UserPreferences = {
  units: "kg",
  dateFormat: "MM/DD/YYYY",
  notifVet: true,
  notifWeight: true,
  notifFeeding: false,
  browserNotifications: false,
};

interface AuthContextValue {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  loginWithGoogle: () => Promise<{ error?: string }>;
  logout: () => void;
  updateUser: (
    data: Partial<Pick<User, "name" | "preferences" | "avatar" | "phone" | "country">>,
  ) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error?: string }>;
  addCat: (cat: Omit<Cat, "id" | "addedAt">) => void;
  removeCat: (catId: string) => void;
  updateCat: (catId: string, data: Partial<Omit<Cat, "id" | "addedAt">>) => void;
  addWeightLog: (catId: string, weight: number, date: string, note?: string) => void;
  removeWeightLog: (logId: string) => void;
  addSleepLog: (
    catId: string,
    hours: number,
    activity: SleepLog["activity"],
    bcs: number,
    date: string,
  ) => void;
  addMeal: (catId: string, meal: Omit<Meal, "id" | "catId" | "createdAt">) => void;
  removeMeal: (mealId: string) => void;
  updateMeal: (mealId: string, data: Partial<Omit<Meal, "id" | "catId" | "createdAt">>) => void;
  addVetRecord: (catId: string, record: Omit<VetRecord, "id" | "catId" | "createdAt">) => void;
  removeVetRecord: (recordId: string) => void;
  updateVetRecord: (
    recordId: string,
    data: Partial<Omit<VetRecord, "id" | "catId" | "createdAt">>,
  ) => void;
  addHydrationLog: (catId: string, ml: number, date: string) => void;
  addChatMessage: (catId: string, msg: Omit<ChatMessage, "id" | "catId" | "createdAt">) => void;
  clearChatHistory: (catId: string) => void;
  dismissNotification: (notificationId: string) => void;
  deleteAllCatData: (catId: string) => void;
}

// ── Storage ───────────────────────────────────────────────────────────────────

const USERS_KEY = "cattwin_users";
const SESSION_KEY = "cattwin_session";

function getUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveUsers(users: User[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function getSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {
    return null;
  }
}
function saveSession(u: User | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  else localStorage.removeItem(SESSION_KEY);
}

function migrateUser(u: User): User {
  return {
    cats: [],
    weightLogs: [],
    sleepLogs: [],
    meals: [],
    vetRecords: [],
    hydrationLogs: [],
    chatMessages: [],
    dismissedNotifications: [],
    preferences: DEFAULT_PREFS,
    ...u,
    preferences: { ...DEFAULT_PREFS, ...(u.preferences ?? {}) },
  };
}

function hashPassword(p: string) {
  return btoa(encodeURIComponent(p));
}
function checkPassword(p: string, h: string) {
  return hashPassword(p) === h;
}
function uid() {
  return crypto.randomUUID();
}
function now() {
  return new Date().toISOString();
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  login: async () => ({}),
  signup: async () => ({}),
  loginWithGoogle: async () => ({}),
  logout: () => {},
  updateUser: () => {},
  changePassword: async () => ({}),
  addCat: () => {},
  removeCat: () => {},
  updateCat: () => {},
  addWeightLog: () => {},
  removeWeightLog: () => {},
  addSleepLog: () => {},
  addMeal: () => {},
  removeMeal: () => {},
  updateMeal: () => {},
  addVetRecord: () => {},
  removeVetRecord: () => {},
  updateVetRecord: () => {},
  addHydrationLog: () => {},
  addChatMessage: () => {},
  clearChatHistory: () => {},
  dismissNotification: () => {},
  deleteAllCatData: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const s = getSession();
    return s ? migrateUser(s) : null;
  });

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) {
        const s = getSession();
        setUser(s ? migrateUser(s) : null);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const commit = useCallback((updated: User) => {
    const migrated = migrateUser(updated);
    const existingUsers = getUsers();
    const hasExistingUser = existingUsers.some((u) => u.id === migrated.id);
    const users = hasExistingUser
      ? existingUsers.map((u) => (u.id === migrated.id ? migrated : u))
      : [...existingUsers, migrated];
    saveUsers(users);
    saveSession(migrated);
    setUser(migrated);
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function login(email: string, password: string) {
    await new Promise((r) => setTimeout(r, 800));
    const users = getUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) return { error: "No account found with that email. Did you mean to sign up?" };
    if (!checkPassword(password, found.passwordHash))
      return { error: "Incorrect password. Please try again." };
    const hydrated = migrateUser(found);
    saveSession(hydrated);
    setUser(hydrated);
    return {};
  }

  async function signup(name: string, email: string, password: string) {
    await new Promise((r) => setTimeout(r, 900));
    const users = getUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase()))
      return { error: "An account with that email already exists. Try signing in." };
    const newUser: User = migrateUser({
      id: uid(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      cats: [],
      weightLogs: [],
      sleepLogs: [],
      meals: [],
      vetRecords: [],
      hydrationLogs: [],
      chatMessages: [],
      dismissedNotifications: [],
      preferences: DEFAULT_PREFS,
      createdAt: now(),
    });
    saveUsers([...users, newUser]);
    saveSession(newUser);
    setUser(newUser);
    return {};
  }

  async function loginWithGoogle() {
    let profile: { uid: string; name: string; email: string; photoUrl: string | null };
    try {
      const { signInWithGoogle } = await import("./firebase");
      profile = await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed.";
      if (message.includes("not configured")) {
        return {
          error: "Google sign-in isn't set up yet. Add your Firebase config to .env first.",
        };
      }
      if (message.includes("popup-closed-by-user") || message.includes("cancelled-popup-request")) {
        return { error: "Sign-in was cancelled." };
      }
      return { error: message };
    }

    if (!profile.email)
      return { error: "Your Google account has no email address to sign in with." };

    const users = getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === profile.email.toLowerCase());

    if (existing) {
      const updated = migrateUser({
        ...existing,
        authProvider: "google",
        avatar: existing.avatar ?? profile.photoUrl ?? undefined,
      });
      commit(updated);
      return {};
    }

    const newUser: User = migrateUser({
      id: uid(),
      name: profile.name,
      email: profile.email.toLowerCase(),
      passwordHash: "", // no local password — this account signs in via Google only
      authProvider: "google",
      avatar: profile.photoUrl ?? undefined,
      cats: [],
      weightLogs: [],
      sleepLogs: [],
      meals: [],
      vetRecords: [],
      hydrationLogs: [],
      chatMessages: [],
      dismissedNotifications: [],
      preferences: DEFAULT_PREFS,
      createdAt: now(),
    });
    saveUsers([...users, newUser]);
    saveSession(newUser);
    setUser(newUser);
    return {};
  }

  function logout() {
    saveSession(null);
    setUser(null);
  }

  function updateUser(
    data: Partial<Pick<User, "name" | "preferences" | "avatar" | "phone" | "country">>,
  ) {
    if (!user) return;
    commit({ ...user, ...data, preferences: { ...user.preferences, ...(data.preferences ?? {}) } });
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user) return { error: "Not signed in." };
    await new Promise((r) => setTimeout(r, 700));
    if (!checkPassword(currentPassword, user.passwordHash))
      return { error: "Current password is incorrect." };
    if (newPassword.length < 8) return { error: "New password must be at least 8 characters." };
    commit({ ...user, passwordHash: hashPassword(newPassword) });
    return {};
  }

  // ── Cats ──────────────────────────────────────────────────────────────────

  function addCat(cat: Omit<Cat, "id" | "addedAt">) {
    if (!user) return;
    commit({ ...user, cats: [...user.cats, { ...cat, id: uid(), addedAt: now() }] });
  }

  function removeCat(catId: string) {
    if (!user) return;
    commit({ ...user, cats: user.cats.filter((c) => c.id !== catId) });
  }

  function updateCat(catId: string, data: Partial<Omit<Cat, "id" | "addedAt">>) {
    if (!user) return;
    commit({ ...user, cats: user.cats.map((c) => (c.id === catId ? { ...c, ...data } : c)) });
  }

  // ── Weight logs ───────────────────────────────────────────────────────────

  function addWeightLog(catId: string, weight: number, date: string, note?: string) {
    if (!user) return;
    const log: WeightLog = { id: uid(), catId, weight, date, note, loggedAt: now() };
    commit({ ...user, weightLogs: [...user.weightLogs, log] });
  }

  function removeWeightLog(logId: string) {
    if (!user) return;
    commit({ ...user, weightLogs: user.weightLogs.filter((l) => l.id !== logId) });
  }

  // ── Sleep / activity logs ─────────────────────────────────────────────────

  function addSleepLog(
    catId: string,
    hours: number,
    activity: SleepLog["activity"],
    bcs: number,
    date: string,
  ) {
    if (!user) return;
    const log: SleepLog = { id: uid(), catId, hours, activity, bcs, date, loggedAt: now() };
    commit({ ...user, sleepLogs: [...user.sleepLogs, log] });
  }

  // ── Meals ─────────────────────────────────────────────────────────────────

  function addMeal(catId: string, meal: Omit<Meal, "id" | "catId" | "createdAt">) {
    if (!user) return;
    commit({ ...user, meals: [...user.meals, { ...meal, id: uid(), catId, createdAt: now() }] });
  }

  function removeMeal(mealId: string) {
    if (!user) return;
    commit({ ...user, meals: user.meals.filter((m) => m.id !== mealId) });
  }

  function updateMeal(mealId: string, data: Partial<Omit<Meal, "id" | "catId" | "createdAt">>) {
    if (!user) return;
    commit({ ...user, meals: user.meals.map((m) => (m.id === mealId ? { ...m, ...data } : m)) });
  }

  // ── Vet records ───────────────────────────────────────────────────────────

  function addVetRecord(catId: string, record: Omit<VetRecord, "id" | "catId" | "createdAt">) {
    if (!user) return;
    commit({
      ...user,
      vetRecords: [...user.vetRecords, { ...record, id: uid(), catId, createdAt: now() }],
    });
  }

  function removeVetRecord(recordId: string) {
    if (!user) return;
    commit({ ...user, vetRecords: user.vetRecords.filter((r) => r.id !== recordId) });
  }

  function updateVetRecord(
    recordId: string,
    data: Partial<Omit<VetRecord, "id" | "catId" | "createdAt">>,
  ) {
    if (!user) return;
    commit({
      ...user,
      vetRecords: user.vetRecords.map((r) => (r.id === recordId ? { ...r, ...data } : r)),
    });
  }

  // ── Hydration logs ────────────────────────────────────────────────────────

  function addHydrationLog(catId: string, ml: number, date: string) {
    if (!user) return;
    const log: HydrationLog = { id: uid(), catId, ml, date, loggedAt: now() };
    commit({ ...user, hydrationLogs: [...user.hydrationLogs, log] });
  }

  // ── Chat memory ───────────────────────────────────────────────────────────

  function addChatMessage(catId: string, msg: Omit<ChatMessage, "id" | "catId" | "createdAt">) {
    if (!user) return;
    const message: ChatMessage = { ...msg, id: uid(), catId, createdAt: now() };
    // Cap history at 200 messages per cat to keep localStorage lean.
    const existing = user.chatMessages.filter((m) => m.catId === catId);
    const others = user.chatMessages.filter((m) => m.catId !== catId);
    const trimmed = [...existing, message].slice(-200);
    commit({ ...user, chatMessages: [...others, ...trimmed] });
  }

  function clearChatHistory(catId: string) {
    if (!user) return;
    commit({ ...user, chatMessages: user.chatMessages.filter((m) => m.catId !== catId) });
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  function dismissNotification(notificationId: string) {
    if (!user) return;
    if (user.dismissedNotifications.includes(notificationId)) return;
    commit({ ...user, dismissedNotifications: [...user.dismissedNotifications, notificationId] });
  }

  // ── Delete all cat data ───────────────────────────────────────────────────

  function deleteAllCatData(catId: string) {
    if (!user) return;
    commit({
      ...user,
      weightLogs: user.weightLogs.filter((l) => l.catId !== catId),
      sleepLogs: user.sleepLogs.filter((l) => l.catId !== catId),
      meals: user.meals.filter((m) => m.catId !== catId),
      vetRecords: user.vetRecords.filter((r) => r.catId !== catId),
      hydrationLogs: user.hydrationLogs.filter((h) => h.catId !== catId),
      chatMessages: user.chatMessages.filter((m) => m.catId !== catId),
      dismissedNotifications: user.dismissedNotifications.filter((id) => !id.includes(catId)),
    });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        login,
        signup,
        loginWithGoogle,
        logout,
        updateUser,
        changePassword,
        addCat,
        removeCat,
        updateCat,
        addWeightLog,
        removeWeightLog,
        addSleepLog,
        addMeal,
        removeMeal,
        updateMeal,
        addVetRecord,
        removeVetRecord,
        updateVetRecord,
        addHydrationLog,
        addChatMessage,
        clearChatHistory,
        dismissNotification,
        deleteAllCatData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
