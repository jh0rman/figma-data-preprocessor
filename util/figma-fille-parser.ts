export class FigmaFileParser {
  rootNodes: Record<string, any>[]
  prototypeStartNodeID: string | null = null

  constructor(private file: Record<string, any>) {
    const canvasNodes = this.file.document.children || []
    this.rootNodes = canvasNodes[0].children || []
    this.prototypeStartNodeID = canvasNodes[1].prototypeStartNodeID
  }

  getPrototypeStartNodeID() {
    return this.prototypeStartNodeID
  }

  cleanData() {
    const result = []
    result.push(...this.rootNodes.map(n => this.traverse(n)).filter(Boolean))
    return result
  }

  private traverse(node: Record<string, any>) {
    const element: Record<string, any> = {}

    if (node.type === 'TEXT') {
      element.type = 'text'
      element.content = node.characters
      element.style = node.style
    } else if (node.type === 'FRAME' || node.type === 'GROUP') {
      element.type = 'container'
      element.name = node.name
      element.children = node.children ? node.children.map(this.traverse).filter(Boolean) : []
    } else if (node.type === 'RECTANGLE') {
      element.type = 'box'
      element.backgroundColor = node.backgroundColor
    }

    return element.type ? element : null
  }
}