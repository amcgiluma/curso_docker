import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "curso-docker:progress";

type ProgressMap = Record<string, boolean>;

function read(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();
let cache: ProgressMap = read();

function emit() {
  cache = read();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", emit);
  };
}

function getSnapshot(): ProgressMap {
  return cache;
}

function lessonKey(moduleSlug: string, lessonSlug: string): string {
  return `${moduleSlug}/${lessonSlug}`;
}

export function useProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot);

  const isDone = useCallback(
    (moduleSlug: string, lessonSlug: string) =>
      Boolean(progress[lessonKey(moduleSlug, lessonSlug)]),
    [progress]
  );

  const toggle = useCallback((moduleSlug: string, lessonSlug: string) => {
    const next = read();
    const key = lessonKey(moduleSlug, lessonSlug);
    if (next[key]) {
      delete next[key];
    } else {
      next[key] = true;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emit();
  }, []);

  const setDone = useCallback(
    (moduleSlug: string, lessonSlug: string, done: boolean) => {
      const next = read();
      const key = lessonKey(moduleSlug, lessonSlug);
      if (done) {
        next[key] = true;
      } else {
        delete next[key];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      emit();
    },
    []
  );

  return { progress, isDone, toggle, setDone };
}
