import { NavLink } from "react-router-dom";
import type { ModuleMeta } from "../api";
import { useProgress } from "../hooks/useProgress";

interface Props {
  modules: ModuleMeta[];
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ modules, open, onClose }: Props) {
  const { isDone, progress } = useProgress();

  const totalLessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  const doneCount = Object.keys(progress).length;
  const pct = totalLessons ? Math.round((doneCount / totalLessons) * 100) : 0;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r border-ink-600 bg-ink-900/95 backdrop-blur transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-ink-600 p-5">
          <NavLink to="/" onClick={onClose} className="flex items-center gap-3">
            <span className="text-2xl">🐳</span>
            <div>
              <p className="font-extrabold leading-tight text-white">
                Curso de Docker
              </p>
              <p className="text-xs text-slate-400">De experto a intocable</p>
            </div>
          </NavLink>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>Progreso</span>
              <span>
                {doneCount}/{totalLessons}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-ocean-500 to-ocean-300 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {modules.map((mod) => (
            <div key={mod.slug} className="mb-4">
              <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                {String(mod.order).padStart(2, "0")} · {mod.title}
              </p>
              <ul>
                {[...mod.lessons]
                  .sort((a, b) => a.order - b.order)
                  .map((lesson) => (
                    <li key={lesson.slug}>
                      <NavLink
                        to={`/m/${mod.slug}/${lesson.slug}`}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
                            isActive
                              ? "bg-ocean-600/20 text-white"
                              : "text-slate-300 hover:bg-ink-700/60 hover:text-white"
                          }`
                        }
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                            isDone(mod.slug, lesson.slug)
                              ? "bg-emerald-400"
                              : "bg-ink-600"
                          }`}
                        />
                        <span className="truncate">{lesson.title}</span>
                      </NavLink>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
