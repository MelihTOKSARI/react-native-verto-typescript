import CallVideoParams from "../CallVideoParams";

export default interface CallParams {
  destination_number: string;
  caller_id_number: string;
  caller_id_name: string;
  remote_caller_id_name: string;
  remote_caller_id_number: string;
  callID: string;
  display_direction: string;
  callee_id_name: string;
  callee_id_number: string;
  screenShare: string;
  useCamera: string;
  attach: boolean;
  localVideo: string;
  remoteVideo: string;
  remoteAudioId: string;
  videoParams: CallVideoParams;
  useMic: string;
  useSpeak: string;
  sdp: string;
  login: string,
  useVideo: boolean,
  useStereo: boolean
}