import { WebRTCSignaling, SignalingMessage } from './webrtcSignaling';

export class WebRTCConnection {
  private peerConnection: RTCPeerConnection;
  private signaling: WebRTCSignaling;
  private role: 'sender' | 'receiver';
  private sessionId: string;
  private localStream: MediaStream | null = null;
  private onRemoteStream?: (stream: MediaStream) => void;
  private onConnectionStateChange?: (state: string) => void;

  constructor(
    sessionId: string,
    role: 'sender' | 'receiver',
    onRemoteStream?: (stream: MediaStream) => void,
    onConnectionStateChange?: (state: string) => void
  ) {
    this.sessionId = sessionId;
    this.role = role;
    this.onRemoteStream = onRemoteStream;
    this.onConnectionStateChange = onConnectionStateChange;

    // Configure peer connection with STUN server
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    this.setupPeerConnection();
    this.signaling = new WebRTCSignaling(sessionId, role, this.handleSignalingMessage.bind(this));
  }

  private setupPeerConnection() {
    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send({
          type: 'ice-candidate',
          data: event.candidate
        });
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote stream');
      if (this.onRemoteStream && event.streams[0]) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };
  }

  async startSender(): Promise<void> {
    try {
      // Get user media (camera + mic)
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: true
      });

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Connect to signaling server
      await this.signaling.connect();

    } catch (error) {
      console.error('Error starting sender:', error);
      throw error;
    }
  }

  async startReceiver(): Promise<void> {
    try {
      // Connect to signaling server
      await this.signaling.connect();
    } catch (error) {
      console.error('Error starting receiver:', error);
      throw error;
    }
  }

  private async handleSignalingMessage(message: SignalingMessage) {
    console.log('Received signaling message:', message.type);

    switch (message.type) {
      case 'ready':
        // Receiver is ready, sender should create offer
        if (this.role === 'sender') {
          await this.createOffer();
        }
        break;

      case 'offer':
        if (this.role === 'receiver') {
          await this.handleOffer(message.data);
        }
        break;

      case 'answer':
        if (this.role === 'sender') {
          await this.handleAnswer(message.data);
        }
        break;

      case 'ice-candidate':
        await this.handleIceCandidate(message.data);
        break;
    }
  }

  private async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.signaling.send({
        type: 'offer',
        data: offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    try {
      await this.peerConnection.setRemoteDescription(offer);
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.signaling.send({
        type: 'answer',
        data: answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    try {
      await this.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  disconnect() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    this.peerConnection.close();
    this.signaling.disconnect();
  }
}