"use client";

import { useMemo, useState } from "react";

type Track = { id: string; label: string };

// Maps a career label onto the broad field of study shown in the first select.
// Order matters: the first pattern that matches wins, so the more specific
// computing/business terms are tested before the generic "engineer" and
// "design" catch-alls (otherwise "Cloud Engineer" would land under Engineering
// and "Instructional Designer" under Design & Creative).
function majorFor(label: string) {
  if (/software|developer|comput|data|cyber|network|cloud|artificial|machine|information|systems|devops|programm|web|mobile|quality assurance/i.test(label)) return "Computing & Information Technology";
  if (/financial|finance|account|business|market|economic|management|manager|human resource|supply|bank|invest|audit|sales|entrepreneur/i.test(label)) return "Business & Finance";
  if (/design|ux|ui|creative|media|graphic|architecture|content|brand|animation|photograph/i.test(label)) return "Design & Creative";
  if (/health|medical|nurs|pharma|clinical|public health|biomed|laborator|nutrition|therap/i.test(label)) return "Health & Life Sciences";
  if (/engineer|mechanical|electrical|civil|industrial|chemical|robotic|energy|manufactur/i.test(label)) return "Engineering";
  if (/law|legal|policy|government|public administration|complian|regulat|governance|diplomat/i.test(label)) return "Law & Public Policy";
  if (/education|teach|academic|curriculum|instructional|train|learning/i.test(label)) return "Education";
  return "Other fields";
}

export default function CareerMajorSelector({ tracks, initialCareer = "", careerName = "targetCareer" }: { tracks: Track[]; initialCareer?: string; careerName?: string }) {
  const initialTrack = tracks.find(track => track.id === initialCareer);
  const initialMajor = initialTrack ? majorFor(initialTrack.label) : "";
  const [major, setMajor] = useState(initialMajor);
  const [career, setCareer] = useState(initialTrack?.id ?? "");
  const majors = useMemo(() => [...new Set(tracks.map(track => majorFor(track.label)))].sort(), [tracks]);
  const careers = useMemo(() => tracks.filter(track => majorFor(track.label) === major), [major, tracks]);

  return <div className="career-major-fields">
    <label>Major or field of study<select className="input" value={major} onChange={event => { const nextMajor = event.target.value; const firstCareer = tracks.find(track => majorFor(track.label) === nextMajor); setMajor(nextMajor); setCareer(firstCareer?.id ?? ""); }} required><option value="" disabled>Select a major</option>{majors.map(option=><option value={option} key={option}>{option}</option>)}</select><small className="muted">Choose the broad field first to narrow the career list.</small></label>
    <label>Target career<select className="input" name={careerName} value={career} onChange={event=>setCareer(event.target.value)} required disabled={!major}><option value="" disabled>{major ? "Select a target career" : "Select a major first"}</option>{careers.map(track=><option value={track.id} key={track.id}>{track.label}</option>)}</select><small className="muted">Only careers related to the selected major are shown.</small></label>
  </div>;
}
