import type Timer from "../timer";
import { EVENT_TIMER_TICK } from "../timer";
import { BaseHelper, type BaseHelperOptions } from "./helper";

export interface TimerHelperOptions extends BaseHelperOptions {
    timer?: Timer
}

export default class TimerHelper extends BaseHelper {

    timer: Timer;
    title: string = "Timer";

    helperId: string = "timer-helper-div";
    multiplierLabelId: string = "multiplier-div";
    timerStartButtonId: string = "";
    timerResetButtonId: string = "";
    timerMultiplerInputId: string = "";
    timerTimeInputId: string = "";


    constructor(options: TimerHelperOptions) {
        super({ tinyearth: options.tinyearth });
        this.timer = options.timer ?? this.tinyearth.timer;
        this.title = options.title ?? "Timer";
    }

    #numberPad(n: number): string {
        return String(n).padStart(2, '0');
    }

    #formatDateToDatetimeLocal(date: Date): string {

        const year = date.getFullYear();
        const month = this.#numberPad(date.getMonth() + 1); // 月份从 0 开始
        const day = this.#numberPad(date.getDate());
        const hours = this.#numberPad(date.getHours());
        const minutes = this.#numberPad(date.getMinutes());
        const seconds = this.#numberPad(date.getSeconds())

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    createElement(): HTMLDivElement | null {
        this.helperId = `timer-helper-div-${crypto.randomUUID()}`
        this.timerStartButtonId = `timer-start-button-${crypto.randomUUID()}`;
        this.timerResetButtonId = `timer-reset-button-${crypto.randomUUID()}`;
        this.timerMultiplerInputId = `timer-multipler-input-${crypto.randomUUID()}`;
        this.multiplierLabelId = `timer-multiplier-label-${crypto.randomUUID()}`;
        this.timerTimeInputId = `timer-time-input-${crypto.randomUUID()}`;

        const item0 = this.createItem(
            this.createElementWithId('button', this.timerStartButtonId, "▶️Start"),
            this.createElementWithId('button', this.timerResetButtonId, "🔄Reset")
        );

        item0?.style.setProperty("justify-content", "flex-start");

        const item1 = this.createItem(
            this.createLabel("Multipler"),
            this.createInput(this.timerMultiplerInputId, "range", { min: "1", max: "100000" }),
            this.createLabel("", this.multiplierLabelId),

        );

        const item2 = this.createItem(
            this.createLabel("Time"),
            this.createInput(this.timerTimeInputId, "datetime-local", { step: "1", value: this.#formatDateToDatetimeLocal(this.timer.getDate()) })
        );

        return this.createHelperDiv(this.helperId, this.title, [item0, item1, item2]);
    }

    afterAddToContainer(): void {
        const multiplierLabel = document.getElementById(this.multiplierLabelId);
        if (multiplierLabel) {
            multiplierLabel.innerHTML = `x${this.timer.getMultipler()}`;
        }

        const multiplerInput = document.getElementById(this.timerMultiplerInputId) as HTMLInputElement | null;
        const startButton = document.getElementById(this.timerStartButtonId) as HTMLButtonElement | null;
        const resetButton = document.getElementById(this.timerResetButtonId) as HTMLButtonElement | null;
        const timeInput = document.getElementById(this.timerTimeInputId) as HTMLInputElement | null;

        if (this.timer.eventBus && timeInput) {
            this.timer.eventBus.addEventListener(EVENT_TIMER_TICK, {
                callback: (_timer) => {
                    timeInput.value = this.#formatDateToDatetimeLocal(_timer.getDate())
                }
            })
        }


        if (multiplerInput) {
            multiplerInput.value = this.timer.getMultipler().toString();
            const that = this;
            multiplerInput.addEventListener('input', () => {
                that.timer.setMultipler(Number(multiplerInput.value));
                if (multiplierLabel) {
                    multiplierLabel.innerHTML = `x${multiplerInput.value}`;
                }

            });
        }

        if (startButton) {
            if (this.timer.running) {
                startButton.innerText = "🟥Pause";
            } else {
                startButton.innerText = "▶️Resume";
            }
            startButton.addEventListener('click', () => {
                if (this.timer.running) {
                    this.timer.stop();
                    startButton.innerText = "▶️Resume";
                } else {
                    this.timer.start();
                    startButton.innerText = "🟥Pause";
                }
            });
        }

        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.timer.reset();
                if (timeInput) {
                    timeInput.value = this.#formatDateToDatetimeLocal(this.timer.getDate());
                }
            });
        }

        if (timeInput) {
            timeInput.addEventListener('input', (event) => {
                const value = (event as any).target.value; // todo resolve any type
                const fullValue = value.length === 16 ? value + ":00" : value;
                this.timer.currentTime = new Date(fullValue).getTime();
            });
        }
    }
}