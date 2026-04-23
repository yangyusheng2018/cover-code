<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTabsStore } from '@/stores/tabs'
import * as usersApi from '@/api/users'
import LayoutAsideMenu from '@/layouts/LayoutAsideMenu.vue'

const auth = useAuthStore()
const tabsStore = useTabsStore()
const route = useRoute()
const router = useRouter()

const displayName = computed(() => auth.user?.username ?? '')

watch(
  () => route.fullPath,
  () => {
    if (
      route.name === 'login' ||
      route.name === 'forbidden' ||
      route.name === 'layout-root'
    ) {
      return
    }
    if (route.meta?.hideTab) {
      return
    }
    const title = (route.meta?.title as string) || String(route.name ?? '页面')
    tabsStore.addTab(route.fullPath, title)
  },
  { immediate: true },
)

function onTabChange(name: string | number) {
  const path = String(name)
  if (path !== route.fullPath) {
    router.push(path)
  }
}

function onTabRemove(name: string | number) {
  const closed = String(name)
  const go = tabsStore.resolvePathAfterClose(closed)
  tabsStore.removeTab(closed)
  if (route.fullPath === closed) {
    router.push(go)
  }
}

async function onRoleChange(roleId: number | string) {
  const id = Number(roleId)
  if (!Number.isFinite(id)) {
    return
  }
  if (Number(auth.activeRole?.id) === id) {
    return
  }
  try {
    await auth.switchRole(id)
    ElMessage.success('已切换角色')
  } catch {
    ElMessage.error('切换角色失败')
  }
}

async function onLogout() {
  await auth.logout()
  tabsStore.reset()
  await router.replace('/login')
}

const pwdVisible = ref(false)
const pwdSaving = ref(false)
const pwdFormRef = ref<FormInstance>()
const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const pwdRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, val: string, cb) => {
        if (val !== pwdForm.newPassword) {
          cb(new Error('两次输入的新密码不一致'))
        } else {
          cb()
        }
      },
      trigger: 'blur',
    },
  ],
}

function onUserMenuCommand(cmd: string) {
  if (cmd === 'password') {
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
    pwdVisible.value = true
  } else if (cmd === 'logout') {
    void onLogout()
  }
}

async function submitChangePassword() {
  await pwdFormRef.value?.validate()
  pwdSaving.value = true
  try {
    await usersApi.changeOwnPassword({
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword,
    })
    ElMessage.success('密码已更新')
    pwdVisible.value = false
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
    ElMessage.error(Array.isArray(msg) ? msg.join('；') : msg || '修改失败')
  } finally {
    pwdSaving.value = false
  }
}
</script>

<template>
  <div class="common-layout">
    <el-container class="common-layout__outer">
      <el-aside width="220px" class="aside">
        <div class="aside__brand">管理后台</div>
        <LayoutAsideMenu />
      </el-aside>
      <el-container class="right-inner">
        <el-header class="header">
          <div class="header__left">
            <span class="header__title">{{ route.meta.title ?? '管理后台' }}</span>
          </div>
          <div class="header__right">
            <span class="header__user">{{ displayName }}</span>
            <el-select
              v-if="auth.roles.length"
              class="header__role"
              :model-value="auth.activeRole?.id"
              placeholder="当前角色"
              size="small"
              @update:model-value="onRoleChange"
            >
              <el-option
                v-for="r in auth.roles"
                :key="r.id"
                :label="r.name"
                :value="r.id"
              />
            </el-select>
            <el-dropdown trigger="click" class="header__menu" @command="onUserMenuCommand">
              <span class="header__dropdown-trigger">
                账号
                <el-icon class="header__dropdown-icon"><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="password">修改密码</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <div class="tabs-bar">
          <el-tabs
            :model-value="route.fullPath"
            type="card"
            closable
            class="layout-tabs"
            @update:model-value="onTabChange"
            @tab-remove="onTabRemove"
          >
            <el-tab-pane
              v-for="t in tabsStore.list"
              :key="t.fullPath"
              :label="t.title"
              :name="t.fullPath"
              :closable="!t.affix"
            />
          </el-tabs>
        </div>

        <el-main class="main">
          <router-view v-slot="{ Component, route: r }">
            <keep-alive :include="tabsStore.keepAliveIncludes">
              <component :is="Component" v-if="Component" :key="r.fullPath" />
            </keep-alive>
          </router-view>
        </el-main>
        <el-footer class="footer">管理后台 · Element Plus</el-footer>
      </el-container>
    </el-container>

    <el-dialog
      v-model="pwdVisible"
      title="修改密码"
      width="440px"
      destroy-on-close
      @closed="() => pwdFormRef?.resetFields()"
    >
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="96px">
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password autocomplete="current-password" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdSaving" @click="submitChangePassword">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.common-layout {
  min-height: 100vh;
  max-height: 100vh;
  background: #f5f7fa;
}

.common-layout__outer {
  min-height: 100vh;
  max-height: 100vh;
}

.right-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-height: 100vh;
}

.aside {
  background: #1f2d3d;
  color: #fff;
  max-height: 100vh;
}

.aside__brand {
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  letter-spacing: 0.02em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.header__title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header__user {
  color: #606266;
  font-size: 14px;
}

.header__role {
  width: 160px;
}

.header__menu {
  line-height: 1;
}

.header__dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #409eff;
  user-select: none;
}

.header__dropdown-trigger:hover {
  color: #66b1ff;
}

.header__dropdown-icon {
  font-size: 12px;
}

.tabs-bar {
  flex-shrink: 0;
  padding: 0 8px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.layout-tabs {
  :deep(.el-tabs__header) {
    margin: 0;
  }
  :deep(.el-tabs__nav-wrap) {
    &::after {
      display: none;
    }
  }
  :deep(.el-tabs__item) {
    height: 36px;
    line-height: 36px;
    padding: 0 14px;
    font-size: 13px;
  }
}

.main {
  flex: 1;
  min-height: 0;
  padding: 12px 16px;
  overflow: auto;
}

.footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #909399;
  background: #fff;
  border-top: 1px solid #ebeef5;
}
</style>
