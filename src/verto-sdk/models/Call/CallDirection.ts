import CallStateItem from "./CallStateItem";

export default interface CallDirection {
  inbound: CallStateItem;
  outbound: CallStateItem;
}