"use client";

import { useState } from "react";
import Image from "next/image";

export default function AccountAvatar({ initials, className = "" }: { initials: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <span className={`account-avatar ${className}`.trim()}>{!failed&&<Image src="/api/account/avatar" alt="Profile" width={128} height={128} unoptimized onError={()=>setFailed(true)}/>}<b aria-hidden={failed?undefined:"true"}>{initials}</b></span>;
}
