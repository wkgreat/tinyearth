import { createHelperDiv } from "./helper.js";

export const EVENT_TIMER_TICK = "timer:tick";

export default class Timer {

    currentTime = null;
    multipler = 1;
    running = false;
    onTimeChange = null;
    lastFrameTime = 0;
    currentFrameTime = 0;

    /**@type {EventBus|null}*/
    eventBus = null;

    constructor(millseconds) {
        this.currentTime = millseconds;
    }

    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }

    tick(frameTime) {
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

    #addTime(millseconds) {
        this.currentTime += millseconds * this.multipler;
    }
    #subTime(millseconds) {
        this.currentTime -= millseconds * this.multipler;
    }
    getTime() {
        return this.currentTime;
    }
    getDate() {
        return new Date(this.currentTime);
    }
    setMultipler(m) {
        this.multipler = m;
    }
    getMultipler() {
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
    #setLastFrameTime(t) {
        this.lastFrameTime = t;
    }
    #setCurrentFrameTime(t) {
        this.currentFrameTime = t;
    }
    getLastFrameTime() {
        return this.lastFrameTime;
    }
    getCurrentFrameTime() {
        return this.currentFrameTime;
    }

}

/**
 * @param {Date} date
*/
function formatDateToDatetimeLocal(date) {
    const pad = n => String(n).padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1); // 月份从 0 开始
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds())

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * @param {Timer} timer
 * @param {HTMLDivElement} root  
*/
export function addTimeHelper(timer, root) {

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
    multiplierLabel.innerHTML = `x${timer.getMultipler()}`;

    const multiplerInput = document.getElementById("timer-multipler-input");
    const startButton = document.getElementById("timer-start-button");
    const resetButton = document.getElementById("timer-reset-button");
    const timeInput = document.getElementById("timer-time-input");

    if (timer.eventBus) {
        timer.eventBus.addEventListener(EVENT_TIMER_TICK, {
            callback: (_timer) => {
                timeInput.value = formatDateToDatetimeLocal(_timer.getDate())
            }
        })
    }


    multiplerInput.value = timer.getMultipler();
    multiplerInput.addEventListener('input', () => {
        timer.setMultipler(multiplerInput.value);
        multiplierLabel.innerHTML = `x${multiplerInput.value}`;
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
        const value = event.target.value;
        const fullValue = value.length === 16 ? value + ":00" : value;
        timer.currentTime = new Date(fullValue).getTime();
    });

}