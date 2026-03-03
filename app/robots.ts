import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://thetackroom.com.au";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/selling/", "/orders/", "/messages/", "/settings/", "/checkout/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
