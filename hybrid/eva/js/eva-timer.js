(function () {
    const SEL = {
        BACKGROUND: "#pan-background",
        PANEL_TIMER: "#pan-clock",
        PANEL_POWER: "#pan-power",
        ALL_TEXT: "text",
        ALL_BORDERS: "path[id*=border], rect[id*=border]",
        ALL_DOT_GREEN: "#dot-green line",
        ALL_DOT_BLACK: "#dot-black line",
        ALL_DOT_AMBER: "#dot-amber line",
        ALL_DOT_POWER: "#pan-power [id^=dot]",
        ALL_RECTS: "rect",
        ALL_LINES: "line",
        ALL_PATHS: "path",
        ALL_CLICKABLES: "[id^=clickable-]",
        ALL_HELP_TEXTS: "[id^=help-]",
        BORDER_STOP: "#border-stop",
        BORDER_SLOW: "#border-slow",
        BORDER_NORMAL: "#border-normal",
        BORDER_RACING: "#border-racing",
        BORDER_EMERGENCY: "#border-emergency",
        BUTTON_POWER_INTERNAL: "#pan-internal",
        BUTTON_POWER_EXTERNAL: "#pan-external",
        BUTTON_STOP: "#pan-stop",
        BUTTON_SLOW: "#pan-slow",
        BUTTON_NORMAL: "#pan-normal",
        BUTTON_RACING: "#pan-racing",
        BUTTON_EMERGENCY: "#pan-emergency",
        FILL_STOP: "#bkg-stop",
        FILL_SLOW: "#bkg-slow",
        FILL_NORMAL: "#bkg-normal",
        FILL_RACING: "#bkg-racing",
        FILL_EMERGENCY: "#bkg-emergency",
        DOT_EMERGENCY: "#dot-emergency1, #dot-emergency2",
        BAR_STOP: "#bar-stop",
        BAR_SLOW: "#bar-slow",
        BAR_NORMAL: "#bar-normal",
        BAR_RACING: "#bar-racing",
        TEXT_STOP: "#text-stop",
        TEXT_SLOW: "#text-slow",
        TEXT_NORMAL: "#text-normal",
        TEXT_RACING: "#text-racing",
        TEXTGROUP_ACTIVE_TIME: "#textgroup-active-time",
        STRIP_INTERNAL: "#strip-internal",
        STRIP_EXTERNAL: "#strip-external",
        CLICKABLE_LEFT: "#clickable-left",
        CLICKABLE_BOTTOM: "#clickable-bottom",
        TEXTGROUP_TIMER: "#textgroup-clock",
        TEXTGROUP_SYSTEM_TIMER: "#textgroup-clock-sys",
        TEXT_SYSTEM_TIMER_MIN_SEC: "#text-min-sec-sys",
        TEXT_SYSTEM_TIMER_CENTISEC: "#text-millis-sys",
        TEXT_MIN_SEC: "#text-min-sec",
        TEXT_CENTISEC: "#text-millis",
        TEXT_TIMER: "#text-min-sec, #text-millis, #text-min-sec-sys, #text-millis-sys"
    };

    const STY = {
        BLINK: "blink",
        BREATH: "breath",
        BLINK_FAST: "blink-fast"
    };

    const DEFAULT_SVG_CROP = {
        left: 235,
        top: 0,
        right: 0,
        bottom: 0
    };

    const SVG_SIZE = {
        width: 2133,
        height: 1106
    };

    let guiTimer;
    let guiParent;
    let guiSettings;
    let timer;
    let config;
    let theme = "default";
    let defaultColorGradient = null;

    function clampCropValue(value, maxValue) {
        return Math.max(0, Math.min(maxValue, value));
    }

    function parseCropValue(value, fallback) {
        const parsed = Number.parseInt(String(value).trim(), 10);
        if (Number.isNaN(parsed)) {
            return fallback;
        }
        return Math.max(0, parsed);
    }

    function normalizeCropConfig(cropConfig) {
        const normalized = {
            ...cropConfig,
            cropLeft: parseCropValue(cropConfig.cropLeft, DEFAULT_SVG_CROP.left),
            cropTop: parseCropValue(cropConfig.cropTop, DEFAULT_SVG_CROP.top),
            cropRight: parseCropValue(cropConfig.cropRight, DEFAULT_SVG_CROP.right),
            cropBottom: parseCropValue(cropConfig.cropBottom, DEFAULT_SVG_CROP.bottom)
        };

        normalized.cropLeft = clampCropValue(normalized.cropLeft, SVG_SIZE.width - 1);
        normalized.cropRight = clampCropValue(normalized.cropRight, SVG_SIZE.width - 1 - normalized.cropLeft);
        normalized.cropTop = clampCropValue(normalized.cropTop, SVG_SIZE.height - 1);
        normalized.cropBottom = clampCropValue(normalized.cropBottom, SVG_SIZE.height - 1 - normalized.cropTop);

        return normalized;
    }

    function updateCropConfig(side, rawValue) {
        const cropKey = `crop${side.charAt(0).toUpperCase()}${side.slice(1)}`;
        const nextConfig = normalizeCropConfig({
            cropLeft: config.cropLeft,
            cropTop: config.cropTop,
            cropRight: config.cropRight,
            cropBottom: config.cropBottom,
            [cropKey]: rawValue
        });

        config.cropLeft = nextConfig.cropLeft;
        config.cropTop = nextConfig.cropTop;
        config.cropRight = nextConfig.cropRight;
        config.cropBottom = nextConfig.cropBottom;
        configureTimerSvg();
    }

    function configureTimerSvg() {
        const rootSvg = guiTimer && guiTimer.select("svg").targets[0];
        if (rootSvg) {
            const cropLeft = config ? config.cropLeft : DEFAULT_SVG_CROP.left;
            const cropTop = config ? config.cropTop : DEFAULT_SVG_CROP.top;
            const cropRight = config ? config.cropRight : DEFAULT_SVG_CROP.right;
            const cropBottom = config ? config.cropBottom : DEFAULT_SVG_CROP.bottom;
            rootSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");
            rootSvg.setAttribute(
                "viewBox",
                `${cropLeft} ${cropTop} ${SVG_SIZE.width - cropLeft - cropRight} ${SVG_SIZE.height - cropTop - cropBottom}`
            );
        }
    }

    function syncFullscreenState() {
        const fullscreen = guiParent && guiParent.isFullscreen();
        config.fullscreen = fullscreen ? 1 : 0;
        if (guiSettings) {
            guiSettings.select("#fullscreen").setChecked(Boolean(fullscreen));
        }
    }

    function setFullscreenEnabled(enabled) {
        const isFullscreen = guiParent.isFullscreen();
        if (enabled && !isFullscreen) {
            guiParent.requestFullscreen();
        } else if (!enabled && isFullscreen) {
            guiParent.exitFullscreen();
        } else {
            syncFullscreenState();
        }
    }

    function clearThemeClasses() {
        guiTimer.select([SEL.ALL_LINES, SEL.ALL_RECTS, SEL.ALL_PATHS]).removeClass("wireframe");
        guiTimer.select(SEL.ALL_CLICKABLES).removeClass("wireframe");
        guiTimer.select(SEL.ALL_TEXT).removeClass(["opacity70", "wireframe"]);
        guiTimer.select(SEL.TEXT_TIMER).removeClass(["wireframe-bold", "greyscale"]);
        removeRebuildTheme();
    }

    function setTheme(nextTheme) {
        clearThemeClasses();

        if (nextTheme === "wireframe" || nextTheme === "greyscale") {
            guiTimer.select([SEL.ALL_LINES, SEL.ALL_RECTS, SEL.ALL_PATHS]).addClass("wireframe");
            guiTimer.select(SEL.ALL_CLICKABLES).addClass("wireframe");
            guiTimer.select(SEL.ALL_TEXT).addClass(["opacity70", "wireframe"]);
            if (nextTheme === "greyscale") {
                guiTimer.select(SEL.TEXT_TIMER).addClass("greyscale");
            } else {
                guiTimer.select(SEL.TEXT_TIMER).addClass("wireframe-bold");
            }
            guiTimer.select(SEL.ALL_HELP_TEXTS).hide();
        } else if (nextTheme === "rebuild") {
            applyRebuildTheme();
        } else {
            nextTheme = "default";
        }

        theme = nextTheme;
        config.theme = nextTheme;
        configCallback();
    }

    function setAutoplayEnabled(enabled) {
        config.autoplay = enabled ? 1 : 0;
        configCallback();
    }

    function setThemeInputs(activeTheme) {
        if (!guiSettings) {
            return;
        }
        guiSettings.select("#theme_default").setChecked(activeTheme === "default");
        guiSettings.select("#wireframe").setChecked(activeTheme === "wireframe");
        guiSettings.select("#greyscale").setChecked(activeTheme === "greyscale");
        guiSettings.select("#rebuild").setChecked(activeTheme === "rebuild");
    }

    function renderCallback(time) {
        let minutes;
        let seconds;
        let centiseconds;
        if (time === null) {
            const now = new Date();
            minutes = now.getHours();
            seconds = now.getMinutes();
            centiseconds = now.getSeconds();
        } else {
            minutes = Math.floor((time % 3600) / 60);
            seconds = Math.floor(time % 60);
            centiseconds = Math.floor((time % 1) * 100);
        }
        if (minutes < 10) {
            guiTimer.select(SEL.TEXTGROUP_TIMER).show();
            guiTimer.select(SEL.TEXTGROUP_SYSTEM_TIMER).hide();
            guiTimer.select(SEL.TEXT_MIN_SEC).textContent(`${minutes}:${String(seconds).padStart(2, "0")}`);
            guiTimer.select(SEL.TEXT_CENTISEC).textContent(`:${String(centiseconds).padStart(2, "0")}`);
        } else {
            guiTimer.select(SEL.TEXTGROUP_TIMER).hide();
            guiTimer.select(SEL.TEXTGROUP_SYSTEM_TIMER).show();
            guiTimer.select(SEL.TEXT_SYSTEM_TIMER_MIN_SEC).textContent(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
            guiTimer.select(SEL.TEXT_SYSTEM_TIMER_CENTISEC).textContent(`:${String(centiseconds).padStart(2, "0")}`);
        }
    }

    function statusCallback(fromStatus, toStatus, fromRunning, toRunning) {
        guiTimer.clearBlinkShowHide();
        guiTimer.select([SEL.STRIP_INTERNAL, SEL.BAR_RACING]).removeClass(STY.BLINK_FAST);
        guiTimer.select([SEL.BUTTON_EMERGENCY, SEL.TEXTGROUP_ACTIVE_TIME]).removeClass(STY.BLINK);

        switch (toStatus) {
            case Timer.STANDBY:
                showStandby();
                break;
            case Timer.RACING:
                showRacing();
                break;
            case Timer.EMERGENCY:
                showEmergency();
                break;
            case Timer.ENDED:
                showEnded();
                break;
            case Timer.SYSTEMTIME:
                showSystemTime();
                break;
            default:
                console.log(`Error: ${fromStatus} -> ${toStatus}. Running: ${fromRunning} -> ${toRunning}`);
                break;
        }
        if (!toRunning && toStatus !== Timer.ENDED) {
            guiTimer.select(SEL.BAR_STOP).addClass(STY.BREATH).show();
            guiTimer.select(SEL.TEXTGROUP_TIMER).addClass(STY.BREATH);
        } else {
            guiTimer.select(SEL.BAR_STOP).removeClass(STY.BREATH).hide();
            guiTimer.select(SEL.TEXTGROUP_TIMER).removeClass(STY.BREATH);
        }
    }

    function configCallback() {
        guiSettings.select("#countdown").setChecked(timer.mode === Timer.MODE_COUNT_DOWN);
        guiSettings.select("#countup").setChecked(timer.mode === Timer.MODE_COUNT_UP);
        guiSettings.select("#systemtime").setChecked(timer.mode === Timer.MODE_SYSTEM_TIME);
        guiSettings.select("#autoplay").setChecked(Boolean(config.autoplay));
        guiSettings.select("#fullscreen").setChecked(Boolean(config.fullscreen));
        setThemeInputs(config.theme);
        guiSettings.select("#duration").setValue(timer.formatDuration());
        guiSettings.select("#emergency_duration").setValue(timer.formatEmergencyDuration());
        guiSettings.select("#crop_left").setValue(String(config.cropLeft));
        guiSettings.select("#crop_top").setValue(String(config.cropTop));
        guiSettings.select("#crop_right").setValue(String(config.cropRight));
        guiSettings.select("#crop_bottom").setValue(String(config.cropBottom));
    }

    function registerEventListenersTimer() {
        guiTimer.select(SEL.PANEL_TIMER).clickable().onClick(() => {
            if (timer.timeIsUp()) {
                timer.reset();
            } else {
                timer.togglePlayPause();
            }
        });
        guiTimer.select(SEL.PANEL_POWER).clickable().onClick(() => guiSettings.toggleVisibility());
        guiTimer.select(SEL.BUTTON_NORMAL).clickable().onClick(() => {
            timer.reset();
            timer.setMode(Timer.MODE_SYSTEM_TIME);
        });
        guiTimer.select(SEL.BUTTON_RACING).clickable().onClick(() => {
            timer.reset();
            timer.toggleModeCountUpDown();
        });
        guiTimer.select(SEL.BUTTON_STOP).clickable().onClick(() => timer.reset());
        guiTimer.select(SEL.BUTTON_SLOW).clickable().onClick(() => timer.togglePlayPause());
        guiTimer.select(SEL.CLICKABLE_BOTTOM).clickable().onClick(() => toggleRebuildTheme());
    }

    function registerEventListenersSettings() {
        const settingsRoot = guiSettings.root;
        const getElement = (selector) => settingsRoot.querySelector(selector);
        const bindChange = (selector, listener) => {
            const element = getElement(selector);
            if (element) {
                element.addEventListener("change", () => listener(element));
                element.addEventListener("input", () => listener(element));
            }
        };
        const bindInput = (selector, onInput, onBlur) => {
            const element = getElement(selector);
            if (element) {
                element.addEventListener("input", () => onInput(element));
                element.addEventListener("blur", () => onBlur(element));
            }
        };
        const bindThemeChange = (selector, themeName) => {
            bindChange(selector, (element) => {
                if (element.checked) {
                    setThemeInputs(themeName);
                    setTheme(themeName);
                } else if (theme === themeName) {
                    setThemeInputs("default");
                    setTheme("default");
                }
            });
        };
        const okButton = getElement("#ok");
        if (okButton) {
            okButton.addEventListener("click", () => guiSettings.hide());
        }

        bindChange("#countdown", (element) => {
            if (element.checked) {
                timer.setMode(0);
            }
        });
        bindChange("#countup", (element) => {
            if (element.checked) {
                timer.setMode(1);
            }
        });
        bindChange("#systemtime", (element) => {
            if (element.checked) {
                timer.setMode(2);
            }
        });
        bindChange("#fullscreen", (element) => setFullscreenEnabled(Boolean(element.checked)));
        bindThemeChange("#wireframe", "wireframe");
        bindThemeChange("#greyscale", "greyscale");
        bindThemeChange("#rebuild", "rebuild");
        bindChange("#theme_default", (element) => {
            if (element.checked) {
                setThemeInputs("default");
                setTheme("default");
            }
        });
        bindChange("#autoplay", (element) => setAutoplayEnabled(Boolean(element.checked)));
        bindInput("#duration",
            (element) => timer.parseDuration(element.value),
            () => guiSettings.select("#duration").setValue(timer.formatDuration())
        );
        bindInput("#emergency_duration",
            (element) => timer.parseEmergencyDuration(element.value),
            () => guiSettings.select("#emergency_duration").setValue(timer.formatEmergencyDuration())
        );
        bindInput("#crop_left",
            (element) => updateCropConfig("left", element.value),
            () => guiSettings.select("#crop_left").setValue(String(config.cropLeft))
        );
        bindInput("#crop_top",
            (element) => updateCropConfig("top", element.value),
            () => guiSettings.select("#crop_top").setValue(String(config.cropTop))
        );
        bindInput("#crop_right",
            (element) => updateCropConfig("right", element.value),
            () => guiSettings.select("#crop_right").setValue(String(config.cropRight))
        );
        bindInput("#crop_bottom",
            (element) => updateCropConfig("bottom", element.value),
            () => guiSettings.select("#crop_bottom").setValue(String(config.cropBottom))
        );
    }

    function registerKeyboardListeners() {
        guiTimer.selectDocument().addEventListener("keydown", (event) => {
            switch (event.code) {
                case "Space":
                    event.preventDefault();
                    timer.togglePlayPause();
                    break;
                case "KeyR":
                    timer.reset() || timer.toggleMode();
                    break;
                case "KeyF":
                    guiParent.toggleFullscreen();
                    break;
                case "KeyS":
                    guiSettings.toggleVisibility();
                    break;
                case "KeyW":
                    toggleWireframe();
                    break;
                case "KeyG":
                    toggleGreyscale();
                    break;
                case "KeyT":
                    toggleRebuildTheme();
                    break;
                case "ArrowUp":
                    event.preventDefault();
                    timer.adjustElapsedTime(-1);
                    break;
                case "ArrowDown":
                    event.preventDefault();
                    timer.adjustElapsedTime(1);
                    break;
                case "Escape":
                    guiSettings.hide();
                    break;
                default:
                    break;
            }
        });
        document.addEventListener("fullscreenchange", syncFullscreenState);
        document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    }

    function showStandby() {
        guiTimer.select(SEL.TEXTGROUP_TIMER).addClass(STY.BREATH);
        guiTimer.select([SEL.ALL_TEXT, SEL.ALL_DOT_GREEN, SEL.DOT_EMERGENCY, SEL.ALL_BORDERS]).resetAllColor();
        guiTimer.select([SEL.STRIP_INTERNAL, SEL.BAR_RACING]).removeClass(STY.BLINK_FAST);
        guiTimer.select([SEL.BUTTON_EMERGENCY, SEL.TEXTGROUP_ACTIVE_TIME]).removeClass(STY.BLINK);
        guiTimer.select([
            SEL.BUTTON_EMERGENCY,
            SEL.BUTTON_POWER_EXTERNAL,
            SEL.BUTTON_POWER_INTERNAL,
            SEL.BAR_STOP,
            SEL.BAR_SLOW,
            SEL.BAR_NORMAL,
            SEL.BAR_RACING,
            SEL.TEXT_STOP,
            SEL.TEXT_SLOW,
            SEL.TEXT_NORMAL,
            SEL.TEXT_RACING,
            SEL.BORDER_STOP,
            SEL.BORDER_SLOW,
            SEL.BORDER_NORMAL,
            SEL.BORDER_RACING,
            SEL.STRIP_EXTERNAL,
            SEL.STRIP_INTERNAL
        ]).show();
        if (theme === "rebuild") {
            applyRebuildTheme();
        } else {
            removeRebuildTheme();
        }
    }

    function showRacing() {
        guiTimer.select([SEL.BAR_STOP, SEL.BAR_SLOW, SEL.BAR_NORMAL, SEL.BUTTON_EMERGENCY, SEL.BUTTON_POWER_EXTERNAL]).hide();
        guiTimer.blinkShowHide(
            [SEL.BUTTON_POWER_INTERNAL, SEL.STRIP_INTERNAL, SEL.BAR_RACING],
            [SEL.BUTTON_POWER_EXTERNAL, SEL.STRIP_EXTERNAL, SEL.BAR_NORMAL, SEL.BUTTON_EMERGENCY]
        );
    }

    function showEmergency() {
        guiTimer.select([SEL.ALL_TEXT, SEL.ALL_DOT_GREEN, SEL.DOT_EMERGENCY]).allColor("red");
        guiTimer.select(SEL.ALL_BORDERS).strokeColor("red");
        guiTimer.select(SEL.BUTTON_EMERGENCY).show();
        guiTimer.select([SEL.BUTTON_POWER_EXTERNAL, SEL.BAR_STOP, SEL.BAR_SLOW, SEL.BAR_NORMAL, SEL.BAR_RACING]).hide();
        guiTimer.blinkShowHide([SEL.BUTTON_EMERGENCY], [SEL.BAR_RACING]);
    }

    function showEnded() {
        guiTimer.select([SEL.STRIP_INTERNAL, SEL.BAR_RACING]).addClass(STY.BLINK_FAST);
        guiTimer.select([SEL.BUTTON_EMERGENCY, SEL.TEXTGROUP_ACTIVE_TIME]).addClass(STY.BLINK);
        guiTimer.select(SEL.BAR_RACING).show();
        guiTimer.select([
            SEL.BUTTON_POWER_EXTERNAL,
            SEL.BAR_STOP,
            SEL.BAR_SLOW,
            SEL.BAR_NORMAL,
            SEL.TEXT_SLOW,
            SEL.TEXT_NORMAL,
            SEL.TEXT_RACING,
            SEL.BORDER_SLOW,
            SEL.BORDER_NORMAL,
            SEL.BORDER_RACING
        ]).hide();
    }

    function showSystemTime() {
        guiTimer.select(SEL.TEXTGROUP_TIMER).removeClass(STY.BREATH);
        guiTimer.blinkShowHide(
            [SEL.BUTTON_POWER_EXTERNAL, SEL.STRIP_EXTERNAL, SEL.BAR_NORMAL, SEL.BUTTON_EMERGENCY],
            [SEL.BUTTON_POWER_INTERNAL, SEL.STRIP_INTERNAL, SEL.BAR_RACING, SEL.BAR_STOP, SEL.BAR_SLOW]
        );
    }

    function toggleWireframe() {
        setTheme(theme === "wireframe" ? "default" : "wireframe");
    }

    function toggleGreyscale() {
        setTheme(theme === "greyscale" ? "default" : "greyscale");
    }

    function toggleRebuildTheme() {
        setTheme(theme === "rebuild" ? "default" : "rebuild");
    }

    function removeRebuildTheme() {
        if (defaultColorGradient !== null) {
            const colorGradient = guiTimer.select("#linear-gradient").targets[0];
            colorGradient.innerHTML = defaultColorGradient;
        }
        guiTimer.select([
            SEL.TEXT_TIMER,
            SEL.ALL_TEXT,
            SEL.ALL_DOT_GREEN,
            SEL.ALL_DOT_BLACK,
            SEL.ALL_DOT_AMBER,
            SEL.ALL_DOT_POWER,
            SEL.FILL_STOP,
            SEL.FILL_SLOW,
            SEL.FILL_NORMAL,
            SEL.FILL_RACING,
            SEL.FILL_EMERGENCY,
            SEL.BORDER_STOP,
            SEL.BORDER_SLOW,
            SEL.BORDER_NORMAL,
            SEL.BORDER_RACING,
            SEL.BORDER_EMERGENCY,
            SEL.ALL_BORDERS,
            "#border-external",
            "#border-internal",
            "#border-system"
        ]).resetStyle();
        guiTimer.select(SEL.ALL_BORDERS).show();
    }

    function applyRebuildTheme() {
        const modeButtonColor = "rgb(52,71,103)";
        const powerButtonColor = "rgb(78,108,178)";
        const textColor = "rgb(220,231,242)";
        const rebuildRed = "Crimson";
        const colorGradient = guiTimer.select("#linear-gradient").targets[0];
        if (defaultColorGradient === null) {
            defaultColorGradient = colorGradient.innerHTML;
        }
        colorGradient.innerHTML =
            '<stop offset="0" stop-color="Tomato"></stop>' +
            '<stop offset=".5" stop-color="Orchid"></stop>' +
            '<stop offset=".85" stop-color="rgb(51,50,200)"></stop>' +
            '<stop offset="1" stop-color="Blue"></stop>';
        guiTimer.select("#bar-purple").allColor(powerButtonColor);
        guiTimer.select(SEL.ALL_TEXT).allColor(textColor);
        guiTimer.select(SEL.ALL_DOT_AMBER).allColor("MediumSlateBlue");
        guiTimer.select(SEL.ALL_DOT_POWER).allColor("Orchid");
        guiTimer.select([SEL.ALL_DOT_GREEN, SEL.ALL_DOT_BLACK]).allColor("MintCream").opacity(0.6);
        guiTimer.select([SEL.FILL_STOP, SEL.FILL_SLOW, SEL.FILL_NORMAL, SEL.FILL_RACING]).allColor(modeButtonColor).opacity(0.45);
        guiTimer.select(SEL.FILL_EMERGENCY).fillColor(modeButtonColor);
        guiTimer.select([SEL.BORDER_STOP, SEL.BORDER_SLOW, SEL.BORDER_NORMAL, SEL.BORDER_RACING, SEL.BORDER_EMERGENCY]).strokeColor("MidNightBlue").opacity(0.45);
        guiTimer.select(SEL.ALL_BORDERS).hide();
        guiTimer.select(["#border-external", "#border-internal", "#border-system"]).show().allColor(powerButtonColor);
        guiTimer.select(SEL.TEXT_TIMER).fontFamily("SevenSegment").allColor(rebuildRed);
        guiTimer.select(SEL.TEXT_MIN_SEC).fontSize("3700%");
        guiTimer.select(SEL.TEXT_CENTISEC).fontSize("2600%");
        guiTimer.select(SEL.TEXT_SYSTEM_TIMER_MIN_SEC).fontSize("3550%");
        guiTimer.select(SEL.TEXT_SYSTEM_TIMER_CENTISEC).fontSize("2200%");
    }

    function parseConfig() {
        const params = new URLSearchParams(window.location.search);
        const baseConfig = {
            mode: Number.parseInt(params.get("mode") || "0", 10),
            autoplay: Number.parseInt(params.get("autoplay") || "0", 10),
            fullscreen: Number.parseInt(params.get("fullscreen") || "0", 10),
            theme: params.get("theme") || "default",
            duration: Number.parseInt(params.get("duration") || "300", 10),
            emergencyDuration: Number.parseInt(params.get("emergency_duration") || "60", 10),
            cropLeft: Number.parseInt(params.get("crop_left") || String(DEFAULT_SVG_CROP.left), 10),
            cropTop: Number.parseInt(params.get("crop_top") || String(DEFAULT_SVG_CROP.top), 10),
            cropRight: Number.parseInt(params.get("crop_right") || String(DEFAULT_SVG_CROP.right), 10),
            cropBottom: Number.parseInt(params.get("crop_bottom") || String(DEFAULT_SVG_CROP.bottom), 10)
        };
        return normalizeCropConfig(baseConfig);
    }

    async function initEvaTimer() {
        if (window.__evaTimerInitialized) {
            return;
        }
        window.__evaTimerInitialized = true;
        config = parseConfig();
        theme = config.theme;
        guiParent = new Div("parent").select();
        guiTimer = (await new Div("timer").load({ svg: "images/eva-timer.svg", css: "eva-timer.css" })).select();
        guiSettings = (await new Div("settings").load({ html: "settings.html" })).popup().select();
        configureTimerSvg();
        registerEventListenersTimer();
        registerEventListenersSettings();
        registerKeyboardListeners();
        timer = new Timer({
            interval: 35 / 1000,
            duration: config.duration,
            emergencyDuration: config.emergencyDuration,
            mode: config.mode,
            statusCallback,
            renderCallback,
            configCallback
        });
        timer.reset();
        configCallback();
        syncFullscreenState();
        if (config.autoplay === 1) {
            timer.play();
        }
        if (config.fullscreen === 1) {
            guiParent.requestFullscreen();
        }
        setTheme(config.theme);
    }

    window.initEvaTimer = initEvaTimer;
})();
