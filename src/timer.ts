import type EventBus from "./event.js";
import { createHelperDiv } from "./helpers/helper.js";

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

function numberPad(n: number): string {
    return String(n).padStart(2, '0');
}

function formatDateToDatetimeLocal(date: Date): string {

    const year = date.getFullYear();
    const month = numberPad(date.getMonth() + 1); // 月份从 0 开始
    const day = numberPad(date.getDate());
    const hours = numberPad(date.getHours());
    const minutes = numberPad(date.getMinutes());
    const seconds = numberPad(date.getSeconds())

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function addTimeHelper(timer: Timer, root: HTMLDivElement) {

    const id = "timer-helper-div";
    const multiplierLabelId = `multiplier-${crypto.randomUUID()}`;
    const innerHTML = `
        <div>
        <label>计时器:</lable></br>
        <button id="timer-start-button">开始计时器</button>
        <button id="timer-reset-button">🔄重置</button> 
        
        </br>
        <label>倍速:</label>
        <input id="timer-multipler-input" type="range" value="${timer.getMultipler()}" min="1" max="100000">
        <label id="${multiplierLabelId}"></label></br>   
        <input type="datetime-local" id="timer-time-input" step="1" value="${formatDateToDatetimeLocal(timer.getDate())}"></input>  
        </div>
    `

    const container = createHelperDiv(id, innerHTML);

    root.appendChild(container);

    const multiplierLabel = document.getElementById(multiplierLabelId);
    if (multiplierLabel) {
        multiplierLabel.innerHTML = `x${timer.getMultipler()}`;
    }


    const multiplerInput = document.getElementById("timer-multipler-input") as HTMLInputElement;
    const startButton = document.getElementById("timer-start-button") as HTMLButtonElement;
    const resetButton = document.getElementById("timer-reset-button") as HTMLButtonElement;
    const timeInput = document.getElementById("timer-time-input") as HTMLInputElement;

    if (timer.eventBus && timeInput) {
        timer.eventBus.addEventListener(EVENT_TIMER_TICK, {
            callback: (_timer) => {
                timeInput.value = formatDateToDatetimeLocal(_timer.getDate())
            }
        })
    }


    multiplerInput.value = timer.getMultipler().toString();
    multiplerInput.addEventListener('input', () => {
        timer.setMultipler(Number(multiplerInput.value));
        if (multiplierLabel) {
            multiplierLabel.innerHTML = `x${multiplerInput.value}`;
        }

    });

    if (timer.running) {
        startButton.innerText = "🟥暂停";
    } else {
        startButton.innerText = "▶️继续";
    }

    startButton.addEventListener('click', () => {
        if (timer.running) {
            timer.stop();
            startButton.innerText = "▶️继续";
        } else {
            timer.start();
            startButton.innerText = "🟥暂停";
        }
    });

    resetButton.addEventListener('click', () => {
        timer.reset();
        timeInput.value = formatDateToDatetimeLocal(timer.getDate());
    });

    timeInput.addEventListener('input', (event) => {
        const value = (event as any).target.value; // todo resolve any type
        const fullValue = value.length === 16 ? value + ":00" : value;
        timer.currentTime = new Date(fullValue).getTime();
    });

}