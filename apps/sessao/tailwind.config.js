// Tokens UNIDAVI — ver docs/anexos/tokens-unidavi.md (fonte de verdade).
// Tipografia: IBM Plex Sans (decidido — alinhar ao ecossistema MED-UNIDAVI 2027).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        blue: '#023E88',
        blueAcc: '#00ADEF',
        blueDark: '#012D65',
        blueLight: '#E6EDF8',
        blueMid: '#0353B0',
        terra: '#C4622D',
        terraLight: '#FDF0EA',
        red: '#BE3B3B',
        redLight: '#FBEBEB',
        green: '#2A8A5C',
        greenLight: '#E6F4ED',
        amber: '#B07A18',
        amberLight: '#FDF5E0',
        bg: '#F5F7FC',
        surface: '#FFFFFF',
        border: '#DDE3F0',
        borderLight: '#EEF1F8',
        text: '#1A2438',
        textSec: '#5A6480',
        textMuted: '#6E7891',
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        md: '10px',
        lg: '14px',
      },
      boxShadow: {
        DEFAULT: '0 1px 4px rgba(26,36,56,0.08)',
        md: '0 4px 16px rgba(26,36,56,0.10)',
        lg: '0 12px 32px rgba(26,36,56,0.16)',
      },
    },
  },
  plugins: [],
}
