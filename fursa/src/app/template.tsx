import Footer from "@/components/Footer";

export default function RootTemplate({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex min-h-[calc(100vh-4rem)] flex-col"><div className="flex-1">{children}</div><Footer /></div>;
}
