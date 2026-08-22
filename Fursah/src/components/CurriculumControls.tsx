"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Ic from "@/components/Ic";

const DOMAIN_LABEL:Record<string,string>={technical:"Technical skills",soft:"Professional skills"};

/* Each tab owns one top-level region of the curriculum page. Switching swaps the
   region in place instead of scrolling the reader down the whole document. */
const TABS=[
  {id:"courses",label:"Courses",selectors:[".cc-workspace"]},
  {id:"certifications",label:"Certifications",selectors:[".cc-cert-section"]},
  {id:"skills",label:"Skills Mapping",selectors:[".cc-mapping"]},
] as const;

type TabId=(typeof TABS)[number]["id"];

export default function CurriculumControls({typeOptions=[],domainOptions=[]}:{typeOptions?:string[];domainOptions?:string[]}) {
  const [query,setQuery]=useState("");
  const [type,setType]=useState("all");
  const [domain,setDomain]=useState("all");
  const [tab,setTab]=useState<TabId>("courses");
  const navRef=useRef<HTMLElement>(null);

  function applyFilters(nextQuery=query,nextType=type,nextDomain=domain){
    document.querySelectorAll<HTMLElement>(".cc-course").forEach((course)=>{
      const text=(course.dataset.search??course.textContent??"").toLowerCase();
      const matches=[nextQuery.toLowerCase(),nextType,nextDomain].every(value=>value==="all"||!value||text.includes(value));
      course.hidden=!matches;
    });
  }

  /* Show only the active region. Runs on mount too, so the page starts on Courses
     even though the server renders every section. */
  useEffect(()=>{
    TABS.forEach((entry)=>{
      entry.selectors.forEach((selector)=>{
        document.querySelectorAll<HTMLElement>(selector).forEach((node)=>{node.hidden=entry.id!==tab});
      });
    });
  },[tab]);

  function selectTab(next:TabId){
    setTab(next);
    /* Keep the tab strip in view: if the reader is below it, bring it back to the
       top so the newly revealed panel starts where they are looking. */
    const nav=navRef.current;
    if(nav&&nav.getBoundingClientRect().top<0)nav.scrollIntoView({behavior:"smooth",block:"start"});
  }

  return <>
    <section className="cc-filter" aria-label="Curriculum filters">
      <label className="cc-search"><Ic name="search"/><input value={query} onChange={(event)=>{setQuery(event.target.value);applyFilters(event.target.value,type,domain)}} placeholder="Search curriculum by name or skill..." aria-label="Search curriculum"/></label>
      <select value={type} onChange={(event)=>{setType(event.target.value);applyFilters(query,event.target.value,domain)}} aria-label="Offering type"><option value="all">All Types</option>{typeOptions.map(option=><option value={option} key={option}>{option==="certification"?"Certification":"Course"}</option>)}</select>
      <select value={domain} onChange={(event)=>{setDomain(event.target.value);applyFilters(query,type,event.target.value)}} aria-label="Skill domain"><option value="all">All Skill Domains</option>{domainOptions.map(option=><option value={option} key={option}>{DOMAIN_LABEL[option]??option}</option>)}</select>
    </section>
    <nav className="cc-tabs" aria-label="Curriculum sections" ref={navRef}>
      {TABS.map((entry)=>(
        <button
          key={entry.id}
          type="button"
          className={entry.id===tab?"active":undefined}
          aria-current={entry.id===tab?"true":undefined}
          onClick={()=>selectTab(entry.id)}
        >{entry.label}</button>
      ))}
      <Link href="/university/analytics">Analytics</Link>
      <small>Sort by: <strong>Alignment Score</strong></small>
    </nav>
  </>;
}
