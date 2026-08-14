"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CurriculumControls() {
  const router=useRouter();
  const [query,setQuery]=useState("");
  const [department,setDepartment]=useState("all");
  const [type,setType]=useState("all");
  const [domain,setDomain]=useState("all");

  useEffect(()=>{
    document.querySelector<HTMLElement>(".cc-mapping")?.setAttribute("id","skills-mapping");
    const routes:Record<string,string>={
      "update curriculum content":"/university/actions#initiative-tracker",
      "enable auto-verification":"/university/actions#initiative-tracker",
      "bridge gap":"/university/actions#initiative-tracker",
      "manage prep path":"/university/actions#initiative-tracker",
    };
    const cleanups:Array<()=>void>=[];
    document.querySelectorAll<HTMLElement>(".cc-page button, .cc-page a:not([href])").forEach((control)=>{
      const label=(control.textContent??"").replace(/\s+/g," ").trim().toLowerCase();
      const destination=routes[label];
      if(!destination)return;
      control.setAttribute("role","link");
      control.setAttribute("tabindex","0");
      control.setAttribute("aria-label",control.textContent?.trim()||"Open curriculum action");
      const activate=(event:Event)=>{event.preventDefault();router.push(destination)};
      const keydown=(event:KeyboardEvent)=>{if(event.key==="Enter"||event.key===" ")activate(event)};
      control.addEventListener("click",activate);
      control.addEventListener("keydown",keydown);
      cleanups.push(()=>{control.removeEventListener("click",activate);control.removeEventListener("keydown",keydown)});
    });
    return()=>cleanups.forEach(cleanup=>cleanup());
  },[router]);

  function applyFilters(nextQuery=query,nextDepartment=department,nextType=type,nextDomain=domain){
    document.querySelectorAll<HTMLElement>(".cc-course").forEach((course)=>{
      const text=(course.dataset.search??course.textContent??"").toLowerCase();
      const matches=[nextQuery.toLowerCase(),nextDepartment,nextType,nextDomain].every(value=>value==="all"||!value||text.includes(value));
      course.hidden=!matches;
    });
  }

  return <>
    <section className="cc-filter" aria-label="Curriculum filters">
      <label className="cc-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event)=>{setQuery(event.target.value);applyFilters(event.target.value,department,type,domain)}} placeholder="Search curriculum by name, skill, or department..." aria-label="Search curriculum"/></label>
      <select value={type} onChange={(event)=>{setType(event.target.value);applyFilters(query,department,event.target.value,domain)}} aria-label="Course type"><option value="all">All Types</option><option value="core">Core</option><option value="elective">Elective</option></select>
      <select value={department} onChange={(event)=>{setDepartment(event.target.value);applyFilters(query,event.target.value,type,domain)}} aria-label="Department"><option value="all">All Departments</option><option value="computer science">Computer Science</option><option value="interdisciplinary">Interdisciplinary Studies</option></select>
      <select value={domain} onChange={(event)=>{setDomain(event.target.value);applyFilters(query,department,type,event.target.value)}} aria-label="Skill domain"><option value="all">All Skill Domains</option><option value="kubernetes">Cloud &amp; DevOps</option><option value="explainable ai">Artificial Intelligence</option><option value="security">Cybersecurity</option></select>
    </section>
    <nav className="cc-tabs" aria-label="Curriculum sections"><a className="active" href="#course-list">Courses</a><a href="#certification-mapping">Certifications</a><a href="#skills-mapping">Skills Mapping</a><a href="/university/analytics">Analytics</a><small>Sort by: <strong>Alignment Score</strong></small></nav>
  </>;
}
