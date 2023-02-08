import FSRTCPeerConnection from './FSRTCPeerConnection';
import { mediaDevices, MediaStream, MediaStreamTrack } from 'react-native-webrtc';
import MediaDeviceItemInfo from '../models/MediaDeviceItemInfo';
import VertoRTCOptions from '../models/VertoRTC/VertoRTCOptions';
import VertoRTCMediaData from '../models/VertoRTC/VertoRTCMediaData';
import CallVideoDimension from '../models/CallVideoDimension';
import MediaConstraints from '../models/VertoRTC/MediaConstraints';
import { RTCSessionDescription } from 'react-native-webrtc';

let videoSourceId: string;

mediaDevices.enumerateDevices().then((sourceInfos: Array<MediaDeviceItemInfo>) => {
  for (let i = 0; i < sourceInfos.length; i++) {
    const sourceInfo = sourceInfos[i];
    if (
      sourceInfo.kind === 'videoinput' &&
      sourceInfo.facing === (false ? 'front' : 'back')
    ) {
      videoSourceId = sourceInfo.deviceId;
    }
  }
});

export default class VertoRTC {

  private options: VertoRTCOptions;
  public mediaData: VertoRTCMediaData;

  private peer: FSRTCPeerConnection;
  private localStream: MediaStream;
  private removedTracks: Array<MediaStreamTrack> = []

  public type: string;

  constructor(options: VertoRTCOptions) {
    this.options = {
      useVideo: null,
      userData: null,
      localVideo: null,
      screenShare: false,
      useCamera: 'any',
      iceServers: false,
      videoParams: {},
      audioParams: {},
      verto: null,
      callbacks: {
        onPeerStreaming: () => { },
        onPeerStreamingError: () => { },
        onICESDP: () => { },
        onNewCall: () => { }
      },
      mediaHandlers: {
        playRemoteVideo: null,
        stopRemoteVideo: null,
        playLocalVideo: null,
        stopLocalVideo: null,
      },
      ...options,
    };

    this.mediaData = {
      SDP: null,
      profile: {},
      candidateList: [],
    };

    if (this.options.useVideo && !this.options.screenShare) {
      if (this.options.mediaHandlers && this.options.mediaHandlers.stopRemoteVideo) {
        this.options.mediaHandlers.stopRemoteVideo();
      }
    }
  }

  public useVideo(obj?: boolean, local?: boolean): void {
    if (obj) {
      this.options.useVideo = obj;
      this.options.localVideo = local;
    } else {
      this.options.useVideo = null;
      this.options.localVideo = null;
    }
  }

  public answer(sdp: string, onSuccess?: (value: any) => any, onError?: (reason: any) => PromiseLike<never>): void {
    const sessionDescription = new RTCSessionDescription({ sdp, type: 'answer' });
    this.peer.addAnswerSDP(sessionDescription, onSuccess, onError);
  }

  public stopPeer(): void {
    if (this.peer) {
      this.peer.stop();
    }
  }

  private onRemoteStream(stream: MediaStream): void {
    const {
      options: { useAudio, useVideo },
    } = this;
    const element = useVideo || useAudio;
    if (element) {
      this.options.verto.callbacks.onPlayRemoteVideo(stream);
      if (this.options.mediaHandlers && this.options.mediaHandlers.playRemoteVideo) {
        this.options.mediaHandlers.playRemoteVideo(stream);
      }
    }
  }

  public stop(): void {
    const {
      options: { useVideo, localVideo },
      peer,
      localStream,
    } = this;

    if (useVideo) {
      if (this.options.mediaHandlers && this.options.mediaHandlers.stopRemoteVideo) {
        this.options.mediaHandlers.stopRemoteVideo();
      }
    }

    if (localVideo) {
      if (this.options.mediaHandlers && this.options.mediaHandlers.stopLocalVideo) {
        this.options.mediaHandlers.stopLocalVideo();
      }
    }

    if (localStream) {
      localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }

    if (peer) {
      peer.stop();
    }
  }

  private getAudioConstraint(): any {
    const { useMic, audioParams, screenShare } = this.options;
    if (screenShare) {
      return false;
    }

    if (useMic === 'none') {
      return false;
    }

    if (useMic === 'any') {
      return audioParams;
    }

    return {
      ...audioParams,
      deviceId: { exact: useMic },
    };
  }

  // TODO Refactor this function, espacially dimension member
  // TODO Set return type as an interface
  private getVideoConstraint(): any {
    const { videoParams, useCamera, useVideo } = this.options;
    if (!useVideo) {
      return false;
    }

    if (this.options.screenShare) {
      return this.getScreenConstraint();
    }

    if (useCamera === 'none') {
      return false;
    }

    const dimensions: CallVideoDimension = {
      width: {},
      height: {}
    };

    const { minWidth, maxWidth } = videoParams;
    if (minWidth !== undefined && maxWidth !== undefined) {
      dimensions.width = { min: minWidth, max: maxWidth };
    }

    const { minHeight, maxHeight } = videoParams;
    if (minHeight !== undefined && maxHeight !== undefined) {
      dimensions.height = { min: minHeight, max: maxHeight };
    }

    if (useCamera === 'any') {
      return { ...dimensions };
    }

    return { ...dimensions, deviceId: useCamera };
  }

  private getScreenConstraint(): any {
    const { videoParams: screenParams, useCamera: useScreen } = this.options;

    return {
      mandatory: screenParams,
      optional: useScreen ? [{ sourceId: useScreen }] : [],
    };
  }

  private getMediaParams(): MediaConstraints {
    return {
      audio: this.getAudioConstraint(),
      video: this.getVideoConstraint(),
    };
  }

  public getHasVideo(): boolean {
    return this.options.useVideo;
  }

  public getLocalStream(): MediaStream {
    return this.localStream;
  }

  public removeLocalStreamTracks() {
    if (this.localStream == null) {
      return;
    }

    this.removedTracks = [];
    this.localStream.getTracks().forEach((track: MediaStreamTrack) => {
      this.removedTracks.push(track);
      this.localStream.removeTrack(track)
    })
  }

  public removeLocalTracks(kind?: string) {
    if (this.localStream == null || (kind !== 'audio' && kind !== 'video')) {
      return;
    }

    this.removedTracks = kind ? this.removedTracks.filter(track => track.kind != kind) : []
    this.localStream.getTracks().forEach((track: MediaStreamTrack) => {
      if (!kind || track.kind === kind) {
        this.removedTracks.push(track);
        this.localStream.removeTrack(track)
      }
    })
  }

  public reAddLocalTracks(kind?: string) {
    if (this.localStream == null || (kind !== 'audio' && kind !== 'video')) {
      return;
    }

    this.removedTracks.forEach((track: MediaStreamTrack) => {
      if (!kind || track.kind === kind) {
        this.localStream.addTrack(track);
      }
    })

    this.removedTracks = kind ? this.removedTracks.filter(track => track.kind != kind) : [];
  }

  public reAddLocalStreamTracks() {
    if (this.localStream == null) {
      return;
    }

    if (this.removedTracks) {
      this.removedTracks.forEach((track: MediaStreamTrack) => {
        this.localStream.addTrack(track);
      })
    }
    this.removedTracks = [];
  }

  public onICE(candidate: any): void {
    this.mediaData.candidate = candidate; // TODO it can be redundant
    this.mediaData.candidateList.push(this.mediaData.candidate);
  }

  public onICESDP(sdp: RTCSessionDescription): void {
    this.mediaData.SDP = sdp.sdp;
    this.options.callbacks.onICESDP();
  }

  public createAnswer({ useCamera, sdp }) {
    const { options } = this;
    const { useVideo, localVideo, iceServers } = options;

    this.type = 'answer';
    this.options.useCamera = useCamera;

    const mediaConstraints = this.getMediaParams();
    mediaDevices
      .getUserMedia(mediaConstraints)
      .then((stream: MediaStream) => {

        this.peer = new FSRTCPeerConnection({
          type: 'answer',
          attachStream: stream,
          offerSDP: { sdp, type: 'offer' },
          constraints: this.getPeerConstraints(),
          onPeerStreamingError: this.options.callbacks.onPeerStreamingError,
          onICE: this.onICE.bind(this),
          onRemoteStream: this.onRemoteStream.bind(this),
          onICESDP: (iceSdp: RTCSessionDescription) => this.onICESDP(iceSdp),
          onAnswerSDP: (answerSDP: RTCSessionDescription) => {
            // this.answer.SDP = answerSDP.sdp; // TODO Check this refactoring
            this.answer(answerSDP.sdp);
          },
          iceServers,
        });

        if (useVideo && localVideo) {
          this.options.verto.callbacks.onPlayLocalVideo(stream);
        }
        this.options.callbacks.onPeerStreaming(stream);
      })
      .catch(error => {
        this.traceMediaError(mediaConstraints, error);
      });
  }

  // public switchCamera(localVideoTrack: MediaStreamTrack): void {
  //   if (localVideoTrack) {
  //     localVideoTrack._switchCamera();
  //   }
  // }

  private getPeerConstraints(): any {
    return {
      offerToReceiveAudio: this.options.useSpeak !== 'none',
      offerToReceiveVideo: !!this.options.useVideo,
    };
  }

  public inviteRemotePeerConnection(): void {
    this.type = 'offer';

    const mediaConstraints = this.getMediaParams();
    const screen = this.options.videoParams && this.options.screenShare;
    const screenPeerConstraints = {
      offerToReceiveVideo: false,
      offerToReceiveAudio: false,
      offerToSendAudio: false,
    };

    const handleStream = (stream: MediaStream) => {
      this.localStream = stream;
      this.peer = new FSRTCPeerConnection({
        type: this.type,
        attachStream: stream,
        onICESDP: this.onICESDP.bind(this),
        onPeerStreamingError: this.options.callbacks.onPeerStreamingError,
        constraints: screen ? screenPeerConstraints : this.getPeerConstraints(),
        iceServers: this.options.iceServers,
        onICE: this.onICE.bind(this),
        onRemoteStream: (remoteStream: MediaStream) =>
          !screen && this.onRemoteStream(remoteStream),
        onOfferSDP: (sdp: RTCSessionDescription) => {
          this.mediaData.SDP = sdp.sdp;
        },
      });

      this.options.callbacks.onPeerStreaming(stream);

      if (this.options.verto.callbacks.onPlayLocalVideo) {
        this.options.verto.callbacks.onPlayLocalVideo(stream);
      }
    };

    if (!mediaConstraints.audio && !mediaConstraints.video) {
      handleStream(null);
    } else {
      mediaDevices
        .getUserMedia(mediaConstraints)
        .then(handleStream)
        .catch(error => {
          this.traceMediaError(mediaConstraints, error);
        });
    }
  }

  private traceMediaError(constraints: MediaConstraints, error: any) {
    console.log('User media error', 'Constraints:', constraints, 'Error:', error);
  }
}
