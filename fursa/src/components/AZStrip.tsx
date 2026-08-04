const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function AZStrip({
  activeLetter,
  availableLetters,
  buildHref,
}: {
  activeLetter: string | null;
  availableLetters: Set<string>;
  buildHref: (letter: string | null) => string;
}) {
  return (
    <div className="az-strip" aria-label="Filter by first letter">
      <a href={buildHref(null)} className={!activeLetter ? "active" : ""}>All</a>
      {LETTERS.map((letter) =>
        availableLetters.has(letter) ? (
          <a key={letter} href={buildHref(letter)} className={activeLetter === letter ? "active" : ""}>
            {letter}
          </a>
        ) : (
          <span key={letter} className="disabled">{letter}</span>
        )
      )}
    </div>
  );
}
