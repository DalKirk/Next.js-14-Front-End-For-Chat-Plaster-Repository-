// WebRTC P2P Connection Manager
// Handles peer-to-peer video streaming between broadcaster and viewers

type PeerConnection = {
  connection: RTCPeerConnection;
  userId: string;
  username: string;
  iceCandidateQueue: RTCIceCandidateInit[];  // Queue for ICE candidates received before remote description
};

class WebRTCManager {
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  public isBroadcaster = false;
  private onRemoteStreamCallback?: (userId: string, stream: MediaStream) => void;
  private onPeerDisconnectedCallback?: (userId: string) => void;

  // STUN/TURN servers for NAT traversal
  private iceServers = (() => {
    const servers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];
    // Optionally add TURN from environment (NEXT_PUBLIC_* only)
    // Supports single URL via NEXT_PUBLIC_TURN_URL or comma-separated list via NEXT_PUBLIC_TURN_URLS
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
    const turnUrlsRaw = process.env.NEXT_PUBLIC_TURN_URLS;
    const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const turnPass = process.env.NEXT_PUBLIC_TURN_PASSWORD;
    const urlList: string[] = [];
    if (turnUrlsRaw) {
      turnUrlsRaw.split(',').map(u => u.trim()).filter(Boolean).forEach(u => urlList.push(u));
    } else if (turnUrl) {
      urlList.push(turnUrl);
    }
    if (urlList.length > 0 && turnUser && turnPass) {
      servers.push({ urls: urlList.length === 1 ? urlList[0] : urlList, username: turnUser, credential: turnPass });
    }
    return servers;
  })();

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
    const forceRelay = String(process.env.NEXT_PUBLIC_FORCE_RELAY || '').toLowerCase() === 'true';
    console.log(`🔧 Creating peer connection for ${username} (isOfferer: ${isOfferer})`);
    console.log(`🔧 ICE servers:`, JSON.stringify(this.iceServers.map(s => typeof s.urls === 'string' ? s.urls : s.urls?.[0])));
    console.log(`🔧 ICE transport policy:`, forceRelay ? 'relay' : 'all');
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceTransportPolicy: forceRelay ? 'relay' : 'all',
    });
    console.log(`🔧 Peer connection created, initial ICE gathering state:`, pc.iceGatheringState);

    // Add local stream tracks (if broadcaster)
    if (this.localStream && this.isBroadcaster) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
        console.log('➕ Added track to peer:', track.kind);
      });
    } else {
      // Viewer: Add transceivers to receive audio/video
      // This is required for ICE gathering to start on receive-only connections
      console.log('📭 No local stream - adding receive-only transceivers (viewer)');
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
      console.log('📻 Added audio/video transceivers for receiving');
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        try {
          const candStr = event.candidate.candidate || '';
          const typeMatch = candStr.match(/ typ ([a-zA-Z]+)/);
          const candType = typeMatch ? typeMatch[1] : 'unknown';
          console.log(`❄️ ICE candidate [${username}]:`, candType);
        } catch {}
        signalCallback(userId, {
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      } else {
        console.log(`✅ ICE gathering complete [${username}]`);
      }
    };

    // Log ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state [${username}]:`, pc.iceConnectionState);
    };

    // Log ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log(`🔍 ICE gathering state [${username}]:`, pc.iceGatheringState);
    };

    // Log signaling state
    pc.onsignalingstatechange = () => {
      console.log(`📶 Signaling state [${username}]:`, pc.signalingState);
    };

    // Handle incoming stream (viewer receives broadcaster's stream)
    pc.ontrack = (event) => {
      console.log('📥 Received remote track:', event.track.kind, 'streams:', event.streams.length);
      if (event.streams && event.streams[0]) {
        console.log('📺 Setting remote stream:', event.streams[0].id);
        this.onRemoteStreamCallback?.(userId, event.streams[0]);
      } else {
        console.warn('⚠️ No streams in track event');
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state [${username}]:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.removePeer(userId);
        this.onPeerDisconnectedCallback?.(userId);
      }
      // Log selected candidate pair when connected
      if (pc.connectionState === 'connected') {
        console.log('🎉 WebRTC connection established!');
        pc.getStats(null).then((stats) => {
          stats.forEach((report: any) => {
            if (report.type === 'transport' && report.selectedCandidatePairId) {
              const pair = stats.get(report.selectedCandidatePairId);
              if (pair) {
                const local = stats.get(pair.localCandidateId);
                const remote = stats.get(pair.remoteCandidateId);
                const lt = local?.candidateType || 'unknown';
                const rt = remote?.candidateType || 'unknown';
                console.log(`✅ Selected ICE pair [${username}]: local=${lt}, remote=${rt}`);
              }
            }
          });
        }).catch(() => {});
      }
    };

    // Store peer connection with empty ICE candidate queue
    this.peers.set(userId, { connection: pc, userId, username, iceCandidateQueue: [] });

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
          console.log(`📥 Processing offer from ${userId}, current signaling state:`, pc.signalingState);
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          console.log(`📥 Remote description set, signaling state:`, pc.signalingState);
          // Process queued ICE candidates now that remote description is set
          await this.processQueuedIceCandidates(userId);
          const answer = await pc.createAnswer();
          console.log(`📤 Answer created, setting local description...`);
          await pc.setLocalDescription(answer);
          console.log(`📤 Local description set, ICE gathering state:`, pc.iceGatheringState);
          
          // Debug: Poll ICE gathering state for a few seconds
          let pollCount = 0;
          const pollInterval = setInterval(() => {
            pollCount++;
            console.log(`🔄 [${pollCount}s] ICE gathering:`, pc.iceGatheringState, '| ICE connection:', pc.iceConnectionState, '| Connection:', pc.connectionState);
            if (pollCount >= 5 || pc.iceGatheringState === 'complete') {
              clearInterval(pollInterval);
            }
          }, 1000);
          
          signalCallback(userId, {
            type: 'answer',
            sdp: answer,
          });
          break;

        case 'answer':
          console.log(`📥 Processing answer from ${userId}, current signaling state:`, pc.signalingState);
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          console.log(`📥 Remote description set, ICE gathering state:`, pc.iceGatheringState);
          
          // Debug: Poll ICE gathering state for a few seconds
          let pollCount2 = 0;
          const pollInterval2 = setInterval(() => {
            pollCount2++;
            console.log(`🔄 [${pollCount2}s] ICE gathering:`, pc.iceGatheringState, '| ICE connection:', pc.iceConnectionState, '| Connection:', pc.connectionState);
            if (pollCount2 >= 5 || pc.iceGatheringState === 'complete') {
              clearInterval(pollInterval2);
            }
          }, 1000);
          
          // Process queued ICE candidates now that remote description is set
          await this.processQueuedIceCandidates(userId);
          break;

        case 'ice-candidate':
          if (signal.candidate) {
            // Queue ICE candidates if remote description isn't set yet
            if (!pc.remoteDescription) {
              console.log('⏳ Queuing ICE candidate (remote description not set yet)');
              peer.iceCandidateQueue.push(signal.candidate);
            } else {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
          }
          break;

        default:
          console.warn('Unknown signal type:', signal.type);
      }
    } catch (error) {
      console.error('❌ Error handling signal:', error);
    }
  }

  // Process queued ICE candidates after remote description is set
  private async processQueuedIceCandidates(userId: string) {
    const peer = this.peers.get(userId);
    if (!peer || peer.iceCandidateQueue.length === 0) return;

    console.log(`🧊 Processing ${peer.iceCandidateQueue.length} queued ICE candidates for ${userId}`);
    
    for (const candidate of peer.iceCandidateQueue) {
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('Failed to add queued ICE candidate:', error);
      }
    }
    
    // Clear the queue
    peer.iceCandidateQueue = [];
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
