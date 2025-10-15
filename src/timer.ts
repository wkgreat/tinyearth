import type EventBus from "./event.js";
import { TinyEarthEvent } from "./event.js";

export default class Timer {


    multipler = 1;
    running = false;
    onTimeChange = null;


    #lastTime: number;
    #currentTime: number;
    #lastFrameTime: number = 0;
    #currentFrameTime: number = 0;

    eventBus: EventBus | null = null;

    constructor(millseconds: number = Date.now()) {
        this.#currentTime = millseconds;
        this.#lastTime = this.#currentTime;
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
                this.eventBus.fire(TinyEarthEvent.TIMER_TICK, this);
            } else {
                console.warn("Time eventBus is NULL!");
            }
            this.#setLastFrameTime(this.getCurrentFrameTime());
        }
    }

    #addTime(millseconds: number) {
        this.#lastTime = this.#currentTime;
        this.#currentTime += millseconds * this.multipler;
    }

    get lastTime(): number {
        return this.#lastTime;
    }

    get lastDate(): Date {
        return new Date(this.#lastTime);
    }

    get time(): number {
        return this.#currentTime;
    }

    get currentTime(): number {
        return this.#currentTime;
    }

    set currentTime(t) {
        this.#lastTime = this.#currentTime;
        this.#currentTime = t;
    }

    get date(): Date {
        return new Date(this.#currentTime);
    }

    get currentDate(): Date {
        return new Date(this.#currentTime);
    }

    get deltaTime(): number {
        return this.currentTime - this.lastTime;
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
        this.#currentTime = Date.now();
    }

    #setLastFrameTime(t: number) {
        this.#lastFrameTime = t;
    }

    #setCurrentFrameTime(t: number) {
        this.#currentFrameTime = t;
    }

    getLastFrameTime(): number {
        return this.#lastFrameTime;
    }

    getCurrentFrameTime(): number {
        return this.#currentFrameTime;
    }

}