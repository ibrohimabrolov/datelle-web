import { notFound } from "next/navigation";

/* Unknown /panel/* URLs stay inside the Studio shell instead of falling through to the marketplace 404 */
export default function Missing() {
  notFound();
}
