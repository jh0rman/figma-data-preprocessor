import { FigmaAPI } from './api/figma'

const figmaApi = new FigmaAPI(Bun.env.FIGMA_TOKEN)
const FIGMA_FILE_KEY = '1e2ZsLwkNC0k0DeoRM6ndw'

// const files = await figmaApi.getFile(FIGMA_FILE_KEY)
// Bun.write('figma.json', JSON.stringify(files, null, 2))

import { FigmaParser } from './util/figma-parser'

const file = await import ('./figma.json')
const parser = new FigmaParser(file.default)
// const prototypeStartNodeID = parser.getPrototypeStartNodeID()

// if (!prototypeStartNodeID) {
//   throw new Error('Prototype start node ID not found')
// }

// const startNodeData = await figmaApi.getFile(FIGMA_FILE_KEY, { ids: '365:28499' })
let result = parser.getNodeByID('4:10215')
result = parser.filterVisibleNodes(result)
result = parser.parseNode(result.children[1].children[1].children[1])
Bun.write('start-node.json', JSON.stringify(result, null, 2))
