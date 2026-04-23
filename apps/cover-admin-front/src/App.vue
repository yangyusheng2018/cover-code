<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  .is-never-shadow{
    height: calc(100% - 24px);
  }
  
}
</style>
