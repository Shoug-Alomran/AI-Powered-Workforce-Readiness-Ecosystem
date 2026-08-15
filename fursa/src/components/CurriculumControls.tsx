"use client";

import { useState } from "react";

const DOMAIN_LABEL:Record<string,string>={technical:"Technical skills",soft:"Professional skills"};

export default function CurriculumControls({typeOptions=[],domainOptions=[]}:{typeOptions?:string[];domainOptions?:string[]}) {
  const [query,setQuery]=useState("");
  const [type,setType]=useState("all");
  const [domain,setDomain]=useState("all");

  function applyFilters(nextQuery=query,nextType=type,nextDomain=domain){
    document.querySelectorAll<HTMLElement>(".cc-course").forEach((course)=>{
      const text=(course.dataset.search??course.textContent??"").toLowerCase();
      const matches=[nextQuery.toLowerCase(),nextType,nextDomain].every(value=>value==="all"||!value||text.includes(value));
      course.hidden=!matches;
    });
  }

  return <>
    <section className="cc-filter" aria-label="Curriculum filters">
      <label className="cc-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event)=>{setQuery(event.target.value);applyFilters(event.target.value,type,domain)}} placeholder="Search curriculum by name or skill..." aria-label="Search curriculum"/></label>
      <select value={type} onChange={(event)=>{setType(event.target.value);applyFilters(query,event.target.value,domain)}} aria-label="Offering type"><option value="all">All Types</option>{typeOptions.map(option=><option value={option} key={option}>{option==="certification"?"Certification":"Course"}</option>)}</select>
      <select value={domain} onChange={(event)=>{setDomain(event.target.value);applyFilters(query,type,event.target.value)}} aria-label="Skill domain"><option value="all">All Skill Domains</option>{domainOptions.map(option=><option value={option} key={option}>{DOMAIN_LABEL[option]??option}</option>)}</select>
    </section>
    <nav className="cc-tabs" aria-label="Curriculum sections"><a className="active" href="#course-list">Courses</a><a href="#certification-mapping">Certifications</a><a href="#skills-mapping">Skills Mapping</a><a href="/university/analytics">Analytics</a><small>Sort by: <strong>Alignment Score</strong></small></nav>
  </>;
}
