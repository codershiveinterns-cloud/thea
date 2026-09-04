import { revalidatePath } from "next/cache";

/**
 * Invalidate every cached public page: home, category listings, the post itself, the author page,
 * sitemap.xml and feed.xml. A blog-sized site regenerates in milliseconds, so one broad call beats
 * tracking each dependent route by hand.
 */
export function revalidatePublicSite() {
  revalidatePath("/", "layout");
}
