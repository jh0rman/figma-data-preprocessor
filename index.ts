import { FigmaAPI } from './api/figma'

const figmaApi = new FigmaAPI(Bun.env.FIGMA_TOKEN)
const FIGMA_FILE_KEY = 'XKcrDkQkxdiDOzwR9ljdfV'

// const files = await figmaApi.getFile(FIGMA_FILE_KEY)
// Bun.write('figma.json', JSON.stringify(files, null, 2))

import { FigmaFileParser } from './util/figma-fille-parser'

const file = await import ('./figma.json')
const parser = new FigmaFileParser(file.default)
const prototypeStartNodeID = parser.getPrototypeStartNodeID()

if (!prototypeStartNodeID) {
  throw new Error('Prototype start node ID not found')
}

const startNodeData = await figmaApi.getFile(FIGMA_FILE_KEY, { ids: prototypeStartNodeID })
Bun.write('start-node.json', JSON.stringify(startNodeData, null, 2))
