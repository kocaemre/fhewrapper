import type { Metadata } from "next";

// Canonical production domain (custom domain on Vercel). `VERCEL_PROJECT_PRODUCTION_URL`
// resolves to the *.vercel.app subdomain even when a custom domain is attached, so we
// prefer the explicit production URL for OG/Twitter cards and canonical links.
const baseUrl =
  process.env.NODE_ENV === "production" ? "https://zama.0xemrek.dev" : `http://localhost:${process.env.PORT || 3000}`;
const titleTemplate = "%s · The Cellar Registry";

export const getMetadata = ({
  title,
  description,
  imageRelativePath = "/thumbnail.jpg",
}: {
  title: string;
  description: string;
  imageRelativePath?: string;
}): Metadata => {
  const imageUrl = `${baseUrl}${imageRelativePath}`;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: title,
      template: titleTemplate,
    },
    description: description,
    openGraph: {
      title: {
        default: title,
        template: titleTemplate,
      },
      description: description,
      images: [
        {
          url: imageUrl,
        },
      ],
    },
    twitter: {
      title: {
        default: title,
        template: titleTemplate,
      },
      description: description,
      images: [imageUrl],
    },
    icons: {
      icon: [
        {
          url: "/favicon.png",
          sizes: "32x32",
          type: "image/png",
        },
      ],
    },
  };
};
