import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = "/Users/shougalomran/Desktop/AI-Powered-Workforce-Readiness-Ecosystem/output/presentation";
const PREVIEW = "/Users/shougalomran/Desktop/AI-Powered-Workforce-Readiness-Ecosystem/tmp/presentation-build/rendered";
const C = { navy: "0B1F3A", blue: "1769E0", cyan: "12B8C4", ink: "142033", muted: "5F6B7A", pale: "EAF2FF", line: "D8E1EC", white: "FFFFFF", green: "17875D", amber: "E99419" };
const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });

function box(slide, x, y, w, h, fill = C.white, radius = "rounded-xl", line = C.line) {
  return slide.shapes.add({ geometry: "roundRect", position: { left:x, top:y, width:w, height:h }, fill, line: { style:"solid", fill:line, width:1 }, borderRadius: radius });
}
function text(slide, value, x, y, w, h, size=20, color=C.ink, bold=false, align="left") {
  const s = slide.shapes.add({ geometry:"textbox", position:{left:x,top:y,width:w,height:h}, fill:"none", line:{style:"solid",fill:"none",width:0} });
  s.text = value; s.text.style = { fontFamily:"Arial", fontSize:size, color, bold, alignment:align, verticalAlignment:"middle" }; return s;
}
function base(kicker, title, number) {
  const s = deck.slides.add(); s.background.fill = C.white;
  text(s, kicker.toUpperCase(), 64, 40, 460, 28, 13, C.blue, true);
  text(s, title, 64, 78, 1120, 64, 36, C.navy, true);
  text(s, String(number).padStart(2,"0"), 1174, 42, 42, 26, 12, C.muted, true, "right");
  const rule = s.shapes.add({geometry:"line",position:{left:64,top:674,width:1152,height:0},fill:"none",line:{style:"solid",fill:C.line,width:1}});
  text(s, "FURSAH · AI-POWERED WORKFORCE READINESS", 64, 682, 600, 18, 10, C.muted, true);
  return s;
}
function note(slide, script, sources=[]) {
  const src = sources.length ? `\n\n[Sources]\n${sources.map(x=>`- ${x}`).join("\n")}` : "";
  slide.speakerNotes.textFrame.setText(script + src);
}

// 1 — Cover
{
  const s = deck.slides.add(); s.background.fill = C.navy;
  text(s,"FURSAH",70,62,300,32,15,C.cyan,true);
  text(s,"From evidence to\nworkforce readiness",70,150,720,178,52,C.white,true);
  text(s,"A judge-ready, auditable implementation of the ITU-T Y.3172 machine-learning pipeline.",72,354,660,78,22,"C7D6EA",false);
  box(s,856,116,300,380,C.blue,"rounded-2xl",C.blue);
  text(s,"7/7",894,158,224,100,68,C.white,true,"center");
  text(s,"Y.3172 pipeline nodes\nrepresented end to end",894,268,224,70,20,C.white,true,"center");
  text(s,"13/13",894,365,224,68,44,C.white,true,"center");
  text(s,"readiness dimensions",894,434,224,40,18,C.white,false,"center");
  text(s,"LIVE PROTOTYPE · fursah.org",70,634,650,24,13,C.cyan,true);
  note(s,"Fursah turns workforce evidence into an explainable readiness decision. In three minutes I will show the complete pipeline, the readiness model, our reusable knowledge base, and the policy actions produced from evidence.",["https://www.itu.int/rec/T-REC-Y.3172","https://aiforgood.itu.int/"]);
}

// 2 — Problem / solution
{
  const s = base("01 · The use case","One decision, three fragmented evidence streams",2);
  const cols=[
    ["Academic evidence","Courses and mastery signals rarely translate cleanly into employability evidence."],
    ["Career requirements","Role expectations change faster than conventional advising artifacts."],
    ["Proof of readiness","Learners need a defensible next action—not another opaque score."]
  ];
  cols.forEach((c,i)=>{const x=64+i*382; box(s,x,178,350,258,i===1?C.pale:C.white); text(s,String(i+1).padStart(2,"0"),x+24,198,48,30,14,C.blue,true); text(s,c[0],x+24,246,300,46,24,C.navy,true); text(s,c[1],x+24,306,300,94,18,C.muted,false);});
  box(s,64,466,1114,144,C.navy,"rounded-xl",C.navy);
  text(s,"Fursah joins those streams into one traceable chain: evidence → inference → readiness → action.",96,496,1050,68,26,C.white,true,"center");
  note(s,"The problem is not lack of data. It is fragmentation. Fursah unifies academic evidence, role requirements, and proof of readiness so every recommendation has a visible reason and a next action.");
}

// 3 — Trust boundary
{
  const s=base("02 · System design","AI explains the evidence; it does not invent it",3);
  const items=[
    ["Verified inputs","Profiles, assessments, projects, curriculum and role evidence."],
    ["Deterministic core","Versioned scoring, prerequisite gates and confidence labels."],
    ["Grounded assistant","Natural-language explanation constrained by stored evidence."]
  ];
  items.forEach((it,i)=>{const x=64+i*382; box(s,x,190,350,240,i===1?C.pale:C.white); text(s,it[0],x+25,222,300,42,19,C.navy,true); text(s,it[1],x+25,278,300,86,18,C.muted); text(s,i===1?"SYSTEM OF RECORD":"EVIDENCE LAYER",x+25,378,250,22,11,i===1?C.blue:C.green,true);});
  text(s,"No source evidence → no claim",64,478,540,48,30,C.navy,true);
  text(s,"The interface exposes source freshness, limitations and confidence instead of hiding uncertainty.",64,536,1000,54,20,C.muted);
  note(s,"This boundary is central to trust. The deterministic readiness engine remains the system of record. The assistant can explain verified evidence, but cannot create competencies, scores, or achievements that are not stored.");
}

// 4 — Pipeline
{
  const s=base("03 · Y.3172 mapping","Every ML pipeline node is visible and testable",4);
  const nodes=["Sources","Collect","Preprocess","Model","Policy","Distribute","Act"];
  nodes.forEach((n,i)=>{const x=64+i*160; box(s,x,204,132,92,i===3?C.blue:C.pale,"rounded-lg",i===3?C.blue:C.line); text(s,String(i+1),x+10,214,25,20,11,i===3?C.white:C.blue,true); text(s,n,x+10,242,112,34,17,i===3?C.white:C.navy,true,"center"); if(i<6) text(s,"→",x+132,230,28,40,23,C.blue,true,"center");});
  const proof=["Evidence Registry","Aggregation + QC","Feature normalization","Readiness scoring","Safety + privacy","Dashboards + exports","Plans + interventions"];
  proof.forEach((p,i)=>text(s,p,64+i*160,316,132,54,13,C.muted,true,"center"));
  box(s,64,422,1092,142,C.navy,"rounded-xl",C.navy);
  text(s,"Judge shortcut",90,446,180,30,14,C.cyan,true);
  text(s,"Open /standards → inspect node evidence → follow the linked implementation.",90,484,1000,44,24,C.white,true);
  note(s,"The standards page maps all seven Y.3172 pipeline nodes to specific prototype evidence. A judge can inspect each node and follow its implementation instead of accepting a slide-level claim.",["https://www.itu.int/rec/T-REC-Y.3172"]);
}

// 5 — rubric scorecard
{
  const s=base("04 · Official criteria","Four criteria, one continuous proof chain",5);
  const stats=[["7 / 7","Pipeline nodes"],["13 / 13","Readiness dimensions"],["17","Knowledge sources"],["6","Policy gaps"]];
  stats.forEach((m,i)=>{const x=64+i*278; box(s,x,184,248,166,i===0?C.blue:C.white); text(s,m[0],x+20,204,208,66,42,i===0?C.white:C.navy,true,"center"); text(s,m[1],x+20,278,208,36,16,i===0?C.white:C.muted,true,"center");});
  const criteria=["Clear Y.3172 use case","AI Readiness factor mapping","Reusable knowledge contribution","Strategy and policy input"];
  criteria.forEach((v,i)=>{const y=382+i*58; text(s,"✓",70,y,28,32,18,C.green,true,"center"); text(s,v,110,y,520,32,18,C.ink,true); text(s,["/standards","/standards","/knowledge-base","/standards#policy-gaps"][i],770,y,370,32,15,C.blue,true,"right");});
  note(s,"The submission is organized around the official judging logic: the use case, the readiness mapping, the knowledge contribution, and policy input. The numbers on this slide are verified by the automated submission check.",["https://aiforgood.itu.int/"]);
}

// 6 — readiness and KB
{
  const s=base("05 · Readiness model","Thirteen dimensions; evidence before confidence",6);
  const dims=["Connectivity","Compute","Data","Governance","Security","Talent","Skills","Research","Innovation","Adoption","Investment","Inclusion","Sustainability"];
  dims.forEach((d,i)=>{const col=i%4,row=Math.floor(i/4),x=64+col*278,y=176+row*76; box(s,x,y,248,56,i<4?C.pale:C.white,"rounded-lg"); text(s,d,x+16,y+10,216,34,17,C.navy,true);});
  box(s,64,500,1092,112,C.navy,"rounded-xl",C.navy);
  text(s,"Reusable by design",88,520,260,32,18,C.cyan,true);
  text(s,"Versioned JSON + CSV knowledge-base exports make the framework portable beyond this interface.",88,554,1010,34,21,C.white,true);
  note(s,"Fursah covers thirteen readiness dimensions and exposes the underlying knowledge base as versioned JSON and CSV. That makes the contribution reusable, reviewable, and suitable for comparison or integration—not locked inside the UI.");
}

// 7 — policy
{
  const s=base("06 · Policy output","A gap becomes an owned, measurable intervention",7);
  const rows=[
    ["Low verified evidence","Student Success","Monthly","Evidence completion"],
    ["Repeated prerequisite failure","Academic Affairs","Per term","Gate recovery"],
    ["Stale role evidence","Career Services","Quarterly","Source freshness"],
    ["Low-confidence recommendation","AI Governance","Monthly","Confidence mix"],
    ["Accessibility gap","Product Owner","Per release","WCAG checks"],
    ["Outcome disparity","Institutional Research","Quarterly","Group parity"]
  ];
  text(s,"TRIGGER",72,166,310,25,11,C.muted,true); text(s,"OWNER",408,166,220,25,11,C.muted,true); text(s,"REVIEW",650,166,160,25,11,C.muted,true); text(s,"METRIC",828,166,300,25,11,C.muted,true);
  rows.forEach((r,i)=>{const y=194+i*68; if(i%2===0) box(s,64,y,1092,54,"F6F9FC","rounded-none","F6F9FC"); text(s,r[0],76,y+8,310,36,16,C.ink,true); text(s,r[1],408,y+8,220,36,16,C.ink); text(s,r[2],650,y+8,160,36,16,C.ink); text(s,r[3],828,y+8,300,36,16,C.blue,true);});
  note(s,"Policy output is operational, not aspirational. Each gap includes an accountable owner, a trigger, a metric, and a review cadence. This supports real governance conversations while staying honest that institutional validation is the next step.");
}

// 8 — demo close
{
  const s=base("07 · Live proof","The three-minute judge route",8);
  const steps=[["01","Open","/judge-demo"],["02","Inspect","/standards"],["03","Export","/knowledge-base"],["04","Ask","grounded assistant"]];
  steps.forEach((v,i)=>{const x=64+i*278; box(s,x,190,248,174,i===3?C.blue:C.white); text(s,v[0],x+18,208,50,26,12,i===3?C.white:C.blue,true); text(s,v[1],x+18,246,210,38,24,i===3?C.white:C.navy,true); text(s,v[2],x+18,296,210,34,15,i===3?C.white:C.muted,true);});
  text(s,"What remains before a real-world claim",64,420,600,38,25,C.navy,true);
  text(s,"A controlled pilot with institutional users, measured outcomes and external governance review. The prototype labels this limitation explicitly.",64,468,1040,70,20,C.muted);
  box(s,64,568,1092,62,C.navy,"rounded-lg",C.navy);
  text(s,"Fursah makes readiness evidence actionable—and every important claim inspectable.",84,580,1052,36,23,C.white,true,"center");
  note(s,"The strongest way to evaluate Fursah is live: start at the judge route, inspect the standards evidence, export the knowledge base, then ask the assistant to explain a recommendation. Our remaining limitation is also explicit: production impact requires a controlled institutional pilot.");
}

await fs.mkdir(OUT,{recursive:true}); await fs.mkdir(PREVIEW,{recursive:true});
for (const [i,s] of deck.slides.items.entries()) {
  const stem=`slide-${String(i+1).padStart(2,"0")}`;
  const png=await deck.export({slide:s,format:"png",scale:1}); await fs.writeFile(`${PREVIEW}/${stem}.png`,new Uint8Array(await png.arrayBuffer()));
  const layout=await s.export({format:"layout"}); await fs.writeFile(`${PREVIEW}/${stem}.layout.json`,await layout.text());
}
const montage=await deck.export({format:"webp",montage:true,scale:1}); await fs.writeFile(`${PREVIEW}/montage.webp`,new Uint8Array(await montage.arrayBuffer()));
const pptx=await PresentationFile.exportPptx(deck); await pptx.save(`${OUT}/fursah-judge-pitch.pptx`);
