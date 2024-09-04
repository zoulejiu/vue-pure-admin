import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";

/**
 * 创建一个monaco 编辑器
 * @param el
 * @returns
 */
export const createMonacoEditor = (el: HTMLElement) => {
  return monaco.editor.create(el, {
    language: "shell", //指定编辑器的语言，当前设置为shell脚本
    fontSize: 16, //设置编辑器字体大小
    theme: "vs-dark", //编辑器主题
    folding: true, //是否启用代码折叠功能
    foldingHighlight: true, //是否在折叠区域显示背景色高亮
    foldingStrategy: "indentation", //设置代码折叠的策略，indentation-根据缩进进行代码折叠
    showFoldingControls: "mouseover", //设置何时显示代码折叠控件，默认在鼠标悬停时显示
    disableLayerHinting: true, //设置是否禁用图层提示
    emptySelectionClipboard: false, //设置是否允许空选择复制到剪贴板
    selectionClipboard: false, //设置是否允许进行选择复制到剪贴板。
    codeLens: false, // 设置是否启用 Code Lens（代码镜头）功能
    scrollBeyondLastLine: false, //设置是否允许滚动超过最后一行。
    colorDecorators: true, // 设置是否启用颜色修饰器。
    accessibilitySupport: "off", // 设置是否启用辅助功能支持。
    lineNumbers: "on", //设置是否显示行号
    automaticLayout: true, //设置是否自动调整编辑器布局
    lineNumbersMinChars: 5, //设置行号的最小字符数
    readOnly: false, //设置编辑器是否为只读模式
    autoClosingBrackets: "always", //设置是否自动闭合括号
    autoClosingOvertype: "always", //设置是否在输入时自动替换已有文本
    autoClosingQuotes: "always" //设置是否自动闭合引号。
  });
};
