export type FigmaNode = {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
  componentId?: string
  visible?: boolean
  [key: string]: any
}

type NodePredicate = (node: FigmaNode) => boolean
type NodeTransform<T> = (node: FigmaNode) => T

export class NodeFinder {
  /**
   * Encuentra el primer nodo que coincida con el predicado
   */
  static findNode(nodes: FigmaNode[], predicate: NodePredicate): FigmaNode | undefined {
    for (const node of nodes) {
      if (predicate(node)) {
        return node
      }
      if (node.children?.length) {
        const result = this.findNode(node.children, predicate)
        if (result) return result
      }
    }
    return undefined
  }

  /**
   * Encuentra todos los nodos que coincidan con el predicado
   */
  static findNodes(nodes: FigmaNode[], predicate: NodePredicate): FigmaNode[] {
    const results: FigmaNode[] = []
    
    for (const node of nodes) {
      if (predicate(node)) {
        results.push(node)
      }
      if (node.children?.length) {
        results.push(...this.findNodes(node.children, predicate))
      }
    }
    
    return results
  }

  /**
   * Encuentra un nodo por su ID
   */
  static findNodeById(node: FigmaNode | null, id: string): FigmaNode | undefined {
    return NodeFinder.searchNode(node, id)
  }

  static searchNode(node: any, nodeId: string): any | null {
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

  /**
   * Encuentra un nodo por su nombre
   */
  static findNodeByName(nodes: FigmaNode[], name: string): FigmaNode | undefined {
    return NodeFinder.findNode(nodes, node => node.name === name)
  }

  /**
   * Encuentra todos los nodos por nombre
   */
  static findNodesByName(nodes: FigmaNode[], name: string): FigmaNode[] {
    return NodeFinder.findNodes(nodes, node => node.name === name)
  }

  /**
   * Encuentra un nodo por su componentId
   */
  static findNodeByComponentId(nodes: FigmaNode[], componentId: string): FigmaNode | undefined {
    return NodeFinder.findNode(nodes, node => node.componentId === componentId)
  }

  /**
   * Filtra nodos visibles recursivamente
   */
  static filterVisibleNodes(node: FigmaNode): FigmaNode | null {
    if (!node || node.visible === false) return null

    const filteredNode = { ...node }
    
    if (node.children?.length) {
      filteredNode.children = node.children
        .map(child => this.filterVisibleNodes(child))
        .filter((child): child is FigmaNode => child !== null)
    }

    return filteredNode
  }

  /**
   * Mapea nodos recursivamente aplicando una transformación
   */
  static mapNodes<T>(nodes: FigmaNode[], transform: NodeTransform<T>): T[] {
    return nodes
      .map(node => transform(node))
      .filter((result): result is T => result !== null)
  }
}
