import { MediaStream, RTCOfferOptions } from "react-native-webrtc"

export default interface PeerConnectionParams {
  attachStream: MediaStream;
  constraints: RTCOfferOptions;
  iceServers: boolean;
  onICEComplete?: Function;
  type: string;
  onICESDP: Function;
  onICE: Function;
  onRemoteStream: Function;
  onPeerStreamingError: (reason: any) => PromiseLike<never>;
  onOfferSDP?: Function;
  onAnswerSDP?: Function;
  offerSDP?: any;
}