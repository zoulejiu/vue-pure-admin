<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, toRaw } from "vue";

import type { LoadingInstance } from "element-plus/lib/components/loading/src/loading.js";
import { ElLoading, ElMessage } from "element-plus";
import "@xterm/xterm/css/xterm.css";
import { type WsOptions, TermClient } from "@/utils/terminal/xtermUtil";
import { createMonacoEditor } from "@/utils/terminal/monacoEditorUtils";
import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution";
import { Refresh } from "@element-plus/icons-vue";

const props = defineProps({ id: Number, type: String });

// 页面加载状态
const loading = ref<LoadingInstance>();
const loadingOption = {
  lock: true,
  text: "加载中...",
  background: "rgba(0, 0, 0, 0.7)"
};

const termClientArr = ref<(TermClient | null)[]>([]);
let termIndex = ref<number>(-1);
const termListRef = ref();
const termContRef = ref();
const termContResizeObserver = ref();

const isViEdit = ref<boolean>();
const textEditorRef = ref();
const textEditor = ref();

onMounted(() => {
  console.log("onMounted....");
  loading.value = ElLoading.service(loadingOption);
  // 初始化文本编辑器
  initTextEditor();
  // 获取ssh服务器详情
  // 添加一个终端
  addTerminal();
});

/**
 * 添加一个终端
 */
const addTerminal = () => {
  if (termClientArr.value.filter(item => !item?.closed).length === 5) {
    ElMessage.warning({ message: "最多只支持打开5个终端" });
    return;
  }

  let wsOptions: WsOptions = {
    id: props.id,
    type: props.type
  };

  let termIdx = termClientArr.value.length;
  termClientArr.value[termIdx] = null;
  termIndex.value = termIdx;

  setTimeout(() => {
    termClientArr.value[termIdx] = new TermClient({
      terminalIdx: termIndex.value,
      wsOptions: wsOptions,
      terminalEle: termListRef.value.children[termIndex.value],
      onOpenEditor: onOpenEditor,
      onCloseEditor: onCloseEditor,
      onFailEditor: onFailEditor,
      onWsConnectSuccess: onWsConnectSuccess
    });
  });
};

/**
 * 连接成功
 */
const onWsConnectSuccess = () => {
  loading.value?.close();
};

/**
 * 关闭终端
 * @param termClient
 * @param index
 */
const switchTermClient = (termClient: TermClient, index: number) => {
  termIndex.value = index;
};

/**
 * 关闭终端
 * @param termClient
 * @param index
 */
const termClientClose = (termClient: TermClient, index: number) => {
  if (termClientArr.value.filter(item => !item?.closed).length === 1) {
    ElMessage.warning({ message: "您至少需要保留一个终端" });
    return;
  }

  // 找到所有未关闭的终端的序号
  let idxArr = termClientArr.value
    .filter(item => item && !item?.closed)
    .map(item => item?.terminalIdx!);
  if (idxArr[0] === index) {
    // 找到第一个未关闭的终端，如果要关闭的是第一个的话,取往后一个
    termIndex.value = idxArr[1];
  } else {
    // 否则往前一个
    termIndex.value = idxArr[idxArr.indexOf(index) - 1];
  }

  termClient.closed = true;
  termClient.webSocket.disconnect();
};

/**
 * 打开编辑模式
 */
const onOpenEditor = (text: string) => {
  isViEdit.value = true;
  toRaw(textEditor.value).setValue(text);
};

/**
 * 关闭编辑模式
 */
const onCloseEditor = () => {
  toRaw(textEditor.value).setValue("");
  isViEdit.value = false;
  loading.value?.close();
};

/**
 * 编辑器失败
 */
const onFailEditor = () => {
  loading.value?.close();
};

/**
 * 初始化编辑器
 */
const initTextEditor = () => {
  textEditor.value = createMonacoEditor(textEditorRef.value);
};

/**
 * 取消编辑
 */
const cancelEdit = () => {
  toRaw(textEditor.value).setValue("");
  isViEdit.value = false;

  let currTerm = termClientArr.value[termIndex.value];
  currTerm?.terminal.write(`\r\n${currTerm.rowPrefixStr}`);
};

/**
 * 保存并关闭编辑
 */
const saveAndCloseEdit = () => {
  loading.value = ElLoading.service(loadingOption);
  let editorTxt = toRaw(textEditor.value).getValue();
  termClientArr.value[termIndex.value]?.wsSendEditorStr(editorTxt);
};

/** 重连 */
const reconnect = () => {
  loading.value = ElLoading.service(loadingOption);
  let currTerm = termClientArr.value[termIndex.value];
  currTerm?.reconnectWebsocket();
};

const close = () => {
  termClientArr.value.forEach(termClient => {
    termClient?.webSocket.disconnect();
  });
};

onBeforeUnmount(() => {
  if (termContRef.value) {
    termContResizeObserver.value?.unobserve(termContRef.value);
  }

  termClientArr.value.forEach(termClient => {
    termClient?.webSocket.disconnect();
  });
});
defineExpose({ close });
</script>

<template>
  <main class="terminal-view">
    <div class="terminal-view-header">
      <div class="view-header-left" />
      <div>
        <span class="header-btn" @click="reconnect">
          <el-icon><Refresh /></el-icon>
          重新连接
        </span>
      </div>
    </div>
    <div ref="termContRef" class="terminal-container">
      <!-- 终端列表 -->
      <div ref="termListRef" class="terminal-list">
        <template v-for="(termClient, index) in termClientArr" :key="index">
          <div v-show="index === termIndex" class="term-client-item" />
        </template>
      </div>
      <!-- 文本编辑 -->
      <div v-show="isViEdit" class="text-editor-container">
        <div ref="textEditorRef" class="text-editor" />
        <div class="text-editor-btns">
          <el-button type="default" @click="cancelEdit">取消编辑</el-button>
          <el-button type="primary" @click="saveAndCloseEdit">
            保存并关闭
          </el-button>
        </div>
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.terminal-view {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;

  // header
  .terminal-view-header {
    display: flex;
    justify-content: space-between;
    padding: 1px 10px 1px 1px;
    background: #f8f8f8;
    //border: 1px solid #e7e7e7;

    .view-header-left {
      display: flex;
      align-items: end;
    }

    .view-header-right {
      display: flex;
      align-items: start;
    }

    .logo-image {
      width: auto;
      height: 24px;
      cursor: pointer;
    }

    .ssh-server-info {
      display: flex;
      align-items: center;
      margin-left: 30px;
    }

    .ssh-server-type,
    i {
      width: 18px;
      height: 18px;
    }

    .ssh-server-name {
      margin-left: 8px;
      color: #333;
    }

    .header-btn {
      display: inline-flex;
      align-items: center;
      margin-left: 28px;
      color: #409eff;
      cursor: pointer;
    }
  }

  // 终端选项卡列表
  .term-client-tab-list {
    display: flex;
    align-items: center;
    color: #fff;
    background-color: #343a40;

    .term-client-tab {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 160px;
      height: 30px;
      padding: 0 16px;
      cursor: pointer;
      background-color: #343a40;
      border-right: 1px solid #9d9d9d;
      border-top-left-radius: 2px;
      border-top-right-radius: 2px;

      &.selected {
        background-color: #000;
        border-top: 3px solid #409eff;
      }
    }

    .term-client-tab-text {
      display: -webkit-box;
      flex: 1;
      width: 80px;
      padding: 0 10px;
      overflow: hidden;
      font-size: 14px;
      text-overflow: ellipsis;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
    }

    .term-client-tab-close {
      i.el-icon {
        position: relative;
        top: 3px;
      }
    }

    .term-client-add-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      margin: 0 16px;
      cursor: pointer;
      border-radius: 50%;

      &:hover {
        color: #409eff;
        background-color: #f8f8f8;
      }
    }
  }

  // 终端编辑器

  .terminal-container {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    background-color: #000;

    .terminal-list {
      flex: 1;
      padding: 16px;

      .term-client-item {
        height: 100%;
      }
    }

    // 文本编辑
    .text-editor-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #fff;

      .text-editor {
        width: 100%;
        height: 100%;
      }

      .text-editor-btns {
        position: absolute;
        right: 80px;
        bottom: 80px;
        z-index: 10;
      }
    }
  }
}
</style>
