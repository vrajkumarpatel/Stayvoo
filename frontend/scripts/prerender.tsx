import fs from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import Navbar from '../src/components/Navbar'
import Home from '../src/pages/Home'
import Contact from '../src/pages/Contact'
import ExclusiveHotels from '../src/pages/ExclusiveHotels'
import GroupBooking from '../src/pages/GroupBooking'
import About from '../src/pages/About'

const TRAVEL_AGENCY_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'TravelAgency',
  name: 'Stayvoo LLC',
  url: 'https://stayvoo.com',
  areaServed: ['Milwaukee', 'Waukesha', 'Brookfield', 'Kenosha', 'Racine', 'Chicago'],
}

const ROUTES: {
  routePath: string
  Component: React.ComponentType
  outDir: string
  jsonLd?: object
  preloadImage?: string
  title?: string
  description?: string
}[] = [
  { routePath: '/', Component: Home, outDir: '', jsonLd: TRAVEL_AGENCY_SCHEMA, preloadImage: '/images/hero-bg.webp' },
  {
    routePath: '/contact',
    Component: Contact,
    outDir: 'contact',
    title: 'Contact & Get a Quote | Stayvoo | Milwaukee Area & Chicagoland',
    description: "Tell us your dates, headcount, and stay type. Stayvoo responds same-day with a negotiated rate for extended stays and group room blocks in the Milwaukee Area and Chicagoland.",
  },
  {
    routePath: '/exclusive',
    Component: ExclusiveHotels,
    outDir: 'exclusive',
    preloadImage: '/images/exclusive-hero.webp',
    title: 'Extended Stay Rates | Milwaukee Area Hotels | Stayvoo',
    description: 'Weekly and monthly rates for travel nurses, relocations, project assignments, and medical stays at partner hotels in the Milwaukee Area and Chicagoland.',
  },
  {
    routePath: '/groups',
    Component: GroupBooking,
    outDir: 'groups',
    preloadImage: '/images/groups-hero.webp',
    title: 'Group Hotel Bookings | Milwaukee Area & Chicagoland | Stayvoo',
    description: 'Room blocks for weddings, sports teams, conferences, and corporate travel: one coordinator, one negotiated rate, one consolidated bill, in the Milwaukee Area and Chicagoland.',
  },
  {
    routePath: '/about',
    Component: About,
    outDir: 'about',
    title: 'About Stayvoo | Extended Stay & Group Booking Agency | Milwaukee & Chicagoland',
    description: 'Stayvoo is a commission-based booking agency serving the Milwaukee Area and Chicagoland, working with a small set of partner hotels we know room by room for extended stays and group room blocks.',
  },
]

const distDir = path.resolve(process.cwd(), 'dist')
const template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8')

for (const { routePath, Component, outDir, jsonLd, preloadImage, title, description } of ROUTES) {
  const appHtml = renderToStaticMarkup(
    <StaticRouter location={routePath}>
      <Navbar />
      <Component />
    </StaticRouter>
  )

  let pageHtml = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)

  if (title) {
    pageHtml = pageHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
  }
  if (description) {
    pageHtml = pageHtml
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${description}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${description}$2`)
  }

  let headExtras = ''
  if (jsonLd) {
    headExtras += `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
  }
  if (preloadImage) {
    headExtras += `<link rel="preload" as="image" fetchpriority="high" href="${preloadImage}">`
  }
  if (headExtras) {
    pageHtml = pageHtml.replace('</head>', `${headExtras}</head>`)
  }

  const targetDir = outDir ? path.join(distDir, outDir) : distDir
  fs.mkdirSync(targetDir, { recursive: true })
  fs.writeFileSync(path.join(targetDir, 'index.html'), pageHtml)
  console.log(`Prerendered ${routePath} -> ${path.relative(distDir, path.join(targetDir, 'index.html'))}`)
}
