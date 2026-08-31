// usePreferences.ts — hook React cho preference (subscribe + set trong island).
import { useSyncExternalStore } from "react";
import {
  subscribePreferences,
  getPreferences,
  setPreferences,
  setUiMode,
  type Preferences,
  type UiMode,
} from "../services/preferenceStore";

export function usePreferences(): { prefs: Preferences; setUiMode: (m: UiMode) => void; setPrefs: typeof setPreferences } {
  const prefs = useSyncExternalStore(subscribePreferences, getPreferences, getPreferences);
  return { prefs, setUiMode, setPrefs: setPreferences };
}
