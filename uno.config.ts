import { defineConfig, presetIcons, presetWind3 } from 'unocss'

export default defineConfig({
  presets: [presetWind3(), presetIcons()],
  theme: {
    animation: {
      keyframes: {
        'fade-in-out': `{
          0% { opacity: 0; }
          10%, 80% { opacity: 1; }
          100% { opacity: 0; }
        }`
      },
      durations: {
        'fade-in-out': '3s'
      },
      timingFns: {
        'fade-in-out': 'ease-in-out'
      }
    }
  }
})
