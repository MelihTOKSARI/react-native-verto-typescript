import VertoParams from "../models/VertoParams"

export const eventType = { eventData: {} }

export const Params: VertoParams = {
  webSocket: {
    login: '',
    password: '',
    url: ''
  },
  videoParams: {},
  audioParams: {},
  loginParams: {},
  deviceParams: {},
  userVariables: {},
  iceServers: false,
  ringSleep: 6000,
  sesssid: null,
  onmessage: (event = eventType) => { },
  onWebSocketLoginSuccess: () => { },
  onWebSocketLoginError: () => { },
  onPeerStreaming: () => { },
  onPeerStreamingError: () => { },
}

export interface defaultVertoCallbacks {
  onPrivateEvent?: (vertoClient: any, dataParams?: any, userData?: any) =>  void,
  onEvent?: (vertoClient: any, dataParams: any, userData: any) =>  void,
  onInfo?: (params: any) => void,
  onClientReady?: (params: any) =>  void,
  onNewCall?: (call: any) => void,
  onPlayLocalVideo?: (stream: any) =>  void,
  onPlayRemoteVideo?: (stream: any) =>  void,
  onClientClose?: (params?: any) => void,
  onConferenceReady?: (params: any) =>  void,
  onConferenceDisabled?: (params: any) =>  void,
  onDisplay?: (params: any) =>  void,
  onCallStateChange?: (params: any, callId: string) => void,
  onStreamReady?: () =>  void,
  onError?: (params: any) => void
}
