import type { MetadataRoute } from "next";

const SITE_URL = "https://fursah.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const policies = ["privacy", "terms", "responsible-ai", "accessibility"];

  const pages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/workforce-intelligence`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/support`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/ar/support`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  for (const policy of policies) {
    pages.push(
      {
        url: `${SITE_URL}/policies/${policy}`,
        changeFrequency: "monthly",
        priority: 0.4,
      },
      {
        url: `${SITE_URL}/ar/policies/${policy}`,
        changeFrequency: "monthly",
        priority: 0.4,
      },
    );
  }

  return pages;
}
