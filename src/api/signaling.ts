// WebSocket signaling server for WebRTC
// Note: This would typically be a separate Node.js server
// For this demo, we'll simulate the signaling logic

export interface Session {
  id: string;
  sender?: WebSocket;
  receiver?: WebSocket;
}

const sessions = new Map<string, Session>();

export function handleWebSocketConnection(ws: WebSocket, request: Request) {
  console.log('New WebSocket connection');

  ws.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      handleSignalingMessage(ws, message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.addEventListener('close', () => {
    console.log('WebSocket disconnected');
    // Clean up sessions
    for (const [sessionId, session] of sessions) {
      if (session.sender === ws) {
        session.sender = undefined;
      }
      if (session.receiver === ws) {
        session.receiver = undefined;
      }
      
      // Remove empty sessions
      if (!session.sender && !session.receiver) {
        sessions.delete(sessionId);
      }
    }
  });
}

function handleSignalingMessage(ws: WebSocket, message: any) {
  const { type, sessionId, role, data } = message;
  
  console.log(`Handling ${type} from ${role} in session ${sessionId}`);

  // Get or create session
  let session = sessions.get(sessionId);
  if (!session) {
    session = { id: sessionId };
    sessions.set(sessionId, session);
  }

  switch (type) {
    case 'join':
      if (role === 'sender') {
        session.sender = ws;
      } else if (role === 'receiver') {
        session.receiver = ws;
      }
      
      // If both are connected, tell sender that receiver is ready
      if (session.sender && session.receiver && role === 'receiver') {
        sendToSender(session, { type: 'ready', sessionId, role: 'receiver' });
      }
      break;

    case 'offer':
      if (session.receiver) {
        sendToReceiver(session, { type: 'offer', sessionId, role, data });
      }
      break;

    case 'answer':
      if (session.sender) {
        sendToSender(session, { type: 'answer', sessionId, role, data });
      }
      break;

    case 'ice-candidate':
      // Forward ICE candidates to the other peer
      if (role === 'sender' && session.receiver) {
        sendToReceiver(session, { type: 'ice-candidate', sessionId, role, data });
      } else if (role === 'receiver' && session.sender) {
        sendToSender(session, { type: 'ice-candidate', sessionId, role, data });
      }
      break;
  }
}

function sendToSender(session: Session, message: any) {
  if (session.sender?.readyState === WebSocket.OPEN) {
    session.sender.send(JSON.stringify(message));
  }
}

function sendToReceiver(session: Session, message: any) {
  if (session.receiver?.readyState === WebSocket.OPEN) {
    session.receiver.send(JSON.stringify(message));
  }
}