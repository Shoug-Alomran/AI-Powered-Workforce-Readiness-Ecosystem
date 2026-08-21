import Image from "next/image";

export default function BrandBolt({ className = "" }: { className?: string }) {
  return <span className={`brand-bolt ${className}`.trim()} aria-hidden="true">
    <Image src="/logo.png" alt="" width={522} height={543} priority />
  </span>;
}
