import ConferenceLiveArray from "../../conference/ConferenceLiveArray";
import VertinhoClient from "../../verto/VertoClient";
import CallVideoParams from "../CallVideoParams";
import VertoRTCMediaHandlers from "./VertoRTCMediaHandlers";
import VertoRTCCallbacks from "./VertoRTCCallbacks";

export default interface VertoRTCOptions {
  audioParams: any; // TODO Convert to interface
  callbacks: VertoRTCCallbacks;
  iceServers: boolean;
  localVideo: boolean;
  mediaHandlers: VertoRTCMediaHandlers;
  screenShare: boolean;
  useAudio: boolean;
  useCamera: string; // TODO Convert values to enumaration
  userData: ConferenceLiveArray; 
  useMic: string; // TODO Convert values to enumaration
  useSpeak: string; // TODO Convert values to enumaration
  useVideo: boolean;
  verto: VertinhoClient;
  videoParams: CallVideoParams;
}