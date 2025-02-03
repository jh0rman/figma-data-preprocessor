interface RGB {
  r: number
  g: number
  b: number
}

interface RGBA extends RGB {
  a: number
}

interface ColorToken {
  name: string
  shade: string
}

type ColorValue = string | Record<string, string>

export class ColorParser {
  private readonly colorTokenMap: Map<string, ColorToken>
  private readonly DEPRECATED_COLORS = ['lightBlue', 'warmGray', 'trueGray', 'coolGray', 'blueGray']

  constructor(private colors: Record<string, ColorValue>) {
    this.colorTokenMap = new Map()
    this.initializeColorTokenMap()
  }

  private initializeColorTokenMap(): void {
    const colorNames = Object.keys(this.colors).filter(this.isValidColorName.bind(this))

    colorNames.forEach(name => {
      const colorShades = this.colors[name] as Record<string, string>
      Object.entries(colorShades).forEach(([shade, hexColor]) => {
        if (typeof hexColor === 'string') {
          const rgb = this.hexToRgb(hexColor)
          if (rgb) {
            const key = this.rgbToKey(rgb)
            this.colorTokenMap.set(key, { name, shade })
          }
        }
      })
    })
  }

  private isValidColorName(name: string): boolean {
    return !this.DEPRECATED_COLORS.includes(name) &&
           typeof this.colors[name] === 'object' &&
           !Array.isArray(this.colors[name])
  }

  private hexToRgb(hex: string): RGB | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : null
  }

  private rgbToKey({ r, g, b }: RGB): string {
    return [r, g, b]
      .map(value => Math.round(value * 255))
      .join(',')
  }

  findExactColorToken(color: RGBA): string | null {
    // Manejar transparencia
    if (color.a === 0) return 'transparent'
    
    const rgb = this.rgbToKey(color)
    
    // Manejar colores especiales
    if (rgb === '0,0,0') return 'black'
    if (rgb === '255,255,255') return 'white'

    // Buscar en el mapa de colores
    const token = this.colorTokenMap.get(rgb)
    return token ? `${token.name}-${token.shade}` : null
  }
}
