import { motion } from "framer-motion"
import { Moon, Sun } from "lucide-react"
import Logo from "./icons/Logo"

type HeaderProps = {
  theme: "dark" | "light"
  onToggleTheme: () => void
}

export const Header = ({ theme, onToggleTheme }: HeaderProps) => {
  return (
    <header className="bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4 md:px-8 xl:max-w-7xl xl:px-10 2xl:max-w-[1500px] 2xl:px-12">
        <motion.button
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={onToggleTheme}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
            theme === "dark"
              ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-zinc-100"
              : "border-zinc-300 bg-white text-zinc-700 hover:text-zinc-900"
          }`}
          title={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>
        <Logo className="text-zinc-100" />
      </div>
    </header>
  )
}
