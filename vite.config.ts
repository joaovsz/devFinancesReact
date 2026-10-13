import { defineConfig, loadEnv, type Plugin } from "vite"
import react from "@vitejs/plugin-react"

// Injeta a meta tag do Google Search Console apenas quando o token estiver definido.
function googleSiteVerification(token?: string): Plugin {
  return {
    name: "google-site-verification",
    transformIndexHtml() {
      if (!token) return []
      return [
        {
          tag: "meta",
          attrs: { name: "google-site-verification", content: token },
          injectTo: "head"
        }
      ]
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  return {
    plugins: [
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"]
        }
      }),
      googleSiteVerification(env.VITE_GOOGLE_SITE_VERIFICATION)
    ],
    test: {
      environment: "jsdom",
      globals: true
    }
  }
})
