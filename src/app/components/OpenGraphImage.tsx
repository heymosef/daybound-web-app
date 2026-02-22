import { useEffect } from "react";
import ogImage from "figma:asset/79309d0be11b0de2e54d2160c26d787e94e0b761.png";
import icon32 from "figma:asset/9aaf478db2af6c7f5719ab001f3687e8aea05f19.png";
import icon128 from "figma:asset/72eb043819f97e591d522de504cdb6a65d6b1358.png";

export function OpenGraphImage() {
  useEffect(() => {
    // Helper to add or update meta tags
    const setMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const setTwitterMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    // Helper to add or update link tags
    const setLink = (rel: string, href: string, extras?: Record<string, string>) => {
      const selector = extras?.sizes
        ? `link[rel="${rel}"][sizes="${extras.sizes}"]`
        : `link[rel="${rel}"]`;
      let link = document.querySelector(selector);
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", rel);
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
      if (extras) {
        for (const [key, value] of Object.entries(extras)) {
          link.setAttribute(key, value);
        }
      }
    };

    // Set Open Graph tags
    setMeta("og:image", ogImage);
    setMeta("og:title", "Daybound");
    setMeta("og:description", "Time clarity for distributed teams");
    setMeta("og:type", "website");

    // Set Twitter Card tags
    setTwitterMeta("twitter:card", "summary_large_image");
    setTwitterMeta("twitter:image", ogImage);
    setTwitterMeta("twitter:title", "Daybound");
    setTwitterMeta("twitter:description", "Time clarity for distributed teams");

    // Set favicon and apple-touch-icon
    setLink("icon", icon32, { type: "image/png", sizes: "32x32" });
    setLink("apple-touch-icon", icon128, { sizes: "128x128" });
  }, []);

  return null;
}