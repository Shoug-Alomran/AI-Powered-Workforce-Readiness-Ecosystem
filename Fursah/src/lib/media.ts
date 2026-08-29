/**
 * Large media is served from the Cloudflare R2 bucket rather than from
 * `public/`, so the repository and the Vercel deployment stay small. Set
 * `NEXT_PUBLIC_DEMO_VIDEO_URL` to the bucket's public URL for
 * `videos/fursah-demo.mp4` — either the r2.dev development URL or a custom
 * domain bound to the bucket. The bucket must expose public read access for
 * the browser to stream it.
 *
 * The value is read at build time and inlined, so an unset variable simply
 * removes the player from the page instead of rendering a broken one.
 */
const configuredDemoVideoUrl = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL?.trim() || "";

function resolveDemoVideoUrl(value: string) {
  if (!value) return "";

  try {
    const url = new URL(value);
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/videos/fursah-demo.mp4";
    }
    return url.toString();
  } catch {
    return value;
  }
}

export const DEMO_VIDEO_URL = resolveDemoVideoUrl(configuredDemoVideoUrl);
export const DEMO_VIDEO_POSTER_URL = "/demo-video-poster.jpg";
