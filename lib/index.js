/**
 * dsh-settings-compact — 宿主半侧。
 *
 * 这个插件只用浏览器半：设置面板的导航是账本投影，宿主管不到，
 * 所以折叠逻辑全在客户端做（CSS + MutationObserver）。
 * 宿主这一侧只需要一个合法的 Cordis 插件壳，让 bundle 能被装载。
 */

export const name = 'settings-compact'

export const inject = []

export function apply() {
  // 有意为空：没有宿主侧行为。
}
