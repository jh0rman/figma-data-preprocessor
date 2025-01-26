import colors from 'tailwindcss/colors'

// Extender colors con los colores de Simón
const customColors = {
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

const extendedColors = {
  ...colors,
  ...customColors
}

export class FigmaParser {
  private readonly DEFAULT_FONT = 'Inter'
  private readonly colorTokenMap: Map<string, { name: string, shade: string }> = new Map()
  private readonly DEPRECATED_COLORS = ['lightBlue', 'warmGray', 'trueGray', 'coolGray', 'blueGray']

  document: Record<string, any>
  rootNodes: Record<string, any>[]
  prototypeStartNodeID: string | undefined

  constructor(private file: Record<string, any>) {
    this.initializeColorTokenMap()
    
    this.document = this.filterVisibleNodes(this.file.document)
    const canvasNodes = this.document.children || []
    this.rootNodes = canvasNodes[0]?.children || []
    this.prototypeStartNodeID = canvasNodes[1]?.prototypeStartNodeID
  }

  private initializeColorTokenMap() {
    const colorNames = Object.keys(extendedColors)
      .filter(name => 
        !this.DEPRECATED_COLORS.includes(name) &&
        typeof extendedColors[name as keyof typeof extendedColors] === 'object' &&
        !Array.isArray(extendedColors[name as keyof typeof extendedColors])
      )

    colorNames.forEach(name => {
      const colorShades = extendedColors[name as keyof typeof extendedColors]
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

  private hexToRgb(hex: string): { r: number, g: number, b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : null
  }

  private rgbToKey(color: { r: number, g: number, b: number }): string {
    return `${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)}`
  }

  private findExactColorToken(color: { r: number, g: number, b: number, a?: number }): string | null {
    // Manejar colores especiales primero
    if (color.a === 0) return 'transparent'
    
    const rgb = this.rgbToKey(color)
    
    // Manejar black y white
    if (rgb === '0,0,0') return 'black'
    if (rgb === '255,255,255') return 'white'

    // Buscar en el mapa de colores personalizados
    return this.colorTokenMap.has(rgb) 
      ? `${this.colorTokenMap.get(rgb)!.name}-${this.colorTokenMap.get(rgb)!.shade}`
      : null
  }

  getStartNodeID(): string | undefined {
    return this.prototypeStartNodeID
  }

  getNodeByID(nodeId: string): any | null {
    return this.searchNode(this.document, nodeId)
  }

  private searchNode(node: any, nodeId: string): any | null {
    if (!node) return null
    if (node.id === nodeId) return node

    if (node.children) {
      for (const child of node.children) {
        const result = this.searchNode(child, nodeId)
        if (result) return result
      }
    }
    return null
  }

  filterVisibleNodes(node: any): any | null {
    if (!node || node.visible === false) return null

    if (node.children) {
      node.children = node.children
        .map((child: any) => this.filterVisibleNodes(child))
        .filter(Boolean)
    }

    return node
  }

  parseNodes(): any[] {
    return this.rootNodes.map((node) => this.parseNode(node)).filter(Boolean)
  }

  parseNode(node: Record<string, any>): any | null {
    let element: Record<string, any> = {}

    switch (node.type) {
      case 'FRAME':
        element = this.extractFrameData(node)
        break

      case 'INSTANCE':
        element = this.extractInstanceData(node)
        break

      case 'TEXT':
        element = this.extractTextData(node)
        break

      default:
        console.warn(`Unknown node type: ${node.type}`)
        break
    }

    return Object.keys(element).length > 0 ? element : null
  }

  private extractFrameData(node: Record<string, any>): any {
    const styles = this.extractFrameStyles(node)
    
    return {
      originalName: node.name,
      name: 'div',
      type: 'HTML',
      styles,
      children: node.children?.map((child: any) => this.parseNode(child)).filter(Boolean) || [],
    }
  }

  private extractFrameStyles(node: Record<string, any>): Record<string, any> {
    const styles: Record<string, any> = {}

    // Layout mode
    if (node.layoutMode) {
      styles.display = node.layoutMode === 'GRID' ? 'grid' : 'flex'
      styles.flexDirection = node.layoutMode === 'VERTICAL' ? 'column' : 'row'
    }

    // Sizing
    if (node.primaryAxisSizingMode === 'FIXED') {
      styles.width = node.size?.width ? `${node.size.width}px` : 'auto'
    }
    if (node.counterAxisSizingMode === 'FIXED') {
      styles.height = node.size?.height ? `${node.size.height}px` : 'auto'
    }

    // Alignment
    if (node.layoutAlign) {
      switch (node.layoutAlign) {
        case 'STRETCH':
          styles.alignSelf = 'stretch'
          break
        case 'INHERIT':
          styles.alignSelf = 'inherit'
          break
        case 'MIN':
          styles.alignSelf = 'flex-start'
          break
        case 'MAX':
          styles.alignSelf = 'flex-end'
          break
        case 'CENTER':
          styles.alignSelf = 'center'
          break
      }
    }

    // Grow
    if (node.layoutGrow !== undefined) {
      styles.flexGrow = node.layoutGrow
    }

    // Background
    if (node.backgroundColor) {
      const colorToken = this.findExactColorToken(node.backgroundColor)
      if (colorToken) {
        if (colorToken !== 'transparent') {
          styles.backgroundColor = colorToken
        }
      } else {
        const { r, g, b, a } = node.backgroundColor
        if (a !== 0) {
          styles.backgroundColor = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`
        }
      }
    }

    // Clipping
    if (node.clipsContent) {
      styles.overflow = 'hidden'
    }

    // Border radius
    if (node.cornerRadius) {
      styles.borderRadius = `${node.cornerRadius}px`
    }

    // Strokes (borders)
    if (node.strokes && node.strokes.length > 0) {
      const stroke = node.strokes[0]
      if (stroke.type === 'SOLID') {
        const colorToken = this.findExactColorToken(stroke.color)
        if (colorToken) {
          styles.border = `1px solid ${colorToken}`
        } else {
          const { r, g, b, a } = stroke.color
          styles.border = `1px solid rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`
        }
      }
    }

    // Effects (shadows)
    if (node.effects && node.effects.length > 0) {
      const shadows = node.effects
        .filter((effect: any) => effect.type === 'DROP_SHADOW')
        .map((effect: any) => {
          const colorToken = this.findExactColorToken(effect.color)
          if (colorToken) {
            return `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${colorToken}`
          } else {
            const { r, g, b, a } = effect.color
            return `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`
          }
        })
      if (shadows.length > 0) {
        styles.boxShadow = shadows.join(', ')
      }
    }

    // Padding
    if (node.paddingTop || node.paddingRight || node.paddingBottom || node.paddingLeft) {
      styles.padding = `${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px`
    }

    // Gap (itemSpacing)
    if (node.itemSpacing) {
      styles.gap = `${node.itemSpacing}px`
    }

    return styles
  }

  private extractInstanceData(node: Record<string, any>): any {
    if (node.name === 'Button') {
      return this.extractButtonData(node)
    } else if (node.name === 'Page heading') {
      return this.extractPageHeadingData(node)
    } else if (node.name === 'Empty-state') {
      return this.extractEmptyStateData(node)
    } else if (node.name === 'Modal V2 (NEW)') {
      return this.extractModalData(node)
    } else if (node.name === 'Dropdown') {
      return this.extractDropdownData(node)
    } else if (node.name === 'Table') {
      return this.extractTableData(node)
    } else {
      console.log('Instance node', node.name)
      // Tratar como FRAME si no es un componente identificado
      const styles = this.extractFrameStyles(node)
      
      return {
        name: 'div',
        type: 'HTML',
        styles,
        children: node.children?.map((child: any) => this.parseNode(child)).filter(Boolean) || [],
      }
    }
  }

  private findNodeByName(nodes: any[], nodeName: string): any | undefined {
    for (const node of nodes) {
      if (node.name === nodeName) {
        return node
      }
      if (node.children) {
        const result = this.findNodeByName(node.children, nodeName)
        if (result) return result
      }
    }
    return undefined
  }

  private findNodesByName(nodes: any[], nodeName: string): any[] {
    let results: any[] = []
    
    for (const node of nodes) {
      if (node.name === nodeName) {
        results.push(node)
      }
      if (node.children) {
        results = results.concat(this.findNodesByName(node.children, nodeName))
      }
    }
    
    return results
  }

  private findNodeByComponentId(nodes: any[], nodeId: string): any | undefined {
    for (const node of nodes) {
      if (node.componentId === nodeId) {
        return node
      }
      if (node.children) {
        const result = this.findNodeByComponentId(node.children, nodeId)
        if (result) return result
      }
    }
    return undefined
  }

  private extractPageHeadingData(node: Record<string, any>): any {
    const props = node.componentProperties || {}

    const actionsContainer = this.findNodeByName(node.children || [], '.buttons-heading')    

    return {
      name: 'SPageHeading',
      type: 'COMPONENT',
      props: {
        title: props['Title:#3530:14']?.value,
        description: props['Description#3530:11']?.value ? props['Description:#3530:13']?.value : undefined,
        breadcrumbs: props['Breadcrumbs#3530:12']?.value ? [] : undefined // todo: handle breadcrumbs
      },
      slots: {
        actions: actionsContainer?.children?.map((child: any) => this.parseNode(child)).filter(Boolean) || []
      },
    }
  }

  private extractButtonData(node: Record<string, any>): any {
    const props = node.componentProperties || {}

    const emphasisMap: Record<string, string> = {
      'Filled': 'filled',
      'Subtle': 'subtle',
      'Outline': 'outline',
      'Ghost': 'text'
    }

    const typeMap: Record<string, string> = {
      'Default': 'default',
      'Destructive': 'destructive',
      'Contrast': 'reversed'
    }
    
    const sizeMap: Record<string, string> = {
      'S': 'small',
      'M': 'medium',
      'L': 'large'
    }

    const iconLeftNode = props['Leading Icon#4089:5']?.value 
      ? this.findNodeByComponentId(node.children || [], props['Change leading#4089:18']?.value)
      : undefined

    const iconRightNode = props['Trailing Icon#4089:31']?.value 
      ? this.findNodeByComponentId(node.children || [], props['Change trailing#4089:44']?.value)
      : undefined
      // iconLeft: props['Leading Icon#4089:5']?.value ? props['Change leading#4089:18']?.value : undefined,
      // iconRight: props['Trailing Icon#4089:31']?.value ? props['Change trailing#4089:44']?.value : undefined,
    return {
      name: 'SButton',
      type: 'COMPONENT',
      props: {
        label: props['Label#4090:4']?.value,
        emphasis: emphasisMap[props['Emphasis']?.value],
        type: typeMap[props['Type']?.value],
        size: sizeMap[props['Size']?.value],
        iconLeft: iconLeftNode?.name,
        iconRight: iconRightNode?.name,
        disabled: props['State']?.value === 'Disabled',
        loading: props['State']?.value === 'Loading'
      }
    }
  }

  private extractTextData(node: Record<string, any>): any {
    const style = node.style || {}
    const fills = node.fills || []
    
    const styles: Record<string, any> = {
      fontFamily: style.fontFamily !== this.DEFAULT_FONT ? style.fontFamily : undefined,
      fontWeight: style.fontWeight,
      fontSize: `${style.fontSize}px`,
      textAlign: style.textAlignHorizontal?.toLowerCase(),
      letterSpacing: `${style.letterSpacing}px`,
      lineHeight: style.lineHeightUnit === 'PIXELS' 
        ? `${style.lineHeightPx}px` 
        : `${style.lineHeightPercent}%`
    }

    // Agregar color si existe
    if (fills[0]?.color) {
      const colorToken = this.findExactColorToken(fills[0].color)
      if (colorToken) {
        styles.color = colorToken
      } else {
        const { r, g, b, a } = fills[0].color
        styles.color = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`
      }
    }

    return {
      name: 'p',
      type: 'HTML',
      styles,
      content: node.characters
    }
  }

  private extractEmptyStateData(node: Record<string, any>): any {
    const props = node.componentProperties || {}

    const actionButton = this.findNodeByName(node.children || [], '.empty-state-actions')?.children?.[0]
    const actionLabel = actionButton?.componentProperties?.['Label#4090:4']?.value
    const generalIcon = props['Icon#4470:25']?.value
      ? this.findNodeByComponentId(node.children || [], props['Icon:#4470:20']?.value)
      : undefined

    const onClickInteraction = actionButton?.interactions?.find(
      (interaction: any) => interaction.trigger?.type === 'ON_CLICK'
    )
    const destinationId = onClickInteraction?.actions?.[0]?.destinationId
    const destinationNode = destinationId ? this.getNodeByID(destinationId) : undefined

    return {
      name: 'SEmptyState',
      type: 'COMPONENT',
      props: {
        title: props['Title#4470:0']?.value,
        description: props['Description#4470:5']?.value ? props['Description:#4470:10']?.value : undefined,
        generalIcon: generalIcon?.name,
        action: props['CTA#4470:15']?.value ? {
          label: actionLabel,
          icon: undefined, // todo: handle icon
        } : undefined,
        isOnComponent: props['type']?.value === 'Subtle'
      },
      events: {
        clickAction: destinationNode ? this.parseNode(destinationNode) : undefined
      }
    }
  }

  private extractModalData(node: Record<string, any>): any {
    const props = node.componentProperties || {}
    
    const defaultSlot = this.findNodeByName(node.children || [], 'Slot')?.children
    const footerLeftContent = this.findNodeByName(node.children || [], 'Left content')?.children
    const footerRightContent = this.findNodeByName(node.children || [], 'Right content')?.children

    return {
      name: 'SModal',
      type: 'COMPONENT',
      props: {
        title: props['Title#9821:8']?.value,
        description: props['Description#9821:6']?.value ? props['Description:#10037:6']?.value : undefined,
        size: props['Size']?.value?.toLowerCase(),
        footer: props['Footer#9821:7']?.value,
        showCloseIcon: props['Close button#9821:9']?.value,
        backBtn: props['Back button#9821:10']?.value,
        cancelText: footerRightContent?.[0]?.componentProperties?.['Label#4090:4']?.value,
        successText: footerRightContent?.[1]?.componentProperties?.['Label#4090:4']?.value,
      },
      slots: {
        default: defaultSlot?.map((child: any) => this.parseNode(child)).filter(Boolean) || [],
        'footer-left-content': footerLeftContent?.map((child: any) => this.parseNode(child)).filter(Boolean) || []
      }
    }
  }

  private extractDropdownData(node: Record<string, any>): any {
    const props = node.componentProperties || {}
    
    const sizeMap: Record<string, string> = {
      'S': 'small',
      'M': 'medium',
      'L': 'large'
    }

    return {
      name: 'SDropdown',
      type: 'COMPONENT',
      props: {
        label: props['Label#8297:0']?.value ? props['Label:#6833:585']?.value : undefined,
        placeholder: props['Placeholder:#6833:582']?.value,
        supportiveText: props['Supportive text#6833:588']?.value ? props['Supportive text:#6833:584']?.value : undefined,
        size: sizeMap[props['Size']?.value],
        disabled: props['State']?.value === 'Disabled',
        loading: props['State']?.value === 'Loading',
        success: props['State']?.value === 'Success',
        error: props['State']?.value === 'Error' ? 'Error message' : undefined, // todo: handle error
        search: props['Search#9821:11']?.value,
        multiple: props['Multiple#9821:12']?.value,
        options: [], // Las opciones se deben pasar desde el componente padre
        labelIcon: props['Label icon#9821:13']?.value ? 'info' : undefined,
        supportiveIcon: props['Supportive icon#9821:14']?.value ? 'info' : undefined,
        canDeselect: true,
        markType:
          props['Mark required#6833:577']?.value
            ? 'required'
            : props['Mark Optional#6833:583']?.value
              ? 'optional'
              : undefined,
        magic: props['State']?.value === 'Magic Loading',
        readonly: props['State']?.value === 'Read only',
      }
    }
  }

  private extractTableData(node: Record<string, any>): any {
    const props = node.componentProperties || {}

    // Extraer configuración de columnas del header
    const headerContainer = this.findNodeByName(node.children || [], '.Table row header')?.children?.[0]
    const headerCells = headerContainer?.children?.filter((child: any) => child.type === 'INSTANCE') || []

    const columnConfig = headerCells.map((headerCell: any) => {
      const cellProps = headerCell.componentProperties || {}
      return {
        name: headerCell.name,
        label: cellProps['Text:#5000:0']?.value,
        // filterable: cellProps['Sort']?.value !== 'None',
        order: cellProps['Is sortable']?.value === 'True',
        headerAlign: cellProps['Alignment']?.value?.toLowerCase(),
        // bodyAlign: cellProps['Body align#9821:31']?.value?.toLowerCase(),
      }
    })

    // Extraer datos de las filas
    const tableRows = this.findNodesByName(node.children || [], '.Table row')
    const rows = tableRows.map((row: any) => {
      const rowData: Record<string, any> = {}
      const cells = row.children?.[0]?.children?.filter((child: any) => child.type === 'INSTANCE') || []
      
      cells.forEach((cell: any) => {
        const textContainer = this.findNodeByName(cell.children, 'text-container')
        rowData[cell.name] = textContainer?.children?.[0].characters
      })
      return rowData
    })

    // Extraer información de paginación
    const paginationContainer = this.findNodeByName(node.children || [], '.Pagination')
    const paginationProps = paginationContainer?.componentProperties || {}

    const toolbarContainer = this.findNodeByName(node.children || [], '.table-toolbar')
    
    return {
      name: 'STable',
      type: 'COMPONENT',
      props: {
        rows,
        total: rows.length,
        columnConfig,
        paginationFullMode: paginationProps['Minimal']?.value === 'False',
      },
      slots: {
        toolbar: toolbarContainer?.children?.map((child: any) => this.parseNode(child)).filter(Boolean) || [],
      }
    }
  }
}
