<template>
  <div ref="terminalRef" class="terminal" />
</template>

<script setup lang="ts">
defineOptions({
  name: "TerminalView"
});
import { onMounted, ref, toRaw } from "vue";
import { TermClient, type WsOptions } from "@/utils/terminal/xtermUtil";
import { createMonacoEditor } from "@/utils/terminal/monacoEditorUtils";
import type { LoadingInstance } from "element-plus/lib/components/loading/src/loading.js";

const props = defineProps({ id: Number, type: String });
onMounted(() => {
  initTextEditor();
  openTerminal();
});
const terminalRef = ref();
const textEditor = ref();
// 页面加载状态
const loading = ref<LoadingInstance>();
const openTerminal = () => {
  let wsOptions: WsOptions = {
    id: props.id,
    type: props.type
  };
  setTimeout(() => {
    let termClient = new TermClient({
      terminalIdx: 1,
      wsOptions: wsOptions,
      terminalEle: terminalRef.value,
      onOpenEditor: onOpenEditor,
      onCloseEditor: onCloseEditor,
      onFailEditor: onFailEditor,
      onWsConnectSuccess: onWsConnectSuccess
    });
  });
};
const initTextEditor = () => {
  textEditor.value = createMonacoEditor(terminalRef.value);
};
const onOpenEditor = (text: string) => {
  toRaw(textEditor.value).setValue(text);
};
const onCloseEditor = () => {
  toRaw(textEditor.value).setValue("");
  loading.value?.close();
};
const onFailEditor = () => {
  loading.value?.close();
};
const onWsConnectSuccess = () => {
  loading.value?.close();
};
</script>

<style scoped lang="scss">
.terminal {
  width: 60%;
  height: 600px;
  overflow: hidden;
}
</style>
