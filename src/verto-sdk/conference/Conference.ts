import ConferenceLiveArray from "./ConferenceLiveArray";
import ConferenceManager from "./ConferenceManager";

export default interface Conference {
  creationEvent: any;
  privateEventChannel: any;
  memberId: string;
  role: string;
  manager: ConferenceManager;
  liveArray: ConferenceLiveArray;
}