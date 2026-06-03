(function () {
    class Timer {
        constructor({
            interval,
            duration,
            emergencyDuration,
            mode = 0,
            statusCallback = null,
            renderCallback = null,
            configCallback = null
        }) {
            this.STOPWATCH_INTERVAL = interval;
            this.interval = this.STOPWATCH_INTERVAL;
            this.duration = duration;
            this.emergencyDuration = Math.min(emergencyDuration, duration);
            this.mode = mode;
            this.statusCallback = statusCallback;
            this.renderCallback = renderCallback;
            this.configCallback = configCallback;
            this.remainingTime = duration;
            this.running = false;
            this.elapsedTime = 0;
            this.previousStatus = null;
            this.previousRunning = null;
            this._timeoutId = null;
            this._lastUpdateTime = 0;
        }

        async update() {
            let newStatus;
            if (this.mode === Timer.MODE_SYSTEM_TIME) {
                newStatus = Timer.SYSTEMTIME;
                if (this.renderCallback) {
                    this.renderCallback(null);
                }
            } else {
                this.remainingTime = this.duration - this.elapsedTime;
                if (this.remainingTime <= 0) {
                    newStatus = Timer.ENDED;
                    this.remainingTime = 0;
                    this.previousRunning = this.running;
                    this.running = false;
                    this._clearLoop();
                } else if (this.remainingTime <= this.emergencyDuration) {
                    newStatus = Timer.EMERGENCY;
                } else if (this.remainingTime === this.duration) {
                    newStatus = Timer.STANDBY;
                } else {
                    newStatus = Timer.RACING;
                }
                const displayTime = this.mode === Timer.MODE_COUNT_UP ? this.elapsedTime : this.remainingTime;
                if (this.renderCallback) {
                    this.renderCallback(displayTime);
                }
            }

            if ((this.previousStatus !== newStatus || this.previousRunning !== this.running) && this.statusCallback) {
                this.statusCallback(this.previousStatus, newStatus, this.previousRunning, this.running);
            }
            this.previousStatus = newStatus;
            this.previousRunning = this.running;
        }

        async updateConfig() {
            if (this.configCallback) {
                this.configCallback();
            }
        }

        _clearLoop() {
            if (this._timeoutId !== null) {
                window.clearTimeout(this._timeoutId);
                this._timeoutId = null;
            }
        }

        _tick() {
            if (!this.running) {
                this._clearLoop();
                this.update();
                return;
            }

            const now = performance.now();
            this.elapsedTime += (now - this._lastUpdateTime) / 1000;
            this._lastUpdateTime = now;
            this.update();

            if (this.running) {
                this._timeoutId = window.setTimeout(() => this._tick(), this.interval * 1000);
            }
        }

        play() {
            if (this.running) {
                return;
            }
            this.previousRunning = this.running;
            this.running = true;
            this._lastUpdateTime = performance.now();
            this._tick();
        }

        pause() {
            this.previousRunning = this.running;
            this.running = false;
            this._clearLoop();
            this.update();
        }

        timeIsUp() {
            return this.remainingTime <= 0;
        }

        togglePlayPause() {
            if (this.running) {
                this.pause();
            } else {
                this.play();
            }
        }

        reset() {
            this.previousRunning = this.running;
            this.running = false;
            this._clearLoop();
            const nothingToReset = this.elapsedTime <= 0 || this.mode === Timer.MODE_SYSTEM_TIME;
            this.elapsedTime = 0;
            this.update();
            return !nothingToReset;
        }

        toggleMode() {
            this.setMode(this.mode + 1);
        }

        toggleModeCountUpDown() {
            if (this.mode !== Timer.MODE_COUNT_DOWN) {
                this.setMode(Timer.MODE_COUNT_DOWN);
            } else {
                this.setMode(Timer.MODE_COUNT_UP);
            }
        }

        setMode(mode) {
            this.mode = ((mode % 3) + 3) % 3;
            if (this.mode === Timer.MODE_SYSTEM_TIME) {
                this.interval = Timer.SYSTEM_TIME_INTERVAL;
                this.play();
            } else {
                this.interval = this.STOPWATCH_INTERVAL;
                this.pause();
            }
            this.update();
            this.updateConfig();
        }

        adjustElapsedTime(seconds) {
            this.elapsedTime += seconds;
            this.update();
        }

        parseDuration(text) {
            const value = Timer.parseMmss(text);
            if (value !== null) {
                this.duration = value;
                this.update();
                this.updateConfig();
            }
        }

        parseEmergencyDuration(text) {
            const value = Timer.parseMmss(text);
            if (value !== null) {
                this.emergencyDuration = Math.min(this.duration, value);
                this.update();
                this.updateConfig();
            }
        }

        formatDuration() {
            return Timer.formatMmss(this.duration);
        }

        formatEmergencyDuration() {
            return Timer.formatMmss(this.emergencyDuration);
        }

    }

    Timer.STANDBY = "STANDBY";
    Timer.RACING = "RACING";
    Timer.EMERGENCY = "EMERGENCY";
    Timer.ENDED = "ENDED";
    Timer.SYSTEMTIME = "SYSTEMTIME";
    Timer.MODE_COUNT_DOWN = 0;
    Timer.MODE_COUNT_UP = 1;
    Timer.MODE_SYSTEM_TIME = 2;
    Timer.SYSTEM_TIME_INTERVAL = 0.5;
    Timer.STOPWATCH_INTERVAL = 0.035;
    Timer.parseMmss = function (text) {
        try {
            const parts = String(text).split(":");
            const minutes = Math.max(0, Math.min(59, parseInt(parts[0], 10)));
            const seconds = Math.max(0, Math.min(59, parseInt(parts[1], 10)));
            if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
                return null;
            }
            return minutes * 60 + seconds;
        } catch (error) {
            return null;
        }
    };
    Timer.formatMmss = function (seconds) {
        const wholeSeconds = Math.max(0, Math.floor(seconds));
        const ss = wholeSeconds % 60;
        const mm = Math.floor((wholeSeconds - ss) / 60);
        return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    };

    window.Timer = Timer;
})();
