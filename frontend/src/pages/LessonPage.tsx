import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchLesson,
  normalizeSlug,
  type Lesson,
  type ModuleMeta,
} from "../api";
import { Markdown } from "../components/Markdown";
import { useProgress } from "../hooks/useProgress";

interface FlatLesson {
  moduleSlug: string;
  lessonSlug: string;
  title: string;
}

function flatten(modules: ModuleMeta[]): FlatLesson[] {
  return [...modules]
    .sort((a, b) => a.order - b.order)
    .flatMap((m) =>
      [...m.lessons]
        .sort((a, b) => a.order - b.order)
        .map((l) => ({
          moduleSlug: m.slug,
          lessonSlug: l.slug,
          title: l.title,
        }))
    );
}

export function LessonPage({ modules }: { modules: ModuleMeta[] }) {
  const { moduleSlug, lessonSlug } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isDone, toggle } = useProgress();

  const flat = useMemo(() => flatten(modules), [modules]);
  const routeLesson = useMemo(() => {
    if (!moduleSlug || !lessonSlug) return null;
    const exact = flat.find(
      (l) => l.moduleSlug === moduleSlug && l.lessonSlug === lessonSlug
    );
    if (exact) return exact;

    const normalizedModuleSlug = normalizeSlug(moduleSlug);
    const normalizedLessonSlug = normalizeSlug(lessonSlug);
    return (
      flat.find(
        (l) =>
          normalizeSlug(l.moduleSlug) === normalizedModuleSlug &&
          normalizeSlug(l.lessonSlug) === normalizedLessonSlug
      ) ?? null
    );
  }, [flat, moduleSlug, lessonSlug]);
  const activeModuleSlug = routeLesson?.moduleSlug ?? moduleSlug;
  const activeLessonSlug = routeLesson?.lessonSlug ?? lessonSlug;
  const idx = routeLesson ? flat.indexOf(routeLesson) : -1;
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;

  useEffect(() => {
    if (!activeModuleSlug || !activeLessonSlug) return;
    if (
      routeLesson &&
      (routeLesson.moduleSlug !== moduleSlug || routeLesson.lessonSlug !== lessonSlug)
    ) {
      navigate(`/m/${routeLesson.moduleSlug}/${routeLesson.lessonSlug}`, {
        replace: true,
      });
    }
    setLesson(null);
    setError(null);
    window.scrollTo({ top: 0 });
    fetchLesson(activeModuleSlug, activeLessonSlug)
      .then(setLesson)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Error desconocido")
      );
  }, [
    activeModuleSlug,
    activeLessonSlug,
    moduleSlug,
    lessonSlug,
    navigate,
    routeLesson,
  ]);

  if (error) {
    return (
      <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 text-amber-200">
        No se pudo cargar la leccion: {error}
      </div>
    );
  }

  if (!lesson || !activeModuleSlug || !activeLessonSlug) {
    return <p className="text-slate-400">Cargando leccion...</p>;
  }

  const done = isDone(activeModuleSlug, activeLessonSlug);

  return (
    <article>
      <Markdown content={lesson.content} />

      <div className="mt-10 flex items-center justify-between border-t border-ink-600 pt-5">
        <button
          type="button"
          onClick={() => toggle(activeModuleSlug, activeLessonSlug)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            done
              ? "border border-emerald-600 bg-emerald-600/20 text-emerald-300"
              : "border border-ink-600 bg-ink-700/60 text-slate-200 hover:border-ocean-500"
          }`}
        >
          {done ? "✓ Completada" : "Marcar como completada"}
        </button>
      </div>

      <nav className="mt-6 flex justify-between gap-4 text-sm">
        {prev ? (
          <Link
            to={`/m/${prev.moduleSlug}/${prev.lessonSlug}`}
            className="rounded-lg border border-ink-600 px-4 py-3 text-slate-300 transition hover:border-ocean-500 hover:text-white"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={`/m/${next.moduleSlug}/${next.lessonSlug}`}
            className="rounded-lg border border-ink-600 px-4 py-3 text-right text-slate-300 transition hover:border-ocean-500 hover:text-white"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
