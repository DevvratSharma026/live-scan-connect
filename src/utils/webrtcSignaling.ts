export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'ready';
  sessionId: string;
  role: 'sender' | 'receiver';
  data?: any;
}

export class WebRTCSignaling {
  private sessionId: string;
  private role: 'sender' | 'receiver';
  private onMessage: (message: SignalingMessage) => void;
  private pollInterval: number | null = null;
  private lastPollTime = 0;

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
    return new Promise((resolve) => {
      console.log(`Starting simple signaling for ${this.role} in session ${this.sessionId}`);
      
      // Start polling for messages
      this.startPolling();
      
      // For demo purposes, simulate connection
      setTimeout(() => {
        if (this.role === 'receiver') {
          // Simulate sender joining
          setTimeout(() => {
            this.onMessage({
              type: 'ready',
              sessionId: this.sessionId,
              role: 'sender'
            });
          }, 1000);
        }
        resolve();
      }, 500);
    });
  }

  private startPolling() {
    // Simple localStorage-based signaling for demo
    this.pollInterval = window.setInterval(() => {
      this.checkForMessages();
    }, 1000);
  }

  private checkForMessages() {
    const now = Date.now();
    const storageKey = `webrtc_${this.sessionId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const messages = JSON.parse(stored);
        const newMessages = messages.filter((msg: any) => 
          msg.timestamp > this.lastPollTime && 
          msg.targetRole === this.role
        );
        
        newMessages.forEach((msg: any) => {
          this.onMessage({
            type: msg.type,
            sessionId: this.sessionId,
            role: msg.role,
            data: msg.data
          });
        });
        
        if (newMessages.length > 0) {
          this.lastPollTime = now;
        }
      } catch (error) {
        console.error('Error parsing stored messages:', error);
      }
    }
  }

  send(message: Partial<SignalingMessage>) {
    console.log(`Sending ${message.type} from ${this.role}`);
    
    // Store message in localStorage for the other peer
    const storageKey = `webrtc_${this.sessionId}`;
    const stored = localStorage.getItem(storageKey);
    let messages = [];
    
    if (stored) {
      try {
        messages = JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored messages:', error);
      }
    }
    
    const targetRole = this.role === 'sender' ? 'receiver' : 'sender';
    
    messages.push({
      ...message,
      role: this.role,
      targetRole,
      timestamp: Date.now()
    });
    
    // Keep only recent messages (last 10 minutes)
    const cutoff = Date.now() - 10 * 60 * 1000;
    messages = messages.filter((msg: any) => msg.timestamp > cutoff);
    
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }

  disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    // Clean up storage
    const storageKey = `webrtc_${this.sessionId}`;
    localStorage.removeItem(storageKey);
  }
}