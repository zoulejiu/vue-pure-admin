<template>
  <div
    ref="terminalRef"
    v-loading="loading"
    element-loading-text="拼命连接中"
  />
</template>
<script setup lang="ts">
defineOptions({
  name: "TerminalViewOld"
});
const props = defineProps({ id: Number, type: String });
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { debounce } from "lodash";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import SockJS from "sockjs-client/dist/sockjs.js";
import { type CompatClient, Stomp } from "@stomp/stompjs";
import "@xterm/xterm/css/xterm.css";

const terminalRef = ref(null);
const fitAddon = new FitAddon();

let first = ref(true);
let loading = ref(true);
let terminalSocket = ref<CompatClient>(null);
let term = ref(null);

const runRealTerminal = () => {
  loading.value = false;
};

const onWSReceive = message => {
  // 首次接收消息,发送给后端，进行同步适配
  if (first.value === true) {
    first.value = false;
    resizeRemoteTerminal();
  }
  const data = JSON.parse(message.data);
  term.value.element && term.value.focus();
  term.value.write(data.Data);
};

const errorRealTerminal = ex => {
  let message = ex.message;
  if (!message) message = "disconnected";
  term.value.write(`\x1b[31m${message}\x1b[m\r\n`);
  console.log("err");
};
const closeRealTerminal = () => {
  console.log("close");
};

const createWS = () => {
  const socket = new SockJS("http://localhost:8080/platform-admin/ws");
  terminalSocket.value = Stomp.over(socket);
  terminalSocket.value.connect({}, () => {
    runRealTerminal();
    term.value.write("欢迎使用SSH" + "\r\n");
    terminalSocket.value.subscribe("/topic/output", message => {
      console.log(message);
      term.value.write(message + "\r\n");
    });
  });
};
const initWS = () => {
  if (!terminalSocket.value) {
    createWS();
  }
  if (terminalSocket.value && terminalSocket.value.state == 0) {
    terminalSocket.value.disconnect();
    createWS();
  }
};
// 发送给后端,调整后端终端大小,和前端保持一致,不然前端只是范围变大了,命令还是会换行
const resizeRemoteTerminal = () => {
  const { cols, rows } = term.value;
  if (isWsOpen()) {
    terminalSocket.value.send(
      JSON.stringify({
        Op: "resize",
        Cols: cols,
        Rows: rows
      })
    );
  }
};
const initTerm = () => {
  term.value = new Terminal({
    lineHeight: 1.2,
    fontSize: 12,
    fontFamily: "Monaco, Menlo, Consolas, 'Courier New', monospace",
    theme: {
      background: "#181d28"
    },
    // 光标闪烁
    cursorBlink: true,
    cursorStyle: "underline",
    scrollback: 100,
    tabStopWidth: 4
  });
  term.value.open(terminalRef.value);
  term.value.loadAddon(fitAddon);
  // 不能初始化的时候fit,需要等terminal准备就绪,可以设置延时操作
  setTimeout(() => {
    fitAddon.fit();
  }, 5);
};
// 是否连接中0 1 2 3
const isWsOpen = () => {
  const readyState = terminalSocket.value && terminalSocket.value.state;
  return readyState === 0;
};
const fitTerm = () => {
  fitAddon.fit();
};
const onResize = debounce(() => fitTerm(), 800);

const termData = () => {
  // 输入与粘贴的情况,onData不能重复绑定,不然会发送多次
  term.value.onData(data => {
    if (isWsOpen()) {
      terminalSocket.value.send(
        JSON.stringify({
          Op: "stdin",
          Data: data
        })
      );
    }
  });
};
const onTerminalResize = () => {
  window.addEventListener("resize", onResize);
};
const removeResizeListener = () => {
  window.removeEventListener("resize", onResize);
};
//监听类型变化，重置term
watch(
  () => props.type,
  () => {
    first.value = true;
    loading.value = true;
    terminalSocket.value = null;
    initWS();
    // 重置
    term.value.reset();
  }
);

onMounted(() => {
  initWS();
  initTerm();
  termData();
  onTerminalResize();
});
onBeforeUnmount(() => {
  removeResizeListener();
  terminalSocket.value && terminalSocket.value.disconnect();
});
</script>
<style lang="scss" scoped>
#terminal {
  width: 100%;
  height: 100%;
}
</style>
