import type { App, DirectiveBinding } from 'vue'
import { useAuthStore } from '@/stores/auth'

/** 按钮级 UI 权限：与后端 `ui_permission.type === 'button'` 的 `code` 一致 */
function update(el: HTMLElement, binding: DirectiveBinding<string | undefined>) {
  const auth = useAuthStore()
  const code = binding.value
  if (!code) {
    el.style.display = ''
    return
  }
  el.style.display = auth.hasUiCode(code) ? '' : 'none'
}

export function registerUiCodeDirective(app: App) {
  app.directive('ui-code', {
    mounted: update,
    updated: update,
  })
}
