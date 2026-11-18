import { BOT_HANDLE, BOT_URL, FEATURES, LOGIN_URL, PLANS, STATS, STEPS } from "./data";
import { Faq } from "./Faq";
import { IconBot, IconDatelle, IconHozir, IconJamoa, IconKalendar, IconPul, Step1, Step2, Step3 } from "./icons";
import { Tour } from "./Tour";
import { Cta, Eyebrow, Img, ListItem, Logo, Meter, SectionHead } from "./ui";

/* Raqamlar (273:327) */
export function Stats() {
  return (
    <section className="lp-stats" aria-label="Raqamlarda">
      {STATS.map((s, i) => (
        <div className="lp-stat" key={s.label}>
          <div className="lp-stat__top">
            <span className="lp-caps">/0{i + 1}/</span>
            <Meter on={i + 1} fade={false} />
          </div>
          <div className="lp-stat__value">
            <p className="lp-stat__num">{s.n}<span>{s.unit}</span></p>
            <p className="lp-stat__label">{s.label}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

/* Oldin va endi (268:726) */
export function Compare() {
  return (
    <section className="lp-section" aria-labelledby="h-oldin">
      <SectionHead id="h-oldin" eyebrow="Oldin va endi" title="Daftardan — bitta ekranga" text="Koʻp studiyalar hozir shunday ishlaydi. Datelle bilan esa shunday." />
      <div className="lp-compare">
        <article className="lp-ccard">
          <div className="lp-ccard__media">
            <Img src="/landing/3d-hozir.webp" alt="" width={1200} height={675} loading="lazy" />
          </div>
          <div className="lp-ccard__body">
            <div className="lp-ccard__head">
              <span className="lp-badge lp-caps"><IconHozir />Hozir</span>
              <h3 className="lp-card-title">Daftar, Excel va 3 ta chat</h3>
            </div>
            <ul className="lp-list">
              <ListItem type="cross">Avans qayerga yozilgani esdan chiqadi</ListItem>
              <ListItem type="cross">Bir sanaga ikki buyurtma tushib qoladi</ListItem>
              <ListItem type="cross">Oy oxirida tushum qoʻlda hisoblanadi</ListItem>
            </ul>
          </div>
        </article>
        <article className="lp-ccard lp-ccard--brand">
          <div className="lp-ccard__media">
            <Img src="/landing/3d-datelle.webp" alt="" width={1200} height={675} loading="lazy" />
          </div>
          <div className="lp-ccard__body">
            <div className="lp-ccard__head">
              <span className="lp-badge lp-caps"><IconDatelle />Datelle bilan</span>
              <h3 className="lp-card-title">Bitta kalendar, aniq raqamlar</h3>
            </div>
            <ul className="lp-list">
              <ListItem>Har buyurtmada avans va qoldiq koʻrinadi</ListItem>
              <ListItem>Band kun ochiq qolmaydi</ListItem>
              <ListItem>Oylik tushum oʻzi hisoblanadi</ListItem>
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}

/* Ichkaridan koʻring (268:789) */
export function Product() {
  return (
    <section className="lp-section" aria-labelledby="h-ichkaridan">
      <div className="lp-head">
        <div className="lp-head__title">
          <Eyebrow>Mahsulot</Eyebrow>
          <h2 className="lp-h2" id="h-ichkaridan">Ichkaridan koʻring</h2>
        </div>
        <Cta href={BOT_URL} tone="brand">3 oy bepul boshlash</Cta>
      </div>
      <Tour />
    </section>
  );
}

const FEATURE_ICON = { kalendar: IconKalendar, pul: IconPul, jamoa: IconJamoa, bot: IconBot };

/* Imkoniyatlar (179:605) */
export function Features() {
  return (
    <section className="lp-section" id="imkoniyatlar" aria-labelledby="h-imk">
      <div className="lp-container" style={{ display: "flex", flexDirection: "column", gap: 64 }}>
        <SectionHead id="h-imk" eyebrow="Imkoniyatlar" title="Daftar va Excel oʻrniga" text="Sana, pul va jamoa — bitta ilovada. Studiya egasi va menejerlari uchun." />
        <div className="lp-features">
          {FEATURES.map((f) => {
            const Icon = FEATURE_ICON[f.icon];
            return (
              <article className="lp-fcard" key={f.img}>
                <div className="lp-fcard__media">
                  <Img src={`/landing/3d-${f.img}.webp`} alt="" width={640} height={480} loading="lazy" className={f.img === "pul" ? "lp-fit-80" : undefined} />
                </div>
                <div className="lp-fcard__body">
                  <span className="lp-badge lp-caps"><Icon />{f.badge}</span>
                  <div className="lp-fcard__text">
                    <h3 className="lp-card-title">{f.title}</h3>
                    <p className="lp-body">{f.text}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const STEP_ICON = [Step1, Step2, Step3];

/* Qanday ishlaydi (179:640) */
export function Steps() {
  return (
    <section className="lp-section" id="qanday-ishlaydi" aria-labelledby="h-qadam">
      <div className="lp-container" style={{ display: "flex", flexDirection: "column", gap: 64 }}>
        <SectionHead id="h-qadam" eyebrow="Qanday ishlaydi" title="3 qadam, 5 daqiqa" />
        <ol className="lp-steps" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {STEPS.map((s, i) => {
            const Icon = STEP_ICON[i];
            return (
              <li className="lp-step" key={s.title}>
                <Icon />
                <div className="lp-step__text">
                  <h3 className="lp-card-title">{s.title}</h3>
                  <p className="lp-body">
                    {s.text.map((line, j) => (
                      <span key={j}>{j > 0 ? <br /> : null}{line}</span>
                    ))}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function PlanCard({ p, split }: { p: typeof PLANS.monthly; split?: boolean }) {
  return (
    <article className="lp-plan">
      <div className="lp-plan__top">
        <h3 className="lp-plan__name">{p.name}</h3>
        <p className="lp-plan__desc">{p.desc}</p>
      </div>
      <div className="lp-plan__price-wrap">
        <p className="lp-plan__price"><b>{p.price}</b><span>{p.unit}</span></p>
        <p className={`lp-plan__note${split ? " lp-plan__note--split" : ""}`}><span>{p.note[0]}</span><b>{p.note[1]}</b></p>
      </div>
      <div className="lp-plan__includes">
        <span className="lp-caps">Nima kiradi</span>
        <ul className="lp-list">{p.includes.map((t) => <ListItem key={t}>{t}</ListItem>)}</ul>
      </div>
      <a className="lp-btn lp-btn--secondary" href={BOT_URL} target="_blank" rel="noopener">Boshlash</a>
    </article>
  )
}

/* Narxlar (274:1529) */
export function Pricing() {
  const { monthly: m, founder: f, yearly: y } = PLANS;
  return (
    <section className="lp-section" id="narxlar" aria-labelledby="h-narx">
      <SectionHead id="h-narx" eyebrow="Narxlar" title="Studiyangizga mos tarif" text="Hamma tarifda hammasi bor. Farqi — faqat toʻlov usulida." />
      <div className="lp-plans">
        <PlanCard p={m} split />
        <article className="lp-plan lp-plan--featured">
          <div className="lp-plan__top">
            <div className="lp-plan__row">
              <h3 className="lp-plan__name">{f.name}</h3>
              <span className="lp-plan__chip lp-caps">{f.chip}</span>
            </div>
            <p className="lp-plan__desc">{f.desc}</p>
          </div>
          <div className="lp-plan__price-wrap">
            <p className="lp-plan__price"><b>{f.price}</b><span>{f.unit}</span></p>
            <p className="lp-plan__note"><span>{f.note[0]}</span><b>{f.note[1]}</b></p>
          </div>
          <div className="lp-plan__includes">
            <span className="lp-caps">Nima kiradi</span>
            <ul className="lp-list">{f.includes.map((t) => <ListItem key={t} tone="onbrand">{t}</ListItem>)}</ul>
          </div>
          <Cta href={BOT_URL} tone="light" block>Joy band qilish</Cta>
        </article>
        <PlanCard p={y} />
      </div>
    </section>
  );
}

/* Hamkorlar (235:752) — logo wall, placeholders until founding partners join */
export function Partners() {
  return (
    <section className="lp-section" id="hamkorlar" aria-labelledby="h-hamkor">
      <SectionHead id="h-hamkor" eyebrow="Hamkorlar" title="Birinchi 10 ta studiya" text="Asoschi hamkorlar logotipi shu yerda doimiy turadi. Joy band boʻlgani sari devor toʻladi." />
      <div className="lp-wall" role="img" aria-label="Asoschi hamkorlar uchun 10 ta boʻsh joy">
        {Array.from({ length: 10 }, (_, i) => (
          <div className="lp-wall__cell" key={i}><span className="lp-wall__slot" /></div>
        ))}
      </div>
    </section>
  );
}

/* Savollar (179:677) */
export function Questions() {
  return (
    <section className="lp-section" id="savollar" aria-labelledby="h-savol">
      <div className="lp-faq-wrap">
        <div className="lp-head__title">
          <Eyebrow>Savollar</Eyebrow>
          <h2 className="lp-h2" id="h-savol">Koʻp soʻraladi</h2>
          <p className="lp-body">Qanday ishlashi, narxi va maʼlumotlaringiz haqida qisqa javoblar.</p>
        </div>
        <Faq />
      </div>
    </section>
  );
}

/* Marquee (179:701) */
export function Marquee() {
  return (
    <a className="lp-marquee" href={BOT_URL} target="_blank" rel="noopener" aria-label="Telegram'da boshlash">
      {/* 3 identical units; the track loops by exactly one unit (−33.333%) */}
      <span className="lp-marquee__track" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ display: "contents" }}>
            <span>Telegram&apos;da boshlash</span>
            <i />
          </span>
        ))}
      </span>
    </a>
  );
}

/* Footer · B — Bogʻ (263:20242) */
export function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer__card">
        <div className="lp-footer__art" aria-hidden>
          <Img src="/landing/footer-art.webp" alt="" width={1536} height={864} loading="lazy" />
        </div>
        <div className="lp-footer__top">
          <div className="lp-footer__brand">
            <Logo />
            <p className="lp-body">Dekor studiyalari va floristlar uchun.<br />Sanalar, buyurtmalar va pul — bir joyda.</p>
            <Cta href={BOT_URL} tone="brand">Telegram&apos;da boshlash</Cta>
          </div>
          <nav className="lp-footer__links" aria-label="Pastki menyu">
            <div className="lp-footer__col">
              <h3>Mahsulot</h3>
              <ul>
                <li><a href="#imkoniyatlar">Imkoniyatlar</a></li>
                <li><a href="#qanday-ishlaydi">Qanday ishlaydi</a></li>
                <li><a href="#hamkorlar">Hamkorlar</a></li>
                <li><a href="#savollar">Savollar</a></li>
              </ul>
            </div>
            <div className="lp-footer__col">
              <h3>Boshlash</h3>
              <ul>
                <li><a href={BOT_URL} target="_blank" rel="noopener">Telegram: {BOT_HANDLE}</a></li>
                <li><a href={LOGIN_URL}>Kompyuterda kirish</a></li>
              </ul>
            </div>
            <div className="lp-footer__col">
              <h3>Hujjatlar</h3>
              <ul>
                <li><a href="/maxfiylik">Maxfiylik</a></li>
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
