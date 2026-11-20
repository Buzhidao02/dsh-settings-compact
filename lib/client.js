window.__ModuleLoader__.load({
	id: "dsh-settings-compact",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

		/**
		 * dsh-settings-compact — 浏览器半。
		 *
		 * 做法：设置面板的导航是「账本投影」，没有分组概念，也没有对外 API 能改投影。
		 * 所以不动账本，只动投影：给非保留项打一个属性，用 CSS 隐藏；
		 * 在 nav 末尾插一行开关。点击路径仍然是原生 onSelect，高亮/键盘/无障碍都不受影响。
		 *
		 * 容错：认不出保留项（语言变了、外壳改版）就整体不动，宁可原样也不把设置搞乱。
		 *
		 * 配置（都不用改代码）：
		 *   localStorage["dsh-settings-compact"]           = "1" | "0"   收起 / 展开（点开关时自己写）
		 *   localStorage["dsh-settings-compact:keep"]      = ["账号与余额", ...]  按显示文本保留
		 *   localStorage["dsh-settings-compact:keepIndex"] = [0, 1, 2, 3, 9]      按导航顺序保留（0 基，给换语言的界面用）
		 * 也可以在控制台用 __DSHSC__.list() / __DSHSC__.setKeep([...]) / __DSHSC__.reset()。
		 */
		const STORAGE_KEY = "dsh-settings-compact";
		const KEEP_KEY = "dsh-settings-compact:keep";
		const INDEX_KEY = "dsh-settings-compact:keepIndex";
		const GLOBAL_KEY = "__DSHSC__";
		const STYLE_ID = "dsh-settings-compact-style";
		const PANEL_SELECTOR = '[data-shortcut-modal="settings"]';
		/** 默认留在外面的分区（按显示文本匹配；换语言认不出时会退化成「不动」）。 */
		const KEEP_LABELS = ["账号与余额", "通用设置", "模型", "内置插件", "插件市场"];

		const CSS = [
			`${PANEL_SELECTOR} nav > button[data-dshsc-toggle]{`,
			"display:flex;align-items:center;gap:8px;flex:0 0 auto;box-sizing:border-box;",
			"width:100%;height:34px;margin:2px 0 10px;padding:0 12px;",
			"border:0;border-radius:8px;background:transparent;color:inherit;",
			"font:inherit;font-size:13px;line-height:1;text-align:left;cursor:pointer;",
			"opacity:.62;transition:opacity .12s ease,background .12s ease;",
			"}",
			`${PANEL_SELECTOR} nav > button[data-dshsc-toggle]:hover{opacity:1;background:color-mix(in srgb,currentColor 10%,transparent);}`,
			`${PANEL_SELECTOR} nav > button[data-dshsc-toggle]::before{content:"⋯";font-size:15px;opacity:.8;}`,
			`html[data-dshsc="on"] ${PANEL_SELECTOR} [data-dshsc-item]{display:none !important;}`,
			"@media (max-width:640px){",
			`${PANEL_SELECTOR} nav > button[data-dshsc-toggle]{width:auto;margin:0 6px;}`,
			"}",
		].join("");

		function injectStyle() {
			if (document.getElementById(STYLE_ID)) return;
			const style = document.createElement("style");
			style.id = STYLE_ID;
			style.textContent = CSS;
			(document.head || document.documentElement).appendChild(style);
		}

		function readCollapsed() {
			try {
				const raw = window.localStorage.getItem(STORAGE_KEY);
				return raw === null ? true : raw !== "0";
			} catch {
				return true;
			}
		}

		function writeCollapsed(value) {
			try {
				window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
			} catch {
				/* 隐私模式下存不了，本次会话内照常工作 */
			}
		}

		function readList(key, check) {
			try {
				const raw = window.localStorage.getItem(key);
				if (!raw) return null;
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed) || parsed.length === 0) return null;
				return parsed.every(check) ? parsed : null;
			} catch {
				return null;
			}
		}

		function writeJson(key, value) {
			try {
				if (value === null) window.localStorage.removeItem(key);
				else window.localStorage.setItem(key, JSON.stringify(value));
			} catch {
				/* 同上 */
			}
		}

		/** 当前生效的保留规则：文本名单 + 顺序索引，任意一条命中就算保留。 */
		function resolveKeep() {
			const labels = readList(KEEP_KEY, (item) => typeof item === "string" && item.length > 0);
			const index = readList(
				INDEX_KEY,
				(item) => typeof item === "number" && Number.isInteger(item) && item >= 0,
			);
			const custom = Boolean(labels || index);
			return {
				// 只配了顺序索引时，不再叠加默认名单——那是两套规则，混起来会多留
				labels: labels || (index ? [] : KEEP_LABELS),
				index: index || [],
				custom,
			};
		}

		function labelOf(cell) {
			const label = cell.querySelector("span[class*='navLabel']");
			return (label ? label.textContent : cell.textContent || "").trim();
		}

		function setup(ctx) {
			if (typeof document === "undefined") return function noop() {};
			const html = document.documentElement;
			let collapsed = readCollapsed();
			html.dataset.dshsc = collapsed ? "on" : "off";
			injectStyle();

			let timer = 0;
			let toggle = null;
			let count = 0;
			/** 上一次扫描看到的真实文案，给 __DSHSC__.list() 用。 */
			let lastLabels = [];

			function syncToggle() {
				if (!toggle) return;
				if (collapsed) {
					toggle.textContent = count > 0 ? `更多 ${count} 项` : "更多";
					toggle.title = "展开被收起的设置分区";
				} else {
					toggle.textContent = "收起";
					toggle.title = `收起 ${count} 项不常用的设置分区`;
				}
			}

			function onToggle(event) {
				event.preventDefault();
				event.stopPropagation();
				collapsed = !collapsed;
				writeCollapsed(collapsed);
				html.dataset.dshsc = collapsed ? "on" : "off";
				syncToggle();
				scan();
			}

			function ensureToggle(nav) {
				if (toggle && toggle.isConnected) return;
				toggle = nav.querySelector(":scope > button[data-dshsc-toggle]");
				if (toggle) return;
				toggle = document.createElement("button");
				toggle.type = "button";
				toggle.dataset.dshscToggle = "1";
				toggle.addEventListener("click", onToggle, true);
				nav.appendChild(toggle);
			}

			/** 按规则给按钮打标记，返回保留 / 收起的分布。只写属性，不改结构。 */
			function mark(cells, rule) {
				const kept = [];
				const rest = [];
				cells.forEach((cell, position) => {
					const label = labelOf(cell);
					const keepByLabel = rule.labels.includes(label);
					const keepByIndex = rule.index.includes(position);
					if (keepByLabel || keepByIndex) {
						kept.push(cell);
						delete cell.dataset.dshscItem;
					} else {
						rest.push(cell);
						cell.dataset.dshscItem = "1";
					}
				});
				return { kept, rest };
			}

			function scan() {
				const panel = document.querySelector(PANEL_SELECTOR);
				if (!panel) return;
				const nav = panel.querySelector("nav");
				if (!nav) return;
				const cells = Array.from(nav.querySelectorAll(":scope > div > button"));
				if (cells.length === 0) return;
				lastLabels = cells.map(labelOf);

				let rule = resolveKeep();
				let plan = mark(cells, rule);
				// 自定义规则一个都没认出来（多半是换语言了）：退回内置名单，别把设置搞乱
				if (plan.kept.length < 2 && rule.custom) {
					rule = { labels: KEEP_LABELS, index: [], custom: false };
					plan = mark(cells, rule);
				}

				// 认不出保留项：语言/改版都会这样，整体不动比乱藏安全
				if (plan.kept.length < 2) {
					for (const cell of cells) delete cell.dataset.dshscItem;
					count = 0;
					ensureToggle(nav);
					syncToggle();
					return;
				}

				// 当前选中的分区如果本来该被收起，露出来，否则高亮会看不见
				const active = cells.find((cell) => {
					const current = cell.getAttribute("aria-current");
					return current === "true" || current === "page" || cell.getAttribute("aria-selected") === "true";
				});
				if (active && active.dataset.dshscItem) delete active.dataset.dshscItem;

				count = plan.rest.filter((cell) => cell.dataset.dshscItem === "1").length;
				ensureToggle(nav);
				syncToggle();
			}

			function schedule() {
				if (timer) return;
				timer = window.setTimeout(() => {
					timer = 0;
					scan();
				}, 80);
			}

			// 控制台小工具：看清自己界面的真实文案，再决定保留谁
			function attachConsoleApi() {
				const api = {
					list: () => lastLabels.slice(),
					collapse: () => {
						collapsed = true;
						writeCollapsed(true);
						html.dataset.dshsc = "on";
						scan();
						return api.list();
					},
					expand: () => {
						collapsed = false;
						writeCollapsed(false);
						html.dataset.dshsc = "off";
						scan();
						return api.list();
					},
					setKeep: (labels) => {
						writeJson(KEEP_KEY, Array.isArray(labels) ? labels.map(String) : null);
						scan();
						return api.list();
					},
					setKeepIndex: (index) => {
						writeJson(
							INDEX_KEY,
							Array.isArray(index) ? index.filter((n) => Number.isInteger(n) && n >= 0) : null,
						);
						scan();
						return api.list();
					},
					reset: () => {
						writeJson(KEEP_KEY, null);
						writeJson(INDEX_KEY, null);
						writeCollapsed(true);
						collapsed = true;
						html.dataset.dshsc = "on";
						scan();
						return api.list();
					},
				};
				try {
					window[GLOBAL_KEY] = api;
				} catch {
					/* 被别的东西占了就只留插件自己的行为 */
				}
				return api;
			}

			attachConsoleApi();

			const observer = new MutationObserver(schedule);
			observer.observe(document.body, { childList: true, subtree: true });
			scan();

			return function dispose() {
				observer.disconnect();
				if (timer) window.clearTimeout(timer);
				if (toggle) {
					toggle.removeEventListener("click", onToggle, true);
					toggle.remove();
					toggle = null;
				}
				delete html.dataset.dshsc;
				try {
					delete window[GLOBAL_KEY];
				} catch {
					/* ignore */
				}
				const style = document.getElementById(STYLE_ID);
				if (style) style.remove();
			};
		}

		const inject = [];

		function apply(ctx) {
			try {
				const dispose = setup(ctx);
				if (typeof ctx.effect === "function") ctx.effect(() => dispose);
			} catch (error) {
				const logger = typeof ctx.get === "function" ? ctx.get("logger") : undefined;
				if (typeof logger?.warn === "function") {
					logger.warn(`[dsh-settings-compact] setup failed: ${String(error?.message ?? error)}`);
				}
			}
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
