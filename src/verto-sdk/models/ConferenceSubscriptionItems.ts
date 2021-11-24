import SubscriptionItem from "./SubscriptionItem";

export default interface ConferenceSubscriptionItems {
  chat: SubscriptionItem,
  info: SubscriptionItem,
  mod?: SubscriptionItem
  // TODO convert mod to moderation
}