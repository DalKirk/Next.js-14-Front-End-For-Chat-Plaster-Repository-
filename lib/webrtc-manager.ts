// WebRTC P2P Connection Manager
// Handles peer-to-peer video streaming between broadcaster and viewers

type PeerConnection = {
  connection: RTCPeerConnection;
  userId: string;
  username: string;
};

class WebRTCManager {
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private isBroadcaster = false;
  private onRemoteStreamCallback?: (userId: string, stream: MediaStream) => void;
  private onPeerDisconnectedCallback?: (userId: string) => void;

  // STUN servers for NAT traversal (free public servers)
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  // Set local stream (broadcaster's camera)
  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    this.isBroadcaster = true;
    console.log('📹 Local stream set:', stream.id);
  }

  // Create peer connection for a viewer
  async createPeerConnection(
    userId: string,
    username: string,
    isOfferer: boolean,
    signalCallback: (userId: string, signal: any) => void
  ): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });

    // Add local stream tracks (if broadcaster)
    if (this.localStream && this.isBroadcaster) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
        console.log('➕ Added track to peer:', track.kind);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalCallback(userId, {
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming stream (viewer receives broadcaster's stream)
    pc.ontrack = (event) => {
      console.log('📥 Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.onRemoteStreamCallback?.(userId, event.streams[0]);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state [${username}]:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.removePeer(userId);
        this.onPeerDisconnectedCallback?.(userId);
      }
    };

    // Store peer connection
    this.peers.set(userId, { connection: pc, userId, username });

    // Create offer if this peer is the offerer
    if (isOfferer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signalCallback(userId, {
        type: 'offer',
        sdp: offer,
      });
    }

    return pc;
  }

  // Handle incoming WebRTC signals
  async handleSignal(userId: string, signal: any, signalCallback: (userId: string, signal: any) => void) {
    let peer = this.peers.get(userId);

    // Create peer connection if it doesn't exist
    if (!peer) {
      const username = signal.username || 'Unknown';
      await this.createPeerConnection(userId, username, false, signalCallback);
      peer = this.peers.get(userId);
    }

    if (!peer) return;

    const pc = peer.connection;

    try {
      switch (signal.type) {
        case 'offer':
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          signalCallback(userId, {
            type: 'answer',
            sdp: answer,
          });
          break;

        case 'answer':
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          break;

        case 'ice-candidate':
          if (signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
          break;

        default:
          console.warn('Unknown signal type:', signal.type);
      }
    } catch (error) {
      console.error('❌ Error handling signal:', error);
    }
  }

  // Set callback for when remote stream is received
  onRemoteStream(callback: (userId: string, stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  // Set callback for when peer disconnects
  onPeerDisconnected(callback: (userId: string) => void) {
    this.onPeerDisconnectedCallback = callback;
  }

  // Remove peer connection
  removePeer(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.connection.close();
      this.peers.delete(userId);
      console.log('🗑️ Removed peer:', userId);
    }
  }

  // Clean up all connections
  cleanup() {
    console.log('🧹 Cleaning up WebRTC connections');
    this.peers.forEach(peer => peer.connection.close());
    this.peers.clear();
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.isBroadcaster = false;
  }

  // Get active peer count
  getPeerCount(): number {
    return this.peers.size;
  }

  // Check if user is broadcaster
  getIsBroadcaster(): boolean {
    return this.isBroadcaster;
  }
}

// Singleton instance
export const webrtcManager = new WebRTCManager();
