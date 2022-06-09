/**
 * @param callerName Localized name of the caller or calle name, visible name of call history if available
 * @param from Number of starter of a call
 * @param to Number of destination of a call
 * @param useVideo Flag to indicate call is a video call or audio call
 */
export default interface CallInfoParams {
    callerName: string,
    from: string,
    to: string,
    useVideo: boolean,
    displayName?: string
}