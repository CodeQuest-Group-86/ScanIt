import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[var(--color-near-black)] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
        <Logo size={28} dark />
        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} ScanIt. Know it&apos;s real before you buy it.
        </p>
      </div>
    </footer>
  )
}
