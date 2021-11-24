import Authentication from "./Authentication";

export default interface VertoParams {
  webSocket: Authentication,
  videoParams: any,
  audioParams?: any,
  loginParams?: any,
  deviceParams: any,
  userVariables?: any,
  iceServers: boolean,
  ringSleep?: number,
  sesssid?: number,
  onmessage?: Function,
  onWebSocketLoginSuccess?: Function,
  onWebSocketLoginError?: Function,
  onPeerStreaming?: Function,
  onPeerStreamingError?: Function,
}