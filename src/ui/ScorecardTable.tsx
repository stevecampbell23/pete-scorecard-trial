import { holeKind } from "../engine/scoring";
import { sum } from "../engine/id";
import type { Course } from "../types";
import { playerById, useStore } from "../store";

export function ScorecardTable({ course, scores }: { course: Course; scores: Record<string, number[]> }) {
  const { state } = useStore();
  const n = course.par.length;
  const ps = Object.keys(scores);
  const halves: Array<[number, number, string | null]> = n > 9 ? [[0, 9, "Out"], [9, n, "In"]] : [[0, n, null]];
  return (
    <>
      {halves.map(([a, b, lab]) => (
        <div className="sc" key={`${a}-${b}`}>
          <table>
            <thead>
              <tr>
                <th className="l">Hole</th>
                {course.par.slice(a, b).map((_, i) => (
                  <th key={i}>{a + i + 1}</th>
                ))}
                <th>{lab || "Tot"}</th>
                {lab === "In" ? <th>Tot</th> : null}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="l muted">Par</td>
                {course.par.slice(a, b).map((p, i) => (
                  <td key={i} className="muted">
                    {p}
                  </td>
                ))}
                <td className="muted">{sum(course.par.slice(a, b))}</td>
                {lab === "In" ? <td className="muted">{sum(course.par)}</td> : null}
              </tr>
              {ps.map((p) => {
                const s = scores[p];
                return (
                  <tr key={p}>
                    <td className="l">{playerById(state, p).name}</td>
                    {s.slice(a, b).map((v, i) => (
                      <td key={i}>
                        {v ? (
                          <span className={`mk ${holeKind(v, course.par[a + i] ?? 4)}`}>{v}</span>
                        ) : (
                          <span className="muted">·</span>
                        )}
                      </td>
                    ))}
                    <td className="t">{sum(s.slice(a, b))}</td>
                    {lab === "In" ? <td className="t">{sum(s)}</td> : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      <div className="legend">
        <span>Circle = birdie · Square = bogey · Red = snowman (8+)</span>
      </div>
    </>
  );
}
