/**
 * @typedef CallbackInfo
 * @property {string} uuid
 * @property {(Object)=>void} callback
*/

export default class EventBus {

    /**@type {Map<string,CallbackInfo[]>}*/
    callbackMap = new Map();

    constructor() {}

    /**
     * @param {string} eventName
     * @param {CallbackInfo} callbackInfo  
    */
    addEventListener(eventName, callbackInfo) {

        if (!callbackInfo.uuid) {
            callbackInfo.uuid = crypto.randomUUID();
        }
        let a = this.callbackMap[eventName];
        if (!a) {
            this.callbackMap[eventName] = [];
            a = this.callbackMap[eventName];
        }
        a.push(callbackInfo);
        return callbackInfo.uuid;

    }
    removeEventListener(eventName, uuid) {
        const a = this.callbackMap[eventName];
        if (a) {
            this.callbackMap[eventName] = this.callbackMap[eventName].filter(c => c.uuid !== uuid);
        }
    }
    fire(eventName, obj) {

        const a = this.callbackMap[eventName];
        if (a) {
            for (let c of this.callbackMap[eventName]) {
                c.callback(obj);
            }
        }

    }


};