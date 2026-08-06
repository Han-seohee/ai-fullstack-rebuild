import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export function createSiteMetadata(overrides?: {
  title?: string;
  description?: string;
  ogImage?: string;
  path?: string;
}): Metadata {
  const title = overrides?.title ?? siteConfig.title;
  const description = overrides?.description ?? siteConfig.description;
  const ogImage = overrides?.ogImage ?? siteConfig.ogImage;
  const url = overrides?.path
    ? `${siteConfig.url}${overrides.path}`
    : siteConfig.url;

  return {
    metadataBase: new URL(siteConfig.url),
    title,
    description,
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url,
      siteName: siteConfig.name,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
