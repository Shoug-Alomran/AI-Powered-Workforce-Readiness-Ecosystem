import { MIN_COHORT } from "@/lib/cohort";

/**
 * Marks a statistic that exists but is deliberately not shown, because fewer
 * than MIN_COHORT students fall in its reporting group.
 *
 * The point is that suppression has to be *visible*. Dropping the row instead
 * would read as "no data", which is a different and misleading claim: it hides
 * that a group exists and hides that a privacy control acted. Keeping the row
 * and naming the reason is what makes the control demonstrable.
 */
export default function SuppressedFigure({ label = "Withheld" }: { label?: string }) {
  return (
    <span
      className="pill status-pending suppressed-figure"
      title={`Fewer than ${MIN_COHORT} students fall in this reporting group, so the figure is withheld to prevent re-identification.`}
    >
      ⊘ {label}
    </span>
  );
}
