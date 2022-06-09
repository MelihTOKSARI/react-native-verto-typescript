import Call from "src/verto-sdk/verto/Call";

export default interface CallKeepParams {
    isEnabled: boolean,
    autoAnswer: boolean,
    autoHangup: boolean,
    onNewCallAceppted?: (call: Call) => void,
    onCallEnded?: (handle: string) => void,
    onShowIncomingCallUI?: (handle: string, name: string) => void
}