import type { IncomingMessage, Server as NodeHttpServer } from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'
import authService from '#services/auth_service'

const webSocketServer = new WebSocketServer({
  noServer: true,
  handleProtocols(protocols) {
    return protocols.has('chamada-discipulado') ? 'chamada-discipulado' : false
  },
})
const socketCongregations = new Map<WebSocket, string>()

webSocketServer.on('connection', (socket, request) => {
  const url = new URL(request.url || '/', 'http://localhost')
  socketCongregations.set(socket, url.searchParams.get('congregationId') || '')
  socket.on('close', () => socketCongregations.delete(socket))
})

export function attachQuizWebSocketServer(server: NodeHttpServer) {
  server.on('upgrade', async (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || '/', 'http://localhost')
    if (url.pathname !== '/ws') return socket.destroy()
    const offeredProtocols = request.headers['sec-websocket-protocol'] || ''
    const protocols = offeredProtocols.split(',').map((protocol) => protocol.trim())
    const authToken = protocols.find((protocol) => protocol !== 'chamada-discipulado') || ''
    const congregationId = url.searchParams.get('congregationId') || ''
    if (!(await authService.verifyToken(authToken)) || !congregationId) return socket.destroy()
    webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
      webSocketServer.emit('connection', webSocket, request)
    })
  })
}

export function publishQuizUpdate(congregationId: string, quiz: Record<string, unknown>) {
  const event = JSON.stringify({ type: 'quiz.updated', quiz })
  for (const [socket, socketCongregationId] of socketCongregations) {
    if (socketCongregationId === congregationId && socket.readyState === WebSocket.OPEN) {
      socket.send(event)
    }
  }
}
