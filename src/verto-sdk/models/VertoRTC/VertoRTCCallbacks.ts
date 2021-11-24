export default interface VertoRTCCallbacks {
  onPeerStreaming: Function,
  onPeerStreamingError: (reason: any) => PromiseLike<never>,
  onICESDP: Function,
  onNewCall: Function
}