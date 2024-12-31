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
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      componentId: node.componentId,
      componentProperties: node.componentProperties || {},
      boundVariables: node.boundVariables || {},
      overrides: node.overrides || [],
      layoutMode: node.layoutMode,
      padding: {
        top: node.paddingTop,
        right: node.paddingRight,
        bottom: node.paddingBottom,
        left: node.paddingLeft,
      },
      itemSpacing: node.itemSpacing,
      constraints: node.constraints,
      size: node.absoluteBoundingBox
        ? {
            width: node.absoluteBoundingBox.width,
            height: node.absoluteBoundingBox.height,
          }
        : null,
      children: node.children?.map((child: any) => this.parseNode(child)).filter(Boolean) || [],
    }
  }

  private extractTextData(node: Record<string, any>): any {
    return {
      type: node.type,
      content: node.characters,
      style: {
        fontFamily: node.style?.fontFamily,
        fontStyle: node.style?.fontStyle,
        fontWeight: node.style?.fontWeight,
        fontSize: node.style?.fontSize,
        textAlignHorizontal: node.style?.textAlignHorizontal,
        textAlignVertical: node.style?.textAlignVertical,
        letterSpacing: node.style?.letterSpacing,
        lineHeight: {
          px: node.style?.lineHeightPx,
          unit: node.style?.lineHeightUnit,
        },
      },
    }
  }
}
