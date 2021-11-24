import VertoParams from "./VertoParams";

export interface VertoOptions extends VertoParams {
  blockSessionRecovery?: any;
  sessid: string;
  useVideo?: boolean,
  useStereo?: boolean,
  remoteVideo?: string,
  remoteAudioId?: string,
  localVideo?: string,
  login?: string,
}