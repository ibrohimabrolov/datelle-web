import Link from "next/link";

export default function NotFound() {
  return (
    <div className="ds-state" style={{ minHeight: "60vh", margin: "0 auto", justifyContent: "center" }}>
      <h1 className="ds-h2">Sahifa topilmadi</h1>
      <p className="ds-body ds-secondary">Havola eskirgan yoki notoʻgʻri yozilgan.</p>
      <Link href="/panel/kalendar" className="ds-btn" data-style="secondary" data-size="m">
        <span>Kalendarga qaytish</span>
      </Link>
    </div>
  );
}
