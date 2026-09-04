import { serializeJsonLd, type JsonLd } from "@/lib/seo";

/** Emits one application/ld+json script. Pass a jsonLdGraph(...) result. */
export function JsonLd({ data }: { data: JsonLd }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
