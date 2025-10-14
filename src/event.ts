type EventCallBack = (obj: any) => void
interface CallbackInfo {
    uuid?: string
    callback: EventCallBack
};

export enum TinyEarthEvent {
    TIMER_TICK = "timer:tick",
    CAMERA_CHANGE = "camera:change",
    PROJECTION_CHANGE = "projection:chage"
}

export default class EventBus {

    callbackMap: Map<string, CallbackInfo[]> = new Map();

    constructor() {}

    /**
     * @param {string} eventName
     * @param {CallbackInfo} callbackInfo  
    */
    addEventListener(eventName: string, callbackInfo: CallbackInfo) {

        if (!callbackInfo.uuid) {
            callbackInfo.uuid = crypto.randomUUID();
        }

        if (!this.callbackMap.has(eventName)) {
            this.callbackMap.set(eventName, []);
        }
        const a = this.callbackMap.get(eventName) as CallbackInfo[];
        a.push(callbackInfo);
        return callbackInfo.uuid;

    }
    removeEventListener(eventName: string, uuid: string) {
        const callbacks = this.callbackMap.get(eventName);
        if (callbacks) {
            this.callbackMap.set(eventName, callbacks.filter(c => c.uuid !== uuid));
        }
    }
    fire(eventName: string, obj: object) {

        const callbacks = this.callbackMap.get(eventName);
        if (callbacks) {
            for (let c of callbacks) {
                c.callback(obj);
            }
        }

    }


};