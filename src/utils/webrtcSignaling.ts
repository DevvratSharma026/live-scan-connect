export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'ready';
  sessionId: string;
  role: 'sender' | 'receiver';
  data?: any;
}

export class WebRTCSignaling {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private role: 'sender' | 'receiver';
  private onMessage: (message: SignalingMessage) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(
    sessionId: string, 
    role: 'sender' | 'receiver', 
    onMessage: (message: SignalingMessage) => void
  ) {
    this.sessionId = sessionId;
    this.role = role;
    this.onMessage = onMessage;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/api/signaling`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          // Join the session
          this.send({
            type: 'join',
            sessionId: this.sessionId,
            role: this.role
          });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data);
            this.onMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.ws = null;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect().catch(console.error);
      }, 2000 * this.reconnectAttempts);
    }
  }

  send(message: Partial<SignalingMessage>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...message,
        sessionId: this.sessionId,
        role: this.role
      }));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}