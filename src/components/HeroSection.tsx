import { useState } from 'react'

const LOGO_TEXT = 'IWA Consolti'
const NAV_LINKS = [
  { label: 'Inicio', href: '#' },
  { label: 'Acerca de', href: '#' },
  { label: 'Servicios', href: '#' },
  { label: 'Industrias', href: '#' },
  { label: 'Contacto', href: '#' },
]
const HERO_HEADING = 'Es hora de Hablar'
const HERO_SUBHEADING =
  'Nuestro equipo altamente capacitado y experimentado está listo para colaborar contigo y brindarte un servicio excepcional.'

export default function HeroSection() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav className="fixed top-0 right-0 left-0 z-40 bg-dark/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="text-xl font-bold tracking-tight text-white">
            {LOGO_TEXT}
          </a>

          <ul className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="text-sm text-gray-light transition-colors hover:text-white">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#"
            className="hidden rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80 md:inline-block"
          >
            Contáctanos
          </a>

          <button
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="flex flex-col gap-1.5 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={`h-0.5 w-6 bg-white transition-transform ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`h-0.5 w-6 bg-white transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`h-0.5 w-6 bg-white transition-transform ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-dark px-6 pb-6 md:hidden">
            <ul className="flex flex-col gap-4 pt-4">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-light transition-colors hover:text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <a href="#" className="mt-4 inline-block rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white">
              Contáctanos
            </a>
          </div>
        )}
      </nav>

      <section className="relative flex min-h-screen items-center overflow-hidden bg-dark">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-24 pb-16 text-center md:text-left">
          <h1 className="text-4xl leading-tight font-extrabold text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {HERO_HEADING}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-light md:mx-0">
            {HERO_SUBHEADING}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row md:justify-start">
            <a href="#" className="rounded-full bg-primary px-8 py-3 font-semibold text-white shadow-lg transition-opacity hover:opacity-80">
              Contáctanos
            </a>
            <a href="#" className="rounded-full border border-white/30 px-8 py-3 font-semibold text-white transition-colors hover:bg-white/10">
              Conoce más
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
