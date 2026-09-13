"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { ManagerInput, buildManagerReport } from "@/lib/leadership360";
import { PrintButton } from "./PrintButton";

export type ExperienceReport = Omit<ReturnType<typeof buildManagerReport>, "manager"> & {
  manager: Omit<ManagerInput, "id">;
};

type Chapter = "start" | "results" | "themes" | "voices" | "plan";
type ResultLens = "profile" | "priorities" | "cohorts";
type ThemeLens = "questions" | "cohorts" | "comments";
type VoiceLens = "strengths" | "development" | "other";

const chapterItems: Array<{ id: Chapter; number: string; label: string; hash: string }> = [
  { id: "start", number: "01", label: "Start here", hash: "welcome" },
  { id: "results", number: "02", label: "My results", hash: "overview" },
  { id: "themes", number: "03", label: "Explore themes", hash: "themes" },
  { id: "voices", number: "04", label: "Colleague voices", hash: "feedback" },
  { id: "plan", number: "05", label: "My plan", hash: "action-plan" },
];

const repeatedThemes = {
  strengths: [
    ["Inclusive and respectful leadership", 8],
    ["Clarity of direction", 6],
    ["Cross-team collaboration", 5],
  ],
  development: [
    ["Delegation and space to lead", 6],
    ["Faster decision making", 5],
    ["Communication through change", 4],
  ],
} as const;

function formatScore(score: number | null) {
  return typeof score === "number" ? score.toFixed(1) : "Withheld";
}

function scorePosition(score: number | null) {
  return typeof score === "number" ? `${Math.max(0, Math.min(100, ((score - 1) / 4) * 100))}%` : "0%";
}

function ScoreBar({
  label,
  all,
  self,
  range,
  compact = false,
}: {
  label: string;
  all: number | null;
  self: number | null;
  range: { low: number; high: number } | null;
  compact?: boolean;
}) {
  if (typeof all !== "number") {
    return <div className="score-row score-row-withheld"><div className="score-label">{label}</div><div className="withheld-value">Withheld</div></div>;
  }
  const style = {
    "--all-score": scorePosition(all),
    "--self-score": scorePosition(self),
    "--range-start": scorePosition(range?.low ?? null),
    "--range-width": range ? `${((range.high - range.low) / 4) * 100}%` : "0%",
  } as CSSProperties;
  const description = `${label}. All colleagues ${formatScore(all)}${typeof self === "number" ? `, self ${formatScore(self)}` : ""}${range ? `, colleague-group score range ${range.low.toFixed(1)} to ${range.high.toFixed(1)}` : ", colleague-group range not shown"}.`;
  return (
    <div className={`score-row${compact ? " score-row-compact" : ""}`}>
      <div className="score-label">{label}</div>
      <div className="score-visual" style={style} role="img" aria-label={description}>
        <div className="score-track">
          <div className="score-fill" />
          {range ? <div className="score-range"><span /><span /></div> : null}
          {typeof self === "number" ? <div className="self-marker" /> : null}
        </div>
        <strong className="score-value">{all.toFixed(1)}</strong>
      </div>
    </div>
  );
}

function Axis() {
  return <div className="score-axis" aria-hidden="true"><span /><div>{[1, 2, 3, 4, 5].map((tick) => <span key={tick}>{tick}</span>)}</div></div>;
}

function Legend() {
  return (
    <div className="legend" aria-label="Chart legend">
      <span><i className="legend-all" />All colleagues</span>
      <span><i className="legend-self" />Self</span>
      <span><i className="legend-range" />Colleague-group score range</span>
      <p className="range-explainer">Range = the lowest to highest average score across colleague groups that can be shown without identifying a small group.</p>
    </div>
  );
}

function MetricCard({ value, label }: { value: string | number; label: string }) {
  return <div className="metric-card"><strong>{value}</strong><span>{label}</span></div>;
}

function CommentList({ comments, tone = "green" }: { comments: string[]; tone?: "green" | "navy" | "grey" }) {
  if (!comments.length) return <p className="empty-state">No comments were provided.</p>;
  return <ol className={`comment-list comment-list-${tone}`}>{comments.map((comment, index) => <li key={`${index}-${comment}`}>{comment}</li>)}</ol>;
}

function SegmentedControl<T extends string>({
  idBase,
  label,
  value,
  items,
  onChange,
}: {
  idBase: string;
  label: string;
  value: T;
  items: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!direction && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (currentIndex + direction + items.length) % items.length;
    const next = items[nextIndex];
    onChange(next.id);
    document.getElementById(`${idBase}-${next.id}-tab`)?.focus();
  }

  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button key={item.id} id={`${idBase}-${item.id}-tab`} type="button" role="tab" aria-controls={`${idBase}-${item.id}-panel`} aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} onClick={() => onChange(item.id)} onKeyDown={(event) => onKeyDown(event, index)}>{item.label}</button>
      ))}
    </div>
  );
}

function ChapterFooter({
  next,
  previous,
  onNavigate,
}: {
  next?: Chapter;
  previous?: Chapter;
  onNavigate: (chapter: Chapter) => void;
}) {
  return (
    <div className="chapter-footer">
      {previous ? <button type="button" className="chapter-back" onClick={() => onNavigate(previous)}>← {chapterItems.find((item) => item.id === previous)?.label}</button> : <span />}
      {next ? <button type="button" className="chapter-next" onClick={() => onNavigate(next)}>{chapterItems.find((item) => item.id === next)?.label} <span>→</span></button> : <PrintButton label="Print or save my report" />}
    </div>
  );
}

export function ReportExperience({ report }: { report: ExperienceReport }) {
  const illustrative = report.reportType === "illustrative";
  const [activeChapter, setActiveChapter] = useState<Chapter>("start");
  const [resultLens, setResultLens] = useState<ResultLens>("profile");
  const [activeThemeId, setActiveThemeId] = useState(report.themes[0]?.id ?? "");
  const [themeLens, setThemeLens] = useState<ThemeLens>("questions");
  const [voiceLens, setVoiceLens] = useState<VoiceLens>("strengths");

  const activeChapterIndex = chapterItems.findIndex((item) => item.id === activeChapter);
  const activeTheme = report.themes.find((theme) => theme.id === activeThemeId) ?? report.themes[0];
  const highest = report.priorities.strengths[0];
  const focus = report.priorities.development[0];
  const largestGap = useMemo(() => report.themes
    .flatMap((theme) => theme.questions)
    .filter((question) => typeof question.scope.allColleagues.score === "number" && typeof question.scope.self.score === "number")
    .map((question) => ({ ...question, gap: (question.scope.allColleagues.score as number) - (question.scope.self.score as number) }))
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0], [report.themes]);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (["overview", "priorities", "cohorts"].includes(hash)) setActiveChapter("results");
      else if (hash === "themes") setActiveChapter("themes");
      else if (hash === "feedback") setActiveChapter("voices");
      else if (hash === "action-plan") setActiveChapter("plan");
      else if (hash === "welcome") setActiveChapter("start");
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  function goToChapter(chapter: Chapter, hash?: string) {
    setActiveChapter(chapter);
    window.history.replaceState(null, "", `#${hash ?? chapterItems.find((item) => item.id === chapter)?.hash ?? "welcome"}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navClick(event: MouseEvent<HTMLAnchorElement>, chapter: Chapter, hash: string) {
    event.preventDefault();
    goToChapter(chapter, hash);
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-report">Skip to report</a>
      <aside className="report-nav" aria-label="Report navigation">
        <a className="brand" href="#welcome" onClick={(event) => navClick(event, "start", "welcome")} aria-label="Leadership 360 report home">
          <Image src="/site-logo.svg" alt="BNP Paribas Leasing Solutions" width={220} height={45} priority />
        </a>
        <div className="nav-manager">
          <span>Private leadership report</span>
          <strong>{report.manager.name}</strong>
          <small>{report.manager.reportPeriod}</small>
        </div>
        <nav>
          {chapterItems.map((item) => (
            <a key={item.id} href={`#${item.hash}`} onClick={(event) => navClick(event, item.id, item.hash)} aria-current={activeChapter === item.id ? "page" : undefined}>
              <span>{item.number}</span><em>{item.label}</em>
            </a>
          ))}
        </nav>
        <div className="nav-progress" aria-label={`Part ${activeChapterIndex + 1} of ${chapterItems.length}`}>
          <div><span style={{ width: `${((activeChapterIndex + 1) / chapterItems.length) * 100}%` }} /></div>
          <small>Part {activeChapterIndex + 1} of {chapterItems.length}</small>
        </div>
        <div className="nav-actions"><span className="confidential-pill">Confidential</span><PrintButton /></div>
      </aside>

      <main id="main-report">
        <section className={`chapter-panel start-chapter${activeChapter === "start" ? " is-active" : ""}`} id="welcome" aria-labelledby="report-title">
          <div className="welcome-stage">
            <div className="welcome-visual" role="img" aria-labelledby="report-title">
              <h1 id="report-title" className="visually-hidden">See the pattern. Choose what matters.</h1>
            </div>
            <div className="welcome-details">
              <div className="manager-lockup">
                <p className="eyebrow">Leadership 360 · {report.manager.reportPeriod}</p>
                <strong>{report.manager.name}</strong>
                <span>{report.manager.jobTitle}</span>
              </div>
              <p className="welcome-intro">A guided view of how your leadership is experienced—designed to move from evidence to one meaningful next step.</p>
              <div className="welcome-entry">
                <button className="primary-button" type="button" onClick={() => goToChapter("results")}><span>Begin my review</span><i>→</i></button>
                <p className="prototype-note">{illustrative ? "Illustrative data · Private report prototype" : "Confidential Leadership 360 report"}</p>
              </div>
            </div>
          </div>

          <div className="signal-stage">
            <div className="stage-heading">
              <div><p className="eyebrow">Your starting point</p><h2>Three signals worth noticing</h2></div>
              <p>These are prompts for reflection, not verdicts. Explore the evidence before deciding what matters most.</p>
            </div>
            <div className="signal-grid">
              <article className="signal-card signal-strength"><span>Signature strength</span><strong>{highest?.score.toFixed(1)}</strong><h3>{highest?.text}</h3><p>This is the clearest positive signal in your colleague feedback.</p></article>
              <article className="signal-card signal-tension"><span>Interesting tension</span><strong>{largestGap ? `${largestGap.gap > 0 ? "+" : ""}${largestGap.gap.toFixed(1)}` : "—"}</strong><h3>{largestGap?.text}</h3><p>{largestGap && largestGap.gap > 0 ? "Colleagues see more strength here than you gave yourself credit for." : "Your own view is more positive than the colleague picture."}</p></article>
              <article className="signal-card signal-focus"><span>Focus opportunity</span><strong>{focus?.score.toFixed(1)}</strong><h3>{focus?.text}</h3><p>This is the strongest candidate for deeper exploration—not simply the lowest number.</p></article>
            </div>
          <details className="method-note">
              <summary>Understanding your scores and this report</summary>
              <div className="method-grid">
                <p><strong>Level</strong><span>Which themes are strongest or lowest overall?</span></p>
                <p><strong>Gap</strong><span>Where do self and colleagues see performance differently?</span></p>
                <p><strong>Consistency</strong><span>Does the same message appear in scores and comments?</span></p>
                <p><strong>Privacy</strong><span>Small colleague groups are combined or not shown before anything is displayed.</span></p>
              </div>
              <div className="score-guide">
                <div>
                  <p className="eyebrow">The 1-5 scale</p>
                  <h3>What each score means</h3>
                  <p>Scores are averages, so use the overall pattern and written feedback rather than treating one number as a verdict.</p>
                </div>
                <dl className="score-scale">
                  <div><dt>5</dt><dd><strong>Highly effective</strong><span>Consistently demonstrated</span></dd></div>
                  <div><dt>4</dt><dd><strong>Effective</strong><span>Usually demonstrated</span></dd></div>
                  <div><dt>3</dt><dd><strong>Mixed</strong><span>Not consistently observed</span></dd></div>
                  <div><dt>2</dt><dd><strong>Needs improvement</strong><span>Often needs attention</span></dd></div>
                  <div><dt>1</dt><dd><strong>Priority to address</strong><span>Rarely demonstrated</span></dd></div>
                </dl>
              </div>
              <div className="calculation-guide">
                <p><strong>All colleagues</strong><span>The average of all valid colleague ratings. Your self assessment is not included, and groups with more valid ratings carry more weight.</span></p>
                <p><strong>Self assessment</strong><span>Your own rating, shown beside the colleague view to help identify differences in perspective.</span></p>
                <p><strong>Colleague-group score range</strong><span>The lowest to highest average among the colleague groups that can be displayed without identifying a small group.</span></p>
                <p><strong>Small differences</strong><span>Close scores often form a cluster. Check the comments, response coverage and your work context before deciding what to act on.</span></p>
              </div>
          </details>
          </div>
          <ChapterFooter next="results" onNavigate={goToChapter} />
        </section>

        <section className={`chapter-panel report-section${activeChapter === "results" ? " is-active" : ""}`} id="overview" aria-labelledby="overview-title">
          <div className="chapter-kicker"><span>02</span><p>My results</p></div>
          <div className="stage-heading">
            <div><p className="eyebrow">Executive overview</p><h2 id="overview-title">Understand the shape of your feedback</h2></div>
            <p>Start broad, then change the lens. You can compare the leadership profile, priority signals and how feedback differs across colleague groups without scrolling through separate sections.</p>
          </div>
          <SegmentedControl<ResultLens>
            idBase="results-lens"
            label="Results view"
            value={resultLens}
            onChange={setResultLens}
            items={[{ id: "profile", label: "Leadership profile" }, { id: "priorities", label: "Priorities" }, { id: "cohorts", label: "Group pattern" }]}
          />

          <div className={`lens-panel${resultLens === "profile" ? " is-active" : ""}`} id="results-lens-profile-panel" role="tabpanel" aria-labelledby="results-lens-profile-tab">
            <div className="profile-layout">
              <div className="profile-summary">
                <p className="eyebrow">Response picture</p>
                <h3>A strong overall profile, with useful variation underneath.</h3>
                <div className="metric-grid">
                  <MetricCard value={report.responseSummary.total} label="responses" />
                  <MetricCard value={report.responseSummary.colleagues} label="colleagues" />
                  <MetricCard value={formatScore(report.overview.allColleagues.score)} label="overall score" />
                </div>
                <blockquote>“The aim is not to optimise every score. It is to recognise the pattern you want to amplify—and the one habit worth changing.”</blockquote>
              </div>
              <div className="chart-card profile-chart">
                <div className="chart-card-title"><h3>Five-theme profile</h3><span>Average score, 1–5</span></div>
                <Axis />
                {report.themes.map((theme) => <ScoreBar key={theme.id} label={theme.name} all={theme.scope.allColleagues.score} self={theme.scope.self.score} range={theme.scope.range} />)}
                <Legend />
              </div>
            </div>
          </div>

          <div className={`lens-panel${resultLens === "priorities" ? " is-active" : ""}`} id="results-lens-priorities-panel" role="tabpanel" aria-labelledby="results-lens-priorities-tab">
            <div className="priority-grid">
              <article className="ranking-card ranking-strengths">
                <div className="ranking-head"><span>What to keep doing</span><strong>Continue</strong></div>
                <ol>{report.priorities.strengths.map((item) => <li key={item.id}><span>{item.text}</span><strong>{item.score.toFixed(1)}</strong></li>)}</ol>
              </article>
              <article className="ranking-card ranking-development">
                <div className="ranking-head"><span>What to explore</span><strong>Focus</strong></div>
                <ol>{report.priorities.development.map((item) => <li key={item.id}><span>{item.text}</span><strong>{item.score.toFixed(1)}</strong></li>)}</ol>
              </article>
            </div>
            <p className="context-note">Close scores form a cluster. Comments, role expectations and business context should determine the priority—not rank alone.</p>
          </div>

          <div className={`lens-panel${resultLens === "cohorts" ? " is-active" : ""}`} id="results-lens-cohorts-panel" role="tabpanel" aria-labelledby="results-lens-cohorts-tab">
            <div className="cohort-layout">
              <div className="chart-card">
                <div className="chart-card-title"><h3>Overall score by colleague group</h3><span>Average score, 1–5</span></div>
                {report.overview.cohortDetailStatus === "shown" ? (
                  <div className="cohort-bars"><Axis />{report.overview.cohorts.map((cohort) => {
                    const style = { "--cohort-score": scorePosition(cohort.score) } as CSSProperties;
                    return <div className="cohort-row" key={cohort.key}><div className="cohort-label"><span>{cohort.label}</span><small>n={cohort.respondents}</small></div><div className="cohort-visual" style={style} role="img" aria-label={`${cohort.label}, ${formatScore(cohort.score)}, ${cohort.respondents} valid respondents.`}><div className="cohort-track"><div /></div><strong>{formatScore(cohort.score)}</strong></div></div>;
                  })}</div>
                ) : <p className="withheld-panel">{report.overview.privacyNote}</p>}
              </div>
              <aside className="privacy-card"><span>Privacy applied</span><h3>Small groups are never exposed alone</h3><p>{report.overview.privacyNote}</p><p>Score ranges compare only colleague groups that remain visible after small groups are combined. Counts and component values that could identify someone are removed.</p></aside>
            </div>
          </div>
          <ChapterFooter previous="start" next="themes" onNavigate={goToChapter} />
        </section>

        <section className={`chapter-panel report-section themes-section${activeChapter === "themes" ? " is-active" : ""}`} id="themes" aria-labelledby="themes-title">
          <div className="chapter-kicker"><span>03</span><p>Explore themes</p></div>
          <div className="stage-heading">
            <div><p className="eyebrow">Leadership themes</p><h2 id="themes-title">Explore one theme at a time</h2></div>
            <p>Choose a leadership theme, then switch between the question pattern, colleague-group view and the comments connected to it.</p>
          </div>
          <div className="theme-workspace">
            <nav className="theme-picker" aria-label="Choose a leadership theme">
              {report.themes.map((theme) => (
                <button key={theme.id} type="button" aria-pressed={activeThemeId === theme.id} onClick={() => { setActiveThemeId(theme.id); setThemeLens("questions"); }}>
                  <span>{theme.number}</span><em>{theme.name}</em><strong>{formatScore(theme.scope.allColleagues.score)}</strong>
                </button>
              ))}
            </nav>
            <div className="theme-detail">
              {report.themes.map((theme) => {
                const themeComments = theme.questions.flatMap((question) => (report.comments.byQuestion[question.id] ?? []).map((comment) => ({ questionId: question.id, comment })));
                return (
                  <article className={`theme-content${activeTheme?.id === theme.id ? " is-active" : ""}`} key={theme.id}>
                    <header className="theme-header">
                      <div><p>Leadership theme {theme.number}</p><h3>{theme.name}</h3><span>{theme.description}</span></div>
                      <div className="theme-score"><strong>{formatScore(theme.scope.allColleagues.score)}</strong><span>colleague score</span></div>
                    </header>
                    <SegmentedControl<ThemeLens>
                      idBase={`${theme.id}-lens`}
                      label={`${theme.name} view`}
                      value={themeLens}
                      onChange={setThemeLens}
                      items={[{ id: "questions", label: "Question pattern" }, { id: "cohorts", label: "Colleague groups" }, { id: "comments", label: "Comments" }]}
                    />
                    <div className={`theme-lens${themeLens === "questions" ? " is-active" : ""}`} id={`${theme.id}-lens-questions-panel`} role="tabpanel" aria-labelledby={`${theme.id}-lens-questions-tab`}>
                      <div className="theme-metrics">
                        <MetricCard value={formatScore(theme.scope.allColleagues.score)} label="all colleagues" />
                        <MetricCard value={formatScore(theme.scope.self.score)} label="self assessment" />
                        <MetricCard value={theme.scope.range ? (theme.scope.range.high - theme.scope.range.low).toFixed(1) : "Not shown"} label="difference across visible groups" />
                      </div>
                      <div className="chart-card theme-chart">
                        <div className="chart-card-title"><h4>Question profile</h4><span>Average score, 1–5</span></div>
                        <Axis />
                        {theme.questions.map((question) => <ScoreBar key={question.id} label={`${question.id}  ${question.text}`} all={question.scope.allColleagues.score} self={question.scope.self.score} range={question.scope.range} compact />)}
                        <Legend />
                      </div>
                      <details className="exact-detail">
                        <summary>View exact question-by-group scores</summary>
                        <div className="exact-grid">{theme.questions.map((question) => <article key={question.id}><h5><span>{question.id}</span>{question.text}</h5><dl><div><dt>Self</dt><dd>{formatScore(question.scope.self.score)}</dd></div><div><dt>All colleagues</dt><dd>{formatScore(question.scope.allColleagues.score)}</dd></div>{question.scope.cohorts.map((cohort) => <div key={cohort.key}><dt>{cohort.label} <small>n={cohort.respondents}</small></dt><dd>{formatScore(cohort.score)}</dd></div>)}</dl>{question.scope.cohortDetailStatus === "withheld" ? <p className="withheld-copy">{question.scope.privacyNote}</p> : null}</article>)}</div>
                      </details>
                    </div>
                    <div className={`theme-lens${themeLens === "cohorts" ? " is-active" : ""}`} id={`${theme.id}-lens-cohorts-panel`} role="tabpanel" aria-labelledby={`${theme.id}-lens-cohorts-tab`}>
                      <div className="cohort-story">
                        <div><p className="eyebrow">Audience pattern</p><h4>How the theme lands with different colleagues</h4><p>Look for material differences, but avoid over-interpreting small movements between close scores.</p></div>
                        <div className="cohort-cards">{theme.scope.cohortDetailStatus === "shown" ? theme.scope.cohorts.map((cohort) => <article key={cohort.key}><span>{cohort.label}<small>n={cohort.respondents}</small></span><strong>{formatScore(cohort.score)}</strong></article>) : <p>{theme.scope.privacyNote}</p>}</div>
                      </div>
                    </div>
                    <div className={`theme-lens${themeLens === "comments" ? " is-active" : ""}`} id={`${theme.id}-lens-comments-panel`} role="tabpanel" aria-labelledby={`${theme.id}-lens-comments-tab`}>
                      <div className="theme-comments">
                        <div className="quote-lead"><p className="eyebrow">In their words</p><blockquote>{themeComments[0]?.comment ?? report.comments.privacyNote ?? "No comments were provided for this theme."}</blockquote></div>
                        <div className="quote-stack">{themeComments.map(({ questionId, comment }, index) => <blockquote key={`${questionId}-${index}`}><span>{questionId}</span><p>{comment}</p></blockquote>)}</div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          <ChapterFooter previous="results" next="voices" onNavigate={goToChapter} />
        </section>

        <section className={`chapter-panel report-section voices-section${activeChapter === "voices" ? " is-active" : ""}`} id="feedback" aria-labelledby="feedback-title">
          <div className="chapter-kicker"><span>04</span><p>Colleague voices</p></div>
          <div className="stage-heading">
            <div><p className="eyebrow">Written feedback</p><h2 id="feedback-title">Hear the themes behind the scores</h2></div>
            <p>Repeated ideas are summarised first. The verbatim comments remain available, but only one perspective is shown at a time.</p>
          </div>
          {report.comments.status === "withheld" ? <p className="withheld-panel">{report.comments.privacyNote}</p> : <div className="voice-overview">
            <article><p className="eyebrow">Strengths themes</p>{repeatedThemes.strengths.map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</article>
            <blockquote>“{report.comments.strengths[0]}”</blockquote>
            <article><p className="eyebrow eyebrow-navy">Development themes</p>{repeatedThemes.development.map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</article>
          </div>}
          <SegmentedControl<VoiceLens>
            idBase="voices-lens"
            label="Written feedback view"
            value={voiceLens}
            onChange={setVoiceLens}
            items={[{ id: "strengths", label: "Keep doing" }, { id: "development", label: "Focus next" }, { id: "other", label: "Additional context" }]}
          />
          <div className="voice-panel-wrap">
            <article className={`voice-panel${voiceLens === "strengths" ? " is-active" : ""}`} id="voices-lens-strengths-panel" role="tabpanel" aria-labelledby="voices-lens-strengths-tab"><p className="eyebrow">Keep doing</p><h3>Greatest strengths</h3><CommentList comments={report.comments.strengths} /></article>
            <article className={`voice-panel${voiceLens === "development" ? " is-active" : ""}`} id="voices-lens-development-panel" role="tabpanel" aria-labelledby="voices-lens-development-tab"><p className="eyebrow eyebrow-navy">Focus next</p><h3>Development areas</h3><CommentList comments={report.comments.development} tone="navy" /></article>
            <article className={`voice-panel${voiceLens === "other" ? " is-active" : ""}`} id="voices-lens-other-panel" role="tabpanel" aria-labelledby="voices-lens-other-tab"><p className="eyebrow eyebrow-grey">Additional context</p><h3>Other feedback</h3><CommentList comments={report.comments.other} tone="grey" /></article>
          </div>
          <div className="reflection-prompt"><span>Pause and reflect</span><p>Which message appears in both the numbers and the language people chose?</p></div>
          <ChapterFooter previous="themes" next="plan" onNavigate={goToChapter} />
        </section>

        <section className={`chapter-panel report-section action-section${activeChapter === "plan" ? " is-active" : ""}`} id="action-plan" aria-labelledby="action-title">
          <div className="chapter-kicker"><span>05</span><p>My plan</p></div>
          <div className="stage-heading">
            <div><p className="eyebrow">Next steps</p><h2 id="action-title">Turn one insight into visible change</h2></div>
            <p>Choose a small number of priorities. Notes stay only on this page and are not saved.</p>
          </div>
          <div className="plan-layout">
            <aside className="plan-prompts">
              <p className="eyebrow">Possible focus areas</p>
              <h3>Start with the evidence</h3>
              {report.priorities.development.slice(0, 3).map((item, index) => <article key={item.id}><span>0{index + 1}</span><p>{item.text}</p><strong>{item.score.toFixed(1)}</strong></article>)}
              <div className="action-note" role="note">This prototype does not persist anything you type. Print or save a private copy if needed.</div>
            </aside>
            <div className="plan-workspace">
              <div className="reflection-grid">
                <label>What is the one behaviour you want to change?<textarea placeholder="Name a specific, observable behaviour…" /></label>
                <label>What would colleagues notice if it improved?<textarea placeholder="Describe the visible difference…" /></label>
                <label>Who can give you honest feedback?<textarea placeholder="Choose a person and a moment to check in…" /></label>
              </div>
              <div className="action-table" role="group" aria-label="Three priority actions">
                {[1, 2, 3].map((number) => <div className="action-row" key={number}><span>{number}</span><label>Focus area<textarea aria-label={`Priority ${number} focus area`} /></label><label>First step<textarea aria-label={`Priority ${number} first step`} /></label><label>Evidence of progress<textarea aria-label={`Priority ${number} evidence of progress`} /></label><label>Review date<input type="text" aria-label={`Priority ${number} review date`} placeholder="DD / MM / YYYY" /></label></div>)}
              </div>
            </div>
          </div>
          <ChapterFooter previous="voices" onNavigate={goToChapter} />
        </section>

        <footer><Image src="/site-logo.svg" alt="" width={220} height={45} /><p><strong>Confidential</strong><span>{illustrative ? "Leadership 360 feedback · illustrative local prototype" : "Leadership 360 feedback report"}</span></p><a href="#welcome" onClick={(event) => navClick(event, "start", "welcome")}>Back to start</a></footer>
      </main>
    </div>
  );
}
