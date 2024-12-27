export class FigmaAPI {
  BASE_URL = 'https://api.figma.com/v1'
  FIGMA_HEADERS = {}

  constructor(private token: string | undefined) {
    if (!token) throw new Error('Figma token is required')
    this.FIGMA_HEADERS = {
      'X-Figma-Token': this.token
    }
  }

  async getFile(fileKey: string) {
    const response = await fetch(`${this.BASE_URL}/files/${fileKey}`, {
      headers: this.FIGMA_HEADERS
    })
    return response.json()
  }
}