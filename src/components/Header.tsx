import Logo from "./icons/Logo"

export const Header = () => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 md:px-8">
        <Logo />
      </div>
    </header>
  )
}
