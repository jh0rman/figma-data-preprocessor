import { FigmaAPI } from './api/figma'

const figmaApi = new FigmaAPI(Bun.env.FIGMA_TOKEN)

const files = await figmaApi.getFile('XKcrDkQkxdiDOzwR9ljdfV')

Bun.write('figma.json', JSON.stringify(files, null, 2))