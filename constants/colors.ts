import colors from 'tailwindcss/colors'

export const customColors = {
  'sm-primary': {
    '50': '#e9fafa',
    '100': '#cff2f1',
    '200': '#b6ecea',
    '300': '#9be4e0',
    '400': '#72d5d1',
    '500': '#30bbb7',
    '600': '#30aba9',
    '700': '#299e9c',
    '800': '#208d8d',
    '900': '#1a7e7f'
  }
} as const

export const extendedColors = {
  ...colors,
  ...customColors
} as const
