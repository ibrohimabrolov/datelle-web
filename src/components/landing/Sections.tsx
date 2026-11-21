import { BRAND } from "@/config/brand";
import type { Copy } from "./copy";
import { BOT_HANDLE, BOT_URL, LOGIN_URL } from "./data";
import { Faq } from "./Faq";
import { IconBot, IconFloreal, IconHozir, IconJamoa, IconKalendar, IconPul, Step1, Step2, Step3 } from "./icons";
import { Tour } from "./Tour";
import { Cta, Eyebrow, Img, Lines, ListItem, Logo, Meter, SectionHead } from "./ui";

/* Raqamlar (273:327) */
export function Stats({ t }: { t: Copy }) {
  return (
    <section className="lp-stats" aria-label={t.a11y.stats}>
      {t.stats.map((s, i) => (
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
export function Compare({ t }: { t: Copy }) {
  const c = t.compare;
  return (
    <section className="lp-section" aria-labelledby="h-oldin">
      <SectionHead id="h-oldin" eyebrow={c.eyebrow} title={c.title} text={<Lines lines={c.text} />} />
      <div className="lp-compare">
        <article className="lp-ccard">
          <div className="lp-ccard__media">
            <Img src="/landing/3d-hozir.webp" alt="" width={1200} height={675} loading="lazy" />
          </div>
          <div className="lp-ccard__body">
            <div className="lp-ccard__head">
              <span className="lp-badge lp-caps"><IconHozir />{c.before.badge}</span>
              <h3 className="lp-card-title">{c.before.title}</h3>
            </div>
            <ul className="lp-list">
              {c.before.items.map((x) => <ListItem key={x} type="cross">{x}</ListItem>)}
            </ul>
          </div>
        </article>
        <article className="lp-ccard lp-ccard--brand">
          <div className="lp-ccard__media">
            <Img src="/landing/3d-floreal.webp" alt="" width={1200} height={675} loading="lazy" />
          </div>
          <div className="lp-ccard__body">
            <div className="lp-ccard__head">
              <span className="lp-badge lp-caps"><IconFloreal />{c.after.badge}</span>
              <h3 className="lp-card-title">{c.after.title}</h3>
            </div>
            <ul className="lp-list">
              {c.after.items.map((x) => <ListItem key={x}>{x}</ListItem>)}
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}

/* Ichkaridan koʻring (268:789) */
export function Product({ t }: { t: Copy }) {
  return (
    <section className="lp-section" aria-labelledby="h-ichkaridan">
      <div className="lp-head">
        <div className="lp-head__title">
          <Eyebrow>{t.product.eyebrow}</Eyebrow>
          <h2 className="lp-h2" id="h-ichkaridan">{t.product.title}</h2>
        </div>
        <Cta href={BOT_URL} tone="brand">{t.cta.startFree}</Cta>
      </div>
      <Tour t={t} />
    </section>
  );
}

const FEATURE_ICON = { kalendar: IconKalendar, pul: IconPul, jamoa: IconJamoa, bot: IconBot };

/* Imkoniyatlar (179:605) */
export function Features({ t }: { t: Copy }) {
  const f0 = t.features;
  return (
    <section className="lp-section" id="imkoniyatlar" aria-labelledby="h-imk">
      <div className="lp-container lp-stack">
        <SectionHead id="h-imk" eyebrow={f0.eyebrow} title={f0.title} text={f0.text} />
        <div className="lp-features">
          {f0.items.map((f) => {
            const Icon = FEATURE_ICON[f.icon as keyof typeof FEATURE_ICON];
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
export function Steps({ t }: { t: Copy }) {
  return (
    <section className="lp-section" id="qanday-ishlaydi" aria-labelledby="h-qadam">
      <div className="lp-container lp-stack">
        <SectionHead id="h-qadam" eyebrow={t.steps.eyebrow} title={t.steps.title} />
        <ol className="lp-steps" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {t.steps.items.map((s, i) => {
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

type Plan = Copy["pricing"]["plans"]["monthly"];

function PlanCard({ p, split, t }: { p: Plan; split?: boolean; t: Copy }) {
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
        <span className="lp-caps">{t.pricing.includes}</span>
        <ul className="lp-list">{p.includes.map((t) => <ListItem key={t}>{t}</ListItem>)}</ul>
      </div>
      <a className="lp-btn lp-btn--secondary" href={BOT_URL} target="_blank" rel="noopener">{t.cta.start}</a>
    </article>
  );
}

/* Narxlar (274:1529). Middle card = the free first month (every studio starts here), flanked by what comes after. */
export function Pricing({ t }: { t: Copy }) {
  const { monthly: m, trial: f, yearly: y } = t.pricing.plans;
  return (
    <section className="lp-section" id="narxlar" aria-labelledby="h-narx">
      <SectionHead id="h-narx" eyebrow={t.pricing.eyebrow} title={t.pricing.title} text={t.pricing.text} />
      <div className="lp-plans">
        <PlanCard p={m} split t={t} />
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
            <span className="lp-caps">{t.pricing.includes}</span>
            <ul className="lp-list">{f.includes.map((t) => <ListItem key={t} tone="onbrand">{t}</ListItem>)}</ul>
          </div>
          <Cta href={BOT_URL} tone="light" block>{t.pricing.trialCta}</Cta>
        </article>
        <PlanCard p={y} t={t} />
      </div>
    </section>
  );
}

/* Hamkorlar (235:752) — logo wall, placeholders until the first studios join. Desktop only (hidden in Figma Mobile/Tablet). */
export function Partners({ t }: { t: Copy }) {
  return (
    <section className="lp-section lp-d-only" id="hamkorlar" aria-labelledby="h-hamkor">
      <SectionHead id="h-hamkor" eyebrow={t.partners.eyebrow} title={t.partners.title} text={t.partners.text} />
      <div className="lp-wall" role="img" aria-label={t.a11y.wall}>
        {Array.from({ length: 10 }, (_, i) => (
          <div className="lp-wall__cell" key={i}><span className="lp-wall__slot" /></div>
        ))}
      </div>
    </section>
  );
}

/* Savollar (179:677) */
export function Questions({ t }: { t: Copy }) {
  return (
    <section className="lp-section" id="savollar" aria-labelledby="h-savol">
      <div className="lp-faq-wrap">
        <div className="lp-head__title">
          <Eyebrow>{t.questions.eyebrow}</Eyebrow>
          <h2 className="lp-h2" id="h-savol">{t.questions.title}</h2>
          <p className="lp-body"><Lines lines={t.questions.text} /></p>
        </div>
        <Faq t={t} />
      </div>
    </section>
  );
}

/* Marquee (179:701) */
export function Marquee({ t }: { t: Copy }) {
  return (
    <a className="lp-marquee" href={BOT_URL} target="_blank" rel="noopener">
      <span className="lp-sr">{t.cta.telegram}</span>
      {/* 3 identical units; the track loops by exactly one unit (−33.333%) */}
      <span className="lp-marquee__track" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ display: "contents" }}>
            <span>{t.cta.telegram}</span>
            <i />
          </span>
        ))}
      </span>
    </a>
  );
}

/* Footer · B — Bogʻ (263:20242) */
export function Footer({ t }: { t: Copy }) {
  const ft = t.footer;
  return (
    <footer className="lp-footer">
      <div className="lp-footer__card">
        <div className="lp-footer__art" aria-hidden>
          <Img src="/landing/footer-art.webp" alt="" width={1536} height={864} loading="lazy" />
        </div>
        <div className="lp-footer__top">
          <div className="lp-footer__brand">
            <Logo />
            <p className="lp-body"><Lines lines={ft.text} /></p>
            <Cta href={BOT_URL} tone="brand">{t.cta.telegram}</Cta>
          </div>
          <nav className="lp-footer__links" aria-label={t.a11y.footerNav}>
            <div className="lp-footer__col">
              <h3>{ft.product}</h3>
              <ul>
                <li><a href="#imkoniyatlar">{t.nav[0].label}</a></li>
                <li><a href="#qanday-ishlaydi">{t.nav[1].label}</a></li>
                <li className="lp-d-only"><a href="#hamkorlar">{ft.partnersLink}</a></li>
                <li><a href="#savollar">{t.nav[2].label}</a></li>
              </ul>
            </div>
            <div className="lp-footer__col">
              <h3>{ft.start}</h3>
              <ul>
                <li><a href={BOT_URL} target="_blank" rel="noopener">Telegram: {BOT_HANDLE}</a></li>
                <li><a href={LOGIN_URL}>{ft.desktopLogin}</a></li>
              </ul>
            </div>
            <div className="lp-footer__col">
              <h3>{ft.docs}</h3>
              <ul>
                <li><a href="/maxfiylik">{ft.privacy}</a></li>
              </ul>
            </div>
            <div className="lp-footer__col">
              <h3>{ft.contact}</h3>
              <ul>
                <li><a href={`tel:${BRAND.phoneE164}`}>{BRAND.phone}</a></li>
                <li><address>{ft.address}</address></li>
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
