import type EventBus from "./event.js";

export const EVENT_TIMER_TICK = "timer:tick";

export default class Timer {

    currentTime: number;
    multipler = 1;
    running = false;
    onTimeChange = null;
    lastFrameTime: number = 0;
    currentFrameTime: number = 0;

    eventBus: EventBus | null = null;

    constructor(millseconds: number = Date.now()) {
        this.currentTime = millseconds;
    }

    setEventBus(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    tick(frameTime: number) {
        if (this.running) {
            this.#setCurrentFrameTime(frameTime);
            let dt = Math.trunc((frameTime - this.getLastFrameTime()));
            this.#addTime(dt);
            if (this.eventBus) {
                this.eventBus.fire(EVENT_TIMER_TICK, this);
            } else {
                console.warn("Time eventBus is NULL!");
            }
            this.#setLastFrameTime(this.getCurrentFrameTime());
        }
    }

    #addTime(millseconds: number) {
        this.currentTime += millseconds * this.multipler;
    }
    #subTime(millseconds: number) {
        this.currentTime -= millseconds * this.multipler;
    }
    getTime(): number {
        return this.currentTime;
    }
    getDate(): Date {
        return new Date(this.currentTime);
    }
    setMultipler(m: number) {
        this.multipler = m;
    }
    getMultipler(): number {
        return this.multipler;
    }
    start() {
        this.running = true;
    }
    stop() {
        this.running = false;
    }
    reset() {
        this.currentTime = Date.now();
    }
    #setLastFrameTime(t: number) {
        this.lastFrameTime = t;
    }
    #setCurrentFrameTime(t: number) {
        this.currentFrameTime = t;
    }
    getLastFrameTime(): number {
        return this.lastFrameTime;
    }
    getCurrentFrameTime(): number {
        return this.currentFrameTime;
    }

}