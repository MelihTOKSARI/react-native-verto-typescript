import Call from "src/verto-sdk/verto/Call";

export default interface CallKeepParams {
    isEnabled: boolean,
    autoAnswer: boolean,
    autoDisplay: boolean,
    autoHangup: boolean,
    selfManaged: boolean,
    onNewCallAceppted?: (call: Call) => void,
    onCallEnded?: (handle: string) => void,
    onShowIncomingCallUI?: (handle: string, name: string) => void
}