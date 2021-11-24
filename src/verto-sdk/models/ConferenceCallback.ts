export default interface ConferenceCallback {
  onBootstrappedMembers(x: any): any;
  onAddedMember(x: any): any;
  onModifiedMember(x: any): any;
  onRemovedMember(x: any): any;
  onReady?: Function;
  onDestroyed?: Function;
  onChatMessage?: Function;
  onInfo?: Function;
  onModeration?: Function;
}