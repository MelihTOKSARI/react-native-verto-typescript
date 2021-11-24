import ConferenceLiveArray from "../conference/ConferenceLiveArray";

export default interface EventParams {
    handler: Function;
    userData?: ConferenceLiveArray;
}