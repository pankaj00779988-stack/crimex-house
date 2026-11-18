import type { Metadata } from "next";
import { siteConfig } from "./data";

export function pageMetadata(
  title: string,
  description: string,
  pathname: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: pathname },
    openGraph: {
      title: `${title} | CRIMEX HOUSE`,
      description,
      url: new URL(pathname, siteConfig.siteUrl).toString(),
      type: "website",
      siteName: "CRIMEX HOUSE",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "CRIMEX HOUSE — Five million. Zero alibis.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | CRIMEX HOUSE`,
      description,
      images: ["/opengraph-image"],
    },
  };
}
