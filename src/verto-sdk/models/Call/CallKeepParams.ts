import Call from "src/verto-sdk/verto/Call";
import { ExcludedCallParams } from "./ExcludedCallParams";

export default interface CallKeepParams {
    isEnabled: boolean,
    autoAnswer: boolean,
    autoDisplay: boolean,
    autoHangup: boolean,
    excludedCallParams?: ExcludedCallParams,
    selfManaged: boolean,
    onNewCallAceppted?: (call: Call) => void,
    onCallEnded?: (handle: string) => void,
    onShowIncomingCallUI?: (handle: string, name: string) => void
}