#!/usr/bin/env node
// EIN MENY, SKRIVEN INN I ALLE SIDENE.
//
//   node scripts/nav.mjs           skriv menyen inn i kvar side
//   node scripts/nav.mjs --check   seier berre om nokon har drive frå malen (exit 1 om ja)
//
// KVIFOR DETTE FINST
//
// Menyen låg som handskriven markup TO gonger i kvar av 38 sider, altså 76 kopiar. Ein gransking
// fann at dei hadde blitt til ÅTTE ULIKE MENYAR:
//
//   - `/tjenester` heitte «Tenester» på 9 sider og «Sjekk» på 11 andre. Same URL, to namn.
//   - `/en/services` heitte «Services» på 8 og «Check» på 10.
//   - «Utviklar» fanst på 14 sider og mangla på 24.
//   - tjenester.html og sjekk.html var USAMDE MED SEG SJØLVE: 7 punkt på desktop, 6 på mobil, og
//     det manglande var Blogg. Du kunne nå bloggen på maskina og ikkje på telefonen.
//   - Ti sider hadde ingen mobilmeny i det heile. `.nav` blir skyvd av skjermen under 769px, og
//     hamburgaren fanst ikkje i markupen, så Glimt og Hourwell sine vilkår-, personvern- og
//     kontoslettingssider var blindvegar på telefon. Det er nettopp dei sidene App Store lenkar inn i.
//
// Ingen av dei skilnadene var eit val. Dei er det som skjer med 76 kopiar over tid.
//
// Same løysing som `generate-shaders.mjs` i glimt-native: generer og commit resultatet, og la
// `--check` i testsuiten vere det som hindrar at dei driv frå kvarandre igjen.
//
// KVA SKRIPTET EIG
//
// Alt mellom NAV-BEGIN og NAV-END: begge <nav>-ane, hamburgaren og skuffa. Sida sjølv eig berre
// kva URL ho er, og kva ho lenkar til på det andre språket, og begge delar les skriptet ut av
// taggane som alt står i <head>.

import { readFileSync, writeFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BEGIN = '<!-- NAV-BEGIN generert av scripts/nav.mjs, ikkje rediger for hand -->'
const END = '<!-- NAV-END -->'

// ── Menyen. Endrar du noko her, endrar du det på alle 38 sidene. ────────────────────────────────
const ITEMS = {
  nn: [
    ['/om-meg', 'Om meg'],
    ['/utviklar', 'Utviklar'],
    ['/lyd', 'Lyd'],
    ['/apps', 'Apps'],
    ['/tjenester', 'Tenester'],
    ['/blogg', 'Blogg'],
    ['/kontakt', 'Kontakt'],
  ],
  en: [
    ['/en/about', 'About'],
    ['/en/sound', 'Sound'],
    ['/en/apps', 'Apps'],
    ['/en/services', 'Services'],
    ['/en/blog', 'Blog'],
    ['/en/contact', 'Contact'],
  ],
}

const SOCIAL = [
  ['https://www.instagram.com/dynni.wav', 'Instagram', 'fab fa-instagram'],
  ['https://github.com/DYNNIwav', 'GitHub', 'fab fa-github'],
  ['https://www.linkedin.com/in/dynni', 'LinkedIn', 'fab fa-linkedin'],
]

const T = {
  nn: { menu: 'Meny', main: 'Hovudmeny', home: '/', logo: 'DYNNI logo' },
  en: { menu: 'Menu', main: 'Main menu', home: '/en/', logo: 'DYNNI logo' },
}

// ── Bygging ────────────────────────────────────────────────────────────────────────────────────

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

/** `aria-current="page"` er det einaste som fortel kven som helst, sjåande eller med skjermlesar,
 *  kva for ei av sju lenker som er sida dei står på. Det fanst null gonger på heile nettstaden. */
function list(lang, currentUrl, indent) {
  const i = ' '.repeat(indent)
  const rows = ITEMS[lang].map(([href, label]) => {
    const current = href === currentUrl ? ' aria-current="page"' : ''
    return `${i}  <li><a href="${href}"${current}>${esc(label)}</a></li>`
  })
  return `${i}<ul class="nav-links-main">\n${rows.join('\n')}\n${i}</ul>`
}

function social(indent) {
  const i = ' '.repeat(indent)
  const rows = SOCIAL.map(
    ([href, label, icon]) =>
      `${i}  <li>\n` +
      `${i}    <a href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${label}"\n` +
      `${i}      ><i class="${icon}"></i\n` +
      `${i}    ></a>\n` +
      `${i}  </li>`,
  )
  return `${i}<ul class="nav-links-social">\n${rows.join('\n')}\n${i}</ul>`
}

function langSwitch(lang, nnHref, enHref, indent) {
  const i = ' '.repeat(indent)
  const a = (href, text, on) =>
    `${i}  <a href="${href}"${on ? ' class="active" aria-current="true"' : ''}>${text}</a>`
  return `${i}<div class="lang-switch">\n${a(nnHref, 'NO', lang === 'nn')}\n${a(enHref, 'EN', lang === 'en')}\n${i}</div>`
}

function header(lang, currentUrl, nnHref, enHref, logoSrc) {
  const t = T[lang]
  return `${BEGIN}
      <nav class="nav" aria-label="${t.main}">
        <a class="logo" href="${t.home}"
          ><img src="${logoSrc}" alt="${t.logo}"
        /></a>

${list(lang, currentUrl, 8)}

        <span class="sidebar-text">© DYNNI 2026</span>

${social(8)}
${langSwitch(lang, nnHref, enHref, 8)}
      </nav>

      <!-- HAMBURGAREN ER AVKRYSSINGSBOKSEN, IKKJE ETIKETTEN.
           Boksen var «display: none», og eit element som ikkje blir rendra kan ikkje få fokus. Etiketten
           er ikkje fokuserbar av seg sjølv og hadde korkje tekst, aria-label eller rolle, så det
           tilgjengelege namnet var tomt. Ein tastaturbrukar på telefon tabba gjennom 13 usynlege lenker
           og kunne så ikkje opne menyen i det heile.
           No: boksen ligg synleg for maskina men gjennomsiktig oppå knappen, med sitt eige namn, og
           etiketten er «aria-hidden» fordi han berre er dei tre strekane. Framleis null JavaScript. -->
      <div class="hamburger-menu">
        <input type="checkbox" id="menu-toggle" class="menu-toggle" aria-label="${t.menu}" />
        <label for="menu-toggle" class="hamburger-btn" aria-hidden="true">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </label>

        <div class="mobile-nav-overlay">
          <nav class="mobile-nav" aria-label="${t.main}">
            <div class="mobile-nav-content">
              <a class="logo" href="${t.home}">
                <img src="${logoSrc}" alt="${t.logo}" />
              </a>

${list(lang, currentUrl, 14)}

              <span class="sidebar-text">© DYNNI 2026</span>

${social(14)}
${langSwitch(lang, nnHref, enHref, 14)}
            </div>
          </nav>
        </div>
      </div>
      ${END}`
}

// ── Sider ──────────────────────────────────────────────────────────────────────────────────────

function htmlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['dist', 'node_modules', '.astro', '.git', 'public'].includes(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) htmlFiles(p, out)
    else if (name.endsWith('.html')) out.push(p)
  }
  return out
}

/** Sida veit sjølv kva URL ho er og kva ho svarar til på det andre språket: begge står alt som
 *  <link rel="canonical"> og <link rel="alternate" hreflang>. Å lese dei derfrå er betre enn å
 *  halde endå ei tabell, som ville vore ein 77. kopi av den same kunnskapen. */
function pageFacts(src, file) {
  const lang = /<html lang="(nn|en)"/.exec(src)?.[1]
  const strip = (u) => (u ? u.replace(/^https:\/\/dynni\.no/, '') || '/' : null)
  const nn = strip(/<link rel="alternate" hreflang="nn" href="([^"]+)"/.exec(src)?.[1])
  const en = strip(/<link rel="alternate" hreflang="en" href="([^"]+)"/.exec(src)?.[1])
  const canonical = strip(/<link rel="canonical" href="([^"]+)"/.exec(src)?.[1])
  const depth = relative(ROOT, file).split('/').length - 1
  const logo = (depth ? '../'.repeat(depth) : './') + 'assets/img/logo/dynni-logo.svg'
  return { lang, nn, en, canonical, logo }
}

const check = process.argv.includes('--check')
const stale = []
let written = 0

for (const file of htmlFiles(ROOT)) {
  const src = readFileSync(file, 'utf8')
  if (!src.includes('class="site-header"')) continue

  const { lang, nn, en, canonical, logo } = pageFacts(src, file)
  const rel = relative(ROOT, file)
  if (!lang) {
    console.error(`  ${rel}: manglar <html lang>, hoppa over`)
    continue
  }
  // Sider utan eigen motpart peikar til framsida på det andre språket, slik dei alt gjorde.
  const wanted = header(lang, canonical, nn ?? '/', en ?? '/en/', logo)

  let out
  if (src.includes(BEGIN)) {
    out = src.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), wanted)
  } else {
    // Fyrste gong: byt ut alt mellom <header class="site-header"> og </header>.
    const m = /(<header class="site-header">\n)[\s\S]*?(\n\s*<\/header>)/.exec(src)
    if (!m) {
      console.error(`  ${rel}: fann ikkje <header class="site-header">…</header>`)
      continue
    }
    out = src.replace(m[0], `${m[1]}      ${wanted}${m[2]}`)
  }

  if (out === src) continue
  if (check) stale.push(rel)
  else {
    writeFileSync(file, out)
    written++
  }
}

if (check) {
  if (stale.length) {
    console.error('Desse sidene har ein meny som ikkje er den i scripts/nav.mjs:\n  ' + stale.join('\n  '))
    console.error('\nKøyr:  node scripts/nav.mjs')
    process.exit(1)
  }
  console.log('Alle sider har same meny.')
} else {
  console.log(`Menyen skriven inn i ${written} sider.`)
}
