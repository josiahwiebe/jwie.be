/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: ['./templates/**/*.php', './content/**/*.md', './public/**/*.php'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-heading)', ...defaultTheme.fontFamily.sans],
        body: defaultTheme.fontFamily.sans,
        mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        primary: 'var(--color-primary)',
        primaryInvert: 'var(--color-primary-invert)',
        trueblack: 'var(--color-trueblack)',
        black: 'var(--color-black)',
        darkgrey: 'var(--color-darkgrey)',
        mediumgrey: 'var(--color-mediumgrey)',
        lightgrey: 'var(--color-lightgrey)',
        code: 'var(--color-code)',
      },
      backgroundImage: {
        'gradient-primary':
          'linear-gradient(135deg, hsla(55, 61%, 85%, 1) 0%, hsla(196, 79%, 79%, 1) 50%, hsla(358, 82%, 71%, 1) 100%)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
