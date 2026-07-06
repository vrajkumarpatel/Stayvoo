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
  telephone: '+1-888-352-8151',
  email: 'hello@stayvoo.com',
  url: 'https://stayvoo.com',
  areaServed: ['Milwaukee', 'Waukesha', 'Brookfield', 'Kenosha', 'Racine', 'Chicago'],
}

const ROUTES: { routePath: string; Component: React.ComponentType; outDir: string; jsonLd?: object }[] = [
  { routePath: '/', Component: Home, outDir: '', jsonLd: TRAVEL_AGENCY_SCHEMA },
  { routePath: '/contact', Component: Contact, outDir: 'contact' },
  { routePath: '/exclusive', Component: ExclusiveHotels, outDir: 'exclusive' },
  { routePath: '/groups', Component: GroupBooking, outDir: 'groups' },
  { routePath: '/about', Component: About, outDir: 'about' },
]

const distDir = path.resolve(process.cwd(), 'dist')
const template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8')

for (const { routePath, Component, outDir, jsonLd } of ROUTES) {
  const appHtml = renderToStaticMarkup(
    <StaticRouter location={routePath}>
      <Navbar />
      <Component />
    </StaticRouter>
  )

  let pageHtml = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)

  if (jsonLd) {
    const script = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
    pageHtml = pageHtml.replace('</head>', `${script}</head>`)
  }

  const targetDir = outDir ? path.join(distDir, outDir) : distDir
  fs.mkdirSync(targetDir, { recursive: true })
  fs.writeFileSync(path.join(targetDir, 'index.html'), pageHtml)
  console.log(`Prerendered ${routePath} -> ${path.relative(distDir, path.join(targetDir, 'index.html'))}`)
}
