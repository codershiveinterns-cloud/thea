import Image from "next/image";
import { POST_IDS } from "./ids";

/**
 * Editor-uploaded screenshots. Each image sits in a fixed 16:9 box (object-contain)
 * so unknown screenshot dimensions never shift layout; all are lazy-loaded.
 */
export function Screenshots({ images, title }: { images: string[]; title: string }) {
  if (images.length === 0) return null;
  return (
    <section aria-labelledby={POST_IDS.screenshots} className="mt-14">
      <h2 id={POST_IDS.screenshots} className="font-display text-2xl font-bold tracking-tight text-fg">
        Screenshots
      </h2>
      <div className="mt-4 space-y-6">
        {images.map((src, i) => (
          <figure key={`${i}-${src}`}>
            <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-bg-2">
              <Image
                src={src}
                alt={`Screenshot ${i + 1}: ${title}`}
                fill
                sizes="(min-width: 768px) 720px, 100vw"
                className="object-contain"
                // Only /uploads/* is local; external hosts are not in images.remotePatterns.
                unoptimized={/^https?:\/\//.test(src)}
              />
            </div>
            <figcaption className="mt-2 text-sm text-fg-muted">
              Screenshot {i + 1} of {images.length}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
