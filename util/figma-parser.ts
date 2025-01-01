export class FigmaParser {
  private readonly DEFAULT_FONT = 'Inter'

  rootNodes: Record<string, any>[]
  prototypeStartNodeID: string | undefined

  constructor(private file: Record<string, any>) {
    const canvasNodes = this.file.document.children || []
    this.rootNodes = canvasNodes[0]?.children || []
    this.prototypeStartNodeID = canvasNodes[1]?.prototypeStartNodeID
  }

  getStartNodeID(): string | undefined {
    return this.prototypeStartNodeID
  }

  getNodeByID(nodeId: string): any | null {
    return this.searchNode(this.file.document, nodeId)
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

    if (node.visible === false) {
      console.log('Data node', node.name)
    }
    
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
      const { r, g, b, a } = node.backgroundColor
      styles.backgroundColor = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`
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
        const { r, g, b, a } = stroke.color
        styles.border = `1px solid rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`
      }
    }

    // Effects (shadows)
    if (node.effects && node.effects.length > 0) {
      const shadows = node.effects
        .filter((effect: any) => effect.type === 'DROP_SHADOW')
        .map((effect: any) => {
          const { r, g, b, a } = effect.color
          return `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`
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

  private findNodeByName(nodes: any[], nodeName: string): any[] | undefined {
    for (const node of nodes) {
      if (node.name === nodeName) {
        return node.children || []
      }
      if (node.children) {
        const result = this.findNodeByName(node.children, nodeName)
        if (result) return result
      }
    }
    return undefined
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

    const actionsChildren = this.findNodeByName(node.children || [], '.buttons-heading')    

    return {
      name: 'SPageHeading',
      type: 'COMPONENT',
      props: {
        title: props['Title:#3530:14']?.value,
        description: props['Description#3530:11']?.value ? props['Description:#3530:13']?.value : undefined,
        breadcrumbs: props['Breadcrumbs#3530:12']?.value ? [] : undefined // todo: handle breadcrumbs
      },
      slots: {
        actions: actionsChildren?.map((child: any) => this.parseNode(child)).filter(Boolean) || []
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
    const baseStyles = {
      fontFamily: style.fontFamily !== this.DEFAULT_FONT ? style.fontFamily : undefined,
      fontWeight: style.fontWeight,
      fontSize: `${style.fontSize}px`,
      textAlign: style.textAlignHorizontal?.toLowerCase(),
      letterSpacing: `${style.letterSpacing}px`,
      lineHeight: style.lineHeightUnit === 'PIXELS' 
        ? `${style.lineHeightPx}px` 
        : `${style.lineHeightPercent}%`
    }

    // Si no hay overrides, retornar texto simple
    if (!node.characterStyleOverrides || !node.styleOverrideTable) {
      return {
        name: 'p',
        type: 'HTML',
        styles: baseStyles,
        content: node.characters
      }
    }

    // Agrupar caracteres por estilo
    const textGroups: { style: any, text: string }[] = []
    let currentStyle = '0' // Estilo base
    let currentText = ''

    node.characters.split('').forEach((char: string, index: number) => {
      const styleIndex = node.characterStyleOverrides[index]
      const styleKey = styleIndex ? styleIndex.toString() : '0'
      
      if (styleKey !== currentStyle) {
        if (currentText) {
          textGroups.push({
            style: currentStyle === '0' ? baseStyles : this.getStyleFromOverride(node.styleOverrideTable[currentStyle]),
            text: currentText
          })
        }
        currentStyle = styleKey
        currentText = char
      } else {
        currentText += char
      }
    })

    // Agregar el último grupo
    if (currentText) {
      textGroups.push({
        style: currentStyle === '0' ? baseStyles : this.getStyleFromOverride(node.styleOverrideTable[currentStyle]),
        text: currentText
      })
    }

    // Si solo hay un grupo de texto, retornar estructura simple
    if (textGroups.length === 1) {
      return {
        name: 'p',
        type: 'HTML',
        styles: textGroups[0].style,
        content: textGroups[0].text
      }
    }

    // Si hay múltiples grupos, retornar estructura con children
    return {
      name: 'p',
      type: 'HTML',
      styles: {
        display: 'inline-flex',
        alignItems: 'baseline',
      },
      children: textGroups.map(group => ({
        type: 'span',
        styles: group.style,
        content: group.text
      }))
    }
  }

  private getStyleFromOverride(override: any): Record<string, any> {
    if (!override) return {}

    const style: Record<string, any> = {
      fontFamily: override.fontFamily !== this.DEFAULT_FONT ? override.fontFamily : undefined,
      fontWeight: override.fontWeight,
      fontSize: `${override.fontSize}px`,
      letterSpacing: `${override.letterSpacing}px`,
      lineHeight: override.lineHeightUnit === 'PIXELS' 
        ? `${override.lineHeightPx}px` 
        : `${override.lineHeightPercent}%`
    }

    // Agregar color si existe
    if (override.fills?.[0]?.color) {
      const { r, g, b, a } = override.fills[0].color
      style.color = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`
    }

    return style
  }

  private extractEmptyStateData(node: Record<string, any>): any {
    const props = node.componentProperties || {}
    
    const actionButton = this.findNodeByName(node.children || [], '.empty-state-actions')?.[0]
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
    
    const defaultSlot = this.findNodeByName(node.children || [], 'Slot')
    const footerLeftContent = this.findNodeByName(node.children || [], 'Left content')
    const footerRightContent = this.findNodeByName(node.children || [], 'Right content')

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
}
