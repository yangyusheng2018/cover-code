<script setup>
import { ref } from "vue";

const count = ref(0);
function handleClick() {  
  count.value++;
  if(count.value > 10) {
    console.log("count > 10");
    console.log("count > 10");
    console.log("count > 10");
    console.log("count > 10");
  } else if(count.value > 5) {
    console.log("count > 5");
    console.log("count > 5");
    console.log("count > 5");   
    console.log("count > 5");
  } else {
    console.log("count <= 5");
    console.log("count <= 5");
    console.log("count <= 5");  
    console.log("count <= 5");
  }
  console.log("count",count.value);
}

</script>

<template>
  <main style="font-family: system-ui; padding: 24px; max-width: 640px">
    <h1>Vite + Vue3 覆盖率演示</h1>
    <div>默认行</div>
    <div>默认行</div>
    <div>默认行</div>
    <div>默认行</div>

    <button @click="handleClick">+1</button>
    <div>{{ count }}</div>
    <div>默认行2</div>
    <div>默认行2</div>
    <div>默认行2</div>
    <div>默认行2</div>
    <div v-if="count > 5">
      <div>
        <p>count > 5这是大于5的分支</p>
      </div>
    </div>
    <div v-else-if="count >10">
      <div>
        <p>count>10这是小于5的分支</p>
      </div>
    </div>
    <div v-else>
      <div>
        <p>这是剩余分支</p>
      </div>
    </div>
  </main>
</template>

<style scoped>

</style>
