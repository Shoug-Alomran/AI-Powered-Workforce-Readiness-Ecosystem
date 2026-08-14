"use client";

import { useEffect, useState } from "react";

type Insight={score:number;pool:number;difficulty:string;weeks:string;tips:string[]};

function analyze(form:HTMLFormElement):Insight {
  const data=new FormData(form);
  const title=String(data.get("title")||"").trim();
  const description=String(data.get("description")||"").trim();
  const skills=String(data.get("skills")||"").split(",").filter(Boolean);
  const preferred=String(data.get("preferredSkills")||"").split(",").filter(Boolean);
  const location=String(data.get("location")||"").trim();
  const tips:string[]=[];
  let score=15;
  if(title.length>=8)score+=15;else tips.push("Add a clear, standard job title.");
  if(description.length>=180)score+=25;else tips.push("Add responsibilities and measurable outcomes to the role description.");
  if(skills.length>=3)score+=20;else tips.push("Add at least three required skills for more accurate matching.");
  if(preferred.length)score+=10;else tips.push("Separate preferred skills from mandatory requirements.");
  if(location)score+=10;else tips.push("Specify a location or confirm that the role is remote.");
  if(data.get("careerTrack"))score+=5;
  score=Math.min(100,score);
  const difficulty=skills.length>=6?"High":skills.length>=3?"Medium":"Low";
  const pool=Math.max(0,Math.round((score/100)*60-skills.length*2));
  return {score,pool,difficulty,weeks:difficulty==="High"?"5–8 Weeks":difficulty==="Medium"?"3–5 Weeks":"2–4 Weeks",tips:tips.slice(0,3)};
}

export default function JobHiringAssistant(){
  const [insight,setInsight]=useState<Insight>({score:15,pool:0,difficulty:"Low",weeks:"2–4 Weeks",tips:["Begin entering role information to receive recommendations."]});
  useEffect(()=>{const form=document.getElementById("create-job-form") as HTMLFormElement|null;if(!form)return;const update=()=>setInsight(analyze(form));update();form.addEventListener("input",update);form.addEventListener("change",update);window.addEventListener("fursa:draft-saved",update);return()=>{form.removeEventListener("input",update);form.removeEventListener("change",update);window.removeEventListener("fursa:draft-saved",update)}},[]);
  return <section className="pjob-assistant"><header><h2>✦　AI Hiring Assistant</h2><small>LIVE INSIGHTS</small></header><div className="pjob-score"><span style={{background:`conic-gradient(#6d5dfb ${insight.score*3.6}deg,#e5e7eb 0)`}}><b>{insight.score}</b><small>/100</small></span><div><b>AI Quality Score</b><p>{insight.score>=80?"Strong clarity. Candidates should understand the role and its expectations.":"Complete the role details to improve matching quality."}</p></div></div><h3>OPTIMIZATION TIPS</h3><ul>{insight.tips.length?insight.tips.map(tip=><li key={tip}>{tip}</li>):<li>The opportunity contains the information needed for candidate matching.</li>}</ul><div className="pjob-insights"><span><small>CANDIDATE POOL</small><b>~{insight.pool} <em>Estimated</em></b></span><span><small>DIFFICULTY</small><b>{insight.difficulty}</b></span><span><small>TIME TO FILL</small><b>{insight.weeks}</b></span></div></section>;
}
