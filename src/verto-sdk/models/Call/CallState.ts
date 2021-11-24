import CallStateItem from "./CallStateItem";

export default interface CallState {
  new: CallStateItem;
  requesting: CallStateItem;
  trying: CallStateItem;
  recovering: CallStateItem;
  ringing: CallStateItem;
  answering: CallStateItem;
  early: CallStateItem;
  active: CallStateItem;
  held: CallStateItem;
  hangup: CallStateItem;
  destroy: CallStateItem;
  purge: CallStateItem;
}