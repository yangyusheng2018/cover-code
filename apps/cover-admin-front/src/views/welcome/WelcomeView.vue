<script setup lang="ts">
defineOptions({ name: 'WelcomeView' })
</script>

<template>
  <div class="welcome">
    <el-card class="welcome__card" shadow="never">
      <template #header>
        <span class="welcome__title">欢迎</span>
      </template>
      <p class="welcome__text">欢迎使用覆盖率上报平台。</p>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.welcome {
  max-width: 720px;
}

.welcome__title {
  font-weight: 600;
  font-size: 16px;
}

.welcome__text {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}
</style>
