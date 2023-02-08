import { RTCPeerConnection, RTCSessionDescription } from 'react-native-webrtc';
import BackgroundTimer from 'react-native-background-timer';
import PeerConnectionParams from './PeerConnectionParams';
import { RTCSessionDescriptionInit } from 'react-native-webrtc/lib/typescript/RTCSessionDescription';

BackgroundTimer.start();

export default class FSRTCPeerConnection {

  private options: PeerConnectionParams;
  private peer: RTCPeerConnection;
  private gathering?: number;
  private done: boolean;


  constructor(options: PeerConnectionParams) {
    this.options = options;

    const {
      constraints,
      iceServers,
      onICEComplete,
      type,
      onICESDP,
      onICE,
      onRemoteStream,
      attachStream,
      onPeerStreamingError,
      onOfferSDP,
      onAnswerSDP,
      offerSDP,
    } = options;
    console.log("attachStream: ", attachStream)
    const defaultIceServers = [{ urls: ['stun:stun.l.google.com:19302'] }];
    const peerConfig = {
      iceServers:
        typeof iceServers === 'boolean' ? defaultIceServers : iceServers,
    };
    const peer = new RTCPeerConnection(peerConfig);

    this.peer = peer;
    this.gathering = null;
    this.done = false;

    const iceHandler = () => {
      this.done = true;
      this.gathering = null;

      if (onICEComplete) {
        onICEComplete();
      }

      if (type === 'offer') {
        onICESDP(peer.localDescription);
      } else if (onICESDP) {
        onICESDP(peer.localDescription);
      }
    };

    peer.onicecandidate = event => {
      if (this.done) {
        return;
      }

      if (!this.gathering) {
        this.gathering = BackgroundTimer.setTimeout(iceHandler, 1000);
      }

      if (!event) {
        this.done = true;

        if (this.gathering) {
          clearTimeout(this.gathering);
          this.gathering = null;
        }

        iceHandler();
      } else if (event["candidate"]) {
        onICE(event["candidate"]);
      }
    };

    peer.onaddstream = (event: any) => {
      const remoteMediaStream = event.stream;

      if (onRemoteStream) {
        onRemoteStream(remoteMediaStream);
      }
    };
    
    // MARK ARMAKOM
    // peer.addStream(attachStream);
    
    const audioTracks = attachStream.getAudioTracks();
    peer.addTrack(audioTracks[0], attachStream);

    const videoTracks = attachStream.getVideoTracks();
    peer.addTrack(videoTracks[0], attachStream);

    if (onOfferSDP) {
      peer
        .createOffer(constraints)
        .then((sessionDescription: RTCSessionDescription | RTCSessionDescriptionInit) => {
          peer.setLocalDescription(sessionDescription);
          onOfferSDP(sessionDescription);
        })
        .catch(onPeerStreamingError);
    }

    if (type === 'answer') {
      peer
        .setRemoteDescription(new RTCSessionDescription(offerSDP))
        .then(() => { })
        .catch(onPeerStreamingError);
      peer
        .createAnswer()
        .then((sessionDescription: RTCSessionDescription | RTCSessionDescriptionInit) => {
          peer.setLocalDescription(sessionDescription);
          if (onAnswerSDP) {
            onAnswerSDP(sessionDescription);
          }
        })
        .catch(onPeerStreamingError);
    }
  }

  // TODO Convert cbSuccess type to function
  public addAnswerSDP(sdp: RTCSessionDescription, cbSuccess?: (value: any) => any, cbError?: (reason: any) => PromiseLike<never>): void {
    const { onPeerStreamingError } = this.options;
    this.peer
      .setRemoteDescription(new RTCSessionDescription(sdp))
      .then(cbSuccess || (() => { }))
      .catch(cbError || onPeerStreamingError);
  }

  public stop(): void {
    this.peer.close();
  }
}
