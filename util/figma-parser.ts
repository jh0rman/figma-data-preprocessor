export class FigmaParser {
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

      case 'GROUP':
        element = {
          type: 'container',
          name: node.name,
          children: node.children?.map((child: any) => this.parseNode(child)).filter(Boolean) || [],
        }
        break

      case 'RECTANGLE':
        element = {
          type: 'box',
          backgroundColor: node.backgroundColor,
        }
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
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      layoutMode: node.layoutMode,
      primaryAxisSizingMode: node.primaryAxisSizingMode,
      counterAxisSizingMode: node.counterAxisSizingMode,
      counterAxisAlignItems: node.counterAxisAlignItems,
      layoutAlign: node.layoutAlign,
      layoutGrow: node.layoutGrow,
      size: node.absoluteBoundingBox
        ? {
            width: node.absoluteBoundingBox.width,
            height: node.absoluteBoundingBox.height,
          }
        : null,
      constraints: node.constraints,
      clipsContent: node.clipsContent,
      backgroundColor: node.backgroundColor,
      overflowDirection: node.overflowDirection,
      children: node.children?.map((child: any) => this.parseNode(child)).filter(Boolean) || [],
    }
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
