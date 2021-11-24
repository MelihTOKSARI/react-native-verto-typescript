import ConferenceLiveArray from "../conference/ConferenceLiveArray";

export default interface EventSubscription {
    eventChannel: any,
    handler: Function,
    userData: ConferenceLiveArray,
    ready: boolean,
}