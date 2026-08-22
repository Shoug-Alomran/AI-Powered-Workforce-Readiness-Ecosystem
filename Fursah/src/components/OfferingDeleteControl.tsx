"use client";

import { useState } from "react";
import { deleteOffering } from "@/actions/university";

export default function OfferingDeleteControl({ offeringId, offeringTitle }: { offeringId: string; offeringTitle: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return <button type="button" className="button danger" onClick={() => setConfirming(true)}>Delete offering</button>;
  }

  return <form action={deleteOffering}>
    <input type="hidden" name="offeringId" value={offeringId} />
    <p className="muted">Delete “{offeringTitle}” permanently?</p>
    <div className="actions">
      <button type="button" className="button secondary" onClick={() => setConfirming(false)}>Keep offering</button>
      <button type="submit" className="button danger">Delete permanently</button>
    </div>
  </form>;
}
