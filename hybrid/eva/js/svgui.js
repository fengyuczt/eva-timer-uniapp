(function () {
    function normalizeResourceKey(url) {
        if (typeof url !== "string" || url.length === 0) {
            return [];
        }

        const normalized = url.replace(/\\/g, "/");
        const withoutQuery = normalized.split("?")[0].split("#")[0];
        const candidates = new Set([withoutQuery]);

        const trimmedDot = withoutQuery.replace(/^\.\//, "");
        candidates.add(trimmedDot);

        const staticMarker = "/static/eva/";
        const staticIndex = withoutQuery.indexOf(staticMarker);
        if (staticIndex >= 0) {
            candidates.add(withoutQuery.slice(staticIndex + staticMarker.length));
        }

        const hybridMarker = "/hybrid/eva/";
        const hybridIndex = withoutQuery.indexOf(hybridMarker);
        if (hybridIndex >= 0) {
            candidates.add(withoutQuery.slice(hybridIndex + hybridMarker.length));
        }

        if (trimmedDot.startsWith("file://")) {
            candidates.add(trimmedDot.replace(/^file:\/\/+/, ""));
        }

        return Array.from(candidates)
            .map((candidate) => candidate.replace(/^\/+/, ""))
            .filter(Boolean);
    }

    async function loadText(url) {
        const resourceMap = window.__EVA_RESOURCES || {};
        for (const key of normalizeResourceKey(url)) {
            const embedded = resourceMap[key];
            if (typeof embedded === "string") {
                return embedded;
            }
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
        }
        return await response.text();
    }

    function styleId(url) {
        return "s" + btoa(url).replace(/[^a-zA-Z0-9]/g, "");
    }

    function syncPopupHostPointerEvents(element, enabled) {
        if (!element || !element.classList || !element.classList.contains("popup-background")) {
            return;
        }
        const rootNode = element.getRootNode && element.getRootNode();
        const host = rootNode && rootNode.host;
        if (host) {
            host.style.pointerEvents = enabled ? "auto" : "none";
        }
    }

    class DOMUtils {}

    DOMUtils.idx = 0;
    DOMUtils.toList = function (anything) {
        return Array.isArray(anything) ? anything : [anything];
    };
    DOMUtils.getShadowRoot = function (hostElement) {
        return hostElement.shadowRoot || hostElement.attachShadow({ mode: "open" });
    };
    DOMUtils.nextId = function () {
        DOMUtils.idx += 1;
        return DOMUtils.idx;
    };

    class Svgui {
        constructor(root, targets) {
            this.root = root;
            this.targets = Array.from(targets || []);
        }

        selectDocument() {
            return new Svgui(this.root, [document]);
        }

        select(selectors) {
            const query = Array.isArray(selectors) ? selectors.join(",") : selectors;
            return new Svgui(this.root, this.root.querySelectorAll(query));
        }

        isShadowDom() {
            const node = this.root.getRootNode();
            return node && node.host;
        }

        addEventListener(eventType, listener) {
            this.targets.forEach((element) => element.addEventListener(eventType, listener));
            return this;
        }

        toggleClass(classname) {
            DOMUtils.toList(classname).forEach((name) => {
                this.targets.forEach((element) => element.classList.toggle(name));
            });
            return this;
        }

        addClass(classname) {
            DOMUtils.toList(classname).forEach((name) => {
                this.targets.forEach((element) => element.classList.add(name));
            });
            return this;
        }

        removeClass(classname) {
            DOMUtils.toList(classname).forEach((name) => {
                this.targets.forEach((element) => element.classList.remove(name));
            });
            return this;
        }

        containClass(classname) {
            return this.targets.some((element) => element.classList.contains(classname));
        }

        style(attrValues) {
            this.targets.forEach((element) => {
                Object.entries(attrValues).forEach(([attribute, value]) => {
                    element.style[attribute] = value;
                });
            });
            return this;
        }

        isFullscreen() {
            return Boolean(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
        }

        requestFullscreen() {
            const element = this.isShadowDom() ? this.root.getRootNode().host : this.root;
            if (element.requestFullscreen) {
                Promise.resolve(element.requestFullscreen()).catch(() => {});
            } else if (element.webkitRequestFullscreen) {
                Promise.resolve(element.webkitRequestFullscreen()).catch(() => {});
            } else if (element.msRequestFullscreen) {
                Promise.resolve(element.msRequestFullscreen()).catch(() => {});
            }
            return this;
        }

        exitFullscreen() {
            if (document.exitFullscreen) {
                Promise.resolve(document.exitFullscreen()).catch(() => {});
            } else if (document.webkitExitFullscreen) {
                Promise.resolve(document.webkitExitFullscreen()).catch(() => {});
            } else if (document.msExitFullscreen) {
                Promise.resolve(document.msExitFullscreen()).catch(() => {});
            }
            return this;
        }

        toggleFullscreen() {
            return this.isFullscreen() ? this.exitFullscreen() : this.requestFullscreen();
        }

        isVisible() {
            if (!this.targets[0]) {
                return false;
            }
            const computed = window.getComputedStyle(this.targets[0]);
            return computed.display !== "none" && computed.visibility === "visible" && parseFloat(computed.opacity) >= 0.1;
        }

        hide() {
            this.targets.forEach((element) => syncPopupHostPointerEvents(element, false));
            return this.style({ visibility: "hidden", opacity: "0", pointerEvents: "none" });
        }

        show() {
            this.targets.forEach((element) => syncPopupHostPointerEvents(element, true));
            return this.style({ visibility: "visible", opacity: "1", pointerEvents: "auto" });
        }

        toggleVisibility() {
            return this.isVisible() ? this.hide() : this.show();
        }

        setChecked(checked) {
            this.targets.forEach((element) => {
                element.checked = checked;
            });
            return this;
        }

        setValue(value) {
            this.targets.forEach((element) => {
                element.value = value;
            });
            return this;
        }

        textContent(text) {
            this.targets.forEach((element) => {
                element.textContent = text;
            });
            return this;
        }

        allColor(color) {
            return this.style({ fill: color, stroke: color });
        }

        resetAllColor() {
            return this.allColor("");
        }

        fillColor(color) {
            return this.style({ fill: color });
        }

        strokeColor(color) {
            return this.style({ stroke: color });
        }

        opacity(value) {
            return this.style({ opacity: value });
        }

        fontFamily(fontFace) {
            return this.style({ fontFamily: fontFace });
        }

        fontSize(fontSize) {
            return this.style({ fontSize });
        }

        resetStyle() {
            this.targets.forEach((element) => {
                element.style.cssText = "";
            });
            return this;
        }

        onClick(listener) {
            this.targets.forEach((element) => {
                let lastTapAt = 0;
                const targets = [element, ...element.querySelectorAll("*")];
                targets.forEach((target) => {
                    let pointerStartX = 0;
                    let pointerStartY = 0;
                    let pointerMoved = false;

                    target.addEventListener("pointerdown", (event) => {
                        pointerStartX = event.clientX;
                        pointerStartY = event.clientY;
                        pointerMoved = false;
                    });

                    target.addEventListener("pointermove", (event) => {
                        if (Math.abs(event.clientX - pointerStartX) > 10 || Math.abs(event.clientY - pointerStartY) > 10) {
                            pointerMoved = true;
                        }
                    });

                    target.addEventListener("pointercancel", () => {
                        pointerMoved = true;
                    });

                    target.addEventListener("pointerup", (event) => {
                        if (pointerMoved) {
                            return;
                        }
                        lastTapAt = Date.now();
                        listener(event);
                    });

                    target.addEventListener("click", (event) => {
                        if (Date.now() - lastTapAt < 500) {
                            return;
                        }
                        listener(event);
                    });
                });
            });
            return this;
        }

        onInput(listener) {
            this.targets.forEach((element) => {
                element.addEventListener("input", (event) => listener(element, event));
            });
            return this;
        }

        onChange(listener) {
            this.targets.forEach((element) => {
                element.addEventListener("change", (event) => listener(element, event));
            });
            return this;
        }

        onFocusout(listener) {
            this.targets.forEach((element) => {
                element.addEventListener("focusout", (event) => listener(element, event));
            });
            return this;
        }

        clickable() {
            this.targets.forEach((element) => {
                element.style.touchAction = "manipulation";
            });
            return this.addClass("clickable");
        }

        clearBlinkShowHide() {
            if (this.root.__svguiBlinkTimeoutId !== undefined && this.root.__svguiBlinkTimeoutId !== null) {
                window.clearTimeout(this.root.__svguiBlinkTimeoutId);
                this.root.__svguiBlinkTimeoutId = null;
            }
            this.select(".blink-show").removeClass("blink-show").show();
            this.select(".blink-hide").removeClass("blink-hide").hide();
            return this;
        }

        blinkShowHide(shows, hides) {
            this.clearBlinkShowHide();
            this.select(shows).addClass("blink-show");
            this.select(hides).addClass("blink-hide");
            this.root.__svguiBlinkTimeoutId = window.setTimeout(() => {
                this.root.__svguiBlinkTimeoutId = null;
                this.select(shows).removeClass("blink-show").show();
                this.select(hides).removeClass("blink-hide").hide();
            }, 500);
            return this;
        }
    }

    class Div {
        constructor(id = null) {
            if (id !== null) {
                const hostElement = document.getElementById(id);
                if (!hostElement) {
                    throw new Error(`Host element (${id}) not found`);
                }
                this.root = hostElement;
                this.target = hostElement;
            } else {
                this.root = null;
                this.target = null;
            }
        }

        isShadowDom() {
            const node = this.root.getRootNode();
            return node && node.host;
        }

        async loadCss(url) {
            this.unloadCss(url);
            const style = document.createElement("style");
            style.id = styleId(url);
            style.textContent = await loadText(url);
            if (this.isShadowDom()) {
                this.root.appendChild(style);
            } else {
                const container = this.target || this.root || document.body || document.documentElement;
                container.appendChild(style);
            }
            return this;
        }

        unloadCss(url) {
            const existing = this.root.getRootNode().getElementById(styleId(url));
            if (existing) {
                existing.remove();
            }
            return this;
        }

        async loadUrl(url, append = true) {
            const text = await loadText(url);
            this.target.innerHTML = append ? this.target.innerHTML + text : text;
            return this;
        }

        async loadHtml(url, append = true) {
            await this.loadUrl(url, append);
            if (!this.target.firstElementChild) {
                throw new Error(`Failed to load HTML: ${url}`);
            }
            return this;
        }

        async loadSvg(url, append = true) {
            await this.loadUrl(url, append);
            if (!this.target.querySelector("svg:first-of-type")) {
                throw new Error(`Failed to load svg: ${url}`);
            }
            return this;
        }

        loadInnerHtml(innerHtml, append = true) {
            this.target.innerHTML = append ? this.target.innerHTML + innerHtml : innerHtml;
            if (!this.target.firstElementChild) {
                throw new Error(`Invalid inner_html: ${innerHtml}`);
            }
            return this;
        }

        shadow() {
            const div = new Div();
            div.root = this.target;
            div.target = this.target;
            return div;
        }

        popup(bgId = null, bgColor = "rgba(254, 0, 0, 0.5)", fgId = null, fgColor = "black") {
            const resolvedBgId = bgId || `popup-bg-${DOMUtils.nextId()}`;
            const resolvedFgId = fgId || `popup-fg-${DOMUtils.nextId()}`;
            const originalInnerHTML = this.target.innerHTML;
            this.target.innerHTML = "";
            this.loadInnerHtml(
                `<div id="${resolvedBgId}" class="popup-background">` +
                `<div class="popup-foreground" onclick="event.stopPropagation()">` +
                `<div id="${resolvedFgId}"></div></div></div>`
            );
            const bgLayer = this.root.querySelector(`#${resolvedBgId}`);
            const fgShell = bgLayer.querySelector(".popup-foreground");
            const fgLayer = this.root.querySelector(`#${resolvedFgId}`);
            bgLayer.addEventListener("click", (event) => {
                if (event.target === bgLayer) {
                    bgLayer.style.visibility = "hidden";
                    bgLayer.style.opacity = "0";
                    bgLayer.style.pointerEvents = "none";
                    syncPopupHostPointerEvents(bgLayer, false);
                }
            });
            bgLayer.style.backgroundColor = bgColor;
            bgLayer.style.position = "fixed";
            bgLayer.style.left = "0";
            bgLayer.style.top = "0";
            bgLayer.style.right = "0";
            bgLayer.style.bottom = "0";
            bgLayer.style.width = "100vw";
            bgLayer.style.height = "100vh";
            syncPopupHostPointerEvents(bgLayer, false);
            fgShell.style.backgroundColor = fgColor;
            fgShell.style.position = "fixed";
            fgShell.style.left = "50%";
            fgShell.style.top = "50%";
            fgShell.style.width = "84vw";
            fgShell.style.maxWidth = "640px";
            fgShell.style.maxHeight = "84vh";
            fgShell.style.transform = "translate(-50%, -50%)";
            fgShell.style.boxSizing = "border-box";
            fgShell.style.overflowY = "auto";
            fgShell.style.overflowX = "hidden";
            fgShell.style.padding = "1em 2em";
            fgShell.style.borderRadius = "1em";
            fgShell.style.webkitOverflowScrolling = "touch";
            fgShell.style.touchAction = "pan-y";
            fgShell.style.display = "block";
            fgLayer.style.width = "100%";
            fgLayer.style.maxWidth = "100%";
            fgLayer.innerHTML = originalInnerHTML;
            const div = new Div();
            div.root = bgLayer;
            div.target = fgLayer;
            return div;
        }

        overlay() {
            this.root.classList.add("overlay");
            return this;
        }

        async load({ svg = null, html = null, css = null } = {}) {
            const shadowChild = this.shadow();
            if (svg !== null) {
                await shadowChild.loadSvg(svg, false);
            }
            if (html !== null) {
                await shadowChild.loadHtml(html, false);
            }
            if (css !== null) {
                const cssUrls = Array.isArray(css) ? css : [css];
                for (const cssUrl of cssUrls) {
                    await shadowChild.loadCss(cssUrl);
                }
            }
            await shadowChild.loadCss("svgui.css");
            return shadowChild;
        }

        select(selectors = null) {
            if (selectors === null) {
                return new Svgui(this.root, [this.root]);
            }
            const query = Array.isArray(selectors) ? selectors.join(",") : selectors;
            return new Svgui(this.root, this.root.querySelectorAll(query));
        }
    }

    window.DOMUtils = DOMUtils;
    window.Svgui = Svgui;
    window.Div = Div;
})();
