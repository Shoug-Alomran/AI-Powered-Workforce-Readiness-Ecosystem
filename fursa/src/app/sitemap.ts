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
      url: `${SITE_URL}/impact`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // The two submission-facing pages: the Y.3172 / AI Readiness conformance
    // argument and the register of public documents behind it.
    {
      url: `${SITE_URL}/standards`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/knowledge-base`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/team`,
      changeFrequency: "monthly",
      priority: 0.6,
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
