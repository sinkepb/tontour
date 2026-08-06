import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Sépare les dépendances stables (React, routeur, client Supabase) de notre
        // code applicatif : elles changent rarement, ce chunk reste donc en cache
        // navigateur d'un déploiement à l'autre au lieu d'être retéléchargé à chaque fois.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
