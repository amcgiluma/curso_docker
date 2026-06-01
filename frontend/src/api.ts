export interface LessonMeta {
  slug: string;
  title: string;
  order: number;
  summary: string;
  moduleSlug: string;
}

export interface ModuleMeta {
  slug: string;
  title: string;
  order: number;
  summary: string;
  lessons: LessonMeta[];
}

export interface Lesson extends LessonMeta {
  content: string;
}

interface StaticModule extends Omit<ModuleMeta, "lessons"> {
  lessons: Lesson[];
}

const API_BASE = "/api";

// La plataforma funciona en dos modos:
//   - "static": consume /content.json (deploy sin backend, p.ej. Vercel).
//   - "api":    consume el backend FastAPI en /api (local y Docker).
// Se autodetecta: si existe un content.json valido, se usa el modo estatico.
type Mode = "static" | "api";
let mode: Mode | null = null;
let staticModules: StaticModule[] | null = null;

async function detectMode(): Promise<Mode> {
  if (mode) return mode;
  try {
    const res = await fetch("/content.json", {
      headers: { Accept: "application/json" },
    });
    const ct = res.headers.get("content-type") ?? "";
    if (res.ok && ct.includes("application/json")) {
      const data = (await res.json()) as { modules: StaticModule[] };
      if (Array.isArray(data.modules)) {
        staticModules = data.modules;
        mode = "static";
        return mode;
      }
    }
  } catch {
    // No hay content.json: caemos al backend.
  }
  mode = "api";
  return mode;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Error ${res.status} al pedir ${path}`);
  }
  return (await res.json()) as T;
}

function stripContent(modules: StaticModule[]): ModuleMeta[] {
  return modules.map((m) => ({
    slug: m.slug,
    title: m.title,
    order: m.order,
    summary: m.summary,
    lessons: m.lessons.map((l) => ({
      slug: l.slug,
      title: l.title,
      order: l.order,
      summary: l.summary,
      moduleSlug: l.moduleSlug,
    })),
  }));
}

export async function fetchModules(): Promise<ModuleMeta[]> {
  if ((await detectMode()) === "static" && staticModules) {
    return stripContent(staticModules);
  }
  return getJson<ModuleMeta[]>("/modules");
}

export async function fetchLesson(
  moduleSlug: string,
  lessonSlug: string
): Promise<Lesson> {
  if ((await detectMode()) === "static" && staticModules) {
    const mod = staticModules.find((m) => m.slug === moduleSlug);
    const lesson = mod?.lessons.find((l) => l.slug === lessonSlug);
    if (!lesson) {
      throw new Error("Leccion no encontrada");
    }
    return lesson;
  }
  return getJson<Lesson>(`/lessons/${moduleSlug}/${lessonSlug}`);
}
