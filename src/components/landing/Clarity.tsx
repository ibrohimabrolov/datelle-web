import Script from "next/script";

/* Microsoft Clarity (heatmaps + session replays) — landing only, production only.
   The script id must not be "clarity": an element id becomes window.clarity and the snippet skips its stub.
   Never in /panel: replays would record studios' client names, phones and money. */
export const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID ?? "zi00mjdyze";

export function Clarity() {
  if (!CLARITY_ID || process.env.VERCEL_ENV !== "production") return null;
  return (
    <Script id="ms-clarity-init" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(CLARITY_ID)});`}
    </Script>
  );
}
