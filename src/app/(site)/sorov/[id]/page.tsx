import type { Metadata } from "next";
import { Suspense } from "react";
import { RequestView } from "@/components/account/RequestView";

export const metadata: Metadata = { title: "Soʻrov holati", robots: { index: false } };

export default function RequestPage({ params }: PageProps<"/sorov/[id]">) {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-busy />}>
      <Inner params={params} />
    </Suspense>
  );
}

async function Inner({ params }: Pick<PageProps<"/sorov/[id]">, "params">) {
  const { id } = await params;
  return <RequestView id={id} />;
}
