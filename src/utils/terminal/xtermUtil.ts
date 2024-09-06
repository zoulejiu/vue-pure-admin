// 导入xterm
import { type ITerminalOptions, Terminal } from "@xterm/xterm";
/** FitAddon插件可用于自动调整 xterm.js 终端的大小，以适应容器的尺寸变化。 */
import { FitAddon } from "@xterm/addon-fit";
/** WebLinksAddon插件可以识别终端中的 URL 和文件路径，并允许用户点击这些链接来打开相关内容。 */
import { WebLinksAddon } from "@xterm/addon-web-links";
/** WebLinksAddon插件提供在终端中搜索文本的功能，使用户可以快速定位关键字。 */
import { SearchAddon } from "@xterm/addon-search";
/** Unicode11Addon插件支持Unicode 11 的特性，包括新的 emoji、符号和文字修饰符。 */
import { Unicode11Addon } from "@xterm/addon-unicode11";
import SockJS from "sockjs-client/dist/sockjs.js";
import { type CompatClient, type IMessage, Stomp } from "@stomp/stompjs";
import "@xterm/xterm/css/xterm.css";

// 导入ws连接地址

let baseWebSocketURL = "http://localhost:8080/platform-admin/ws";
// let baseWebSocketURL = "ws://localhost:8088/ws";

export interface WsOptions {
  /** 连接方式 */
  id: number;
  //连接类型
  type: string;
}

export type WsParam = {
  id: number;
  command: string;
  type: string;
};

export class TermClient {
  /** 终端所挂载的dom元素 */
  terminalEle: HTMLElement;
  /** websocket 配置 */
  wsOptions: WsOptions;
  /** 终端 */
  terminal: Terminal;
  /** 终端序号 */
  terminalIdx: number;
  /** xterm fit 适配插件 */
  fitAddon: FitAddon;
  /** 终端命令的前缀 */
  rowPrefixStr: string;
  /** 终端最后一条命令 */
  rowCommand: string;
  /** 终端输入的文字 */
  rowInputStr: string;
  /** WebSocket实例 */
  webSocket: CompatClient;
  /**  WebSocket状态标识 */
  wsStatus: string;
  /** WebSocket 发送的消息 */
  wsSendMsg: string;
  /** WebSocket连接成功 */
  onWsConnectSuccess: undefined | Function;
  /** 编辑文本的文件名 */
  editFileName: string;
  /** 输入vi|vim */
  isViMode: boolean;
  /** 文本编辑保存  */
  isEditorSave: boolean;
  /** 编辑的文本内容 */
  isEditorText: string;
  /** 文本编辑器打开 */
  onOpenEditor: undefined | Function;
  /** 文本编辑器关闭 */
  onCloseEditor: undefined | Function;
  /** 文本编辑器保存失败 */
  onFailEditor: undefined | Function;
  /** 终端关闭状态 */
  closed: boolean;

  constructor(options: {
    /** 终端所挂载的dom元素  */
    terminalEle: HTMLElement;
    /** 终端序号 */
    terminalIdx: number;
    /** websocket 配置 */
    wsOptions: WsOptions;
    /** WebSocket连接成功 */
    onWsConnectSuccess?: Function;
    /** 文本编辑器打开 */
    onOpenEditor?: Function;
    /** 文本编辑器关闭 */
    onCloseEditor?: Function;
    /** 文本编辑器保存失败 */
    onFailEditor?: Function;
  }) {
    const {
      terminalEle,
      terminalIdx,
      wsOptions,
      onWsConnectSuccess,
      onOpenEditor,
      onCloseEditor,
      onFailEditor
    } = options;
    this.terminalEle = terminalEle;
    this.wsOptions = wsOptions;
    this.fitAddon = new FitAddon();
    this.terminal = this.createTerminal();
    this.terminalIdx = terminalIdx;
    this.rowCommand = "";
    this.rowPrefixStr = "";
    this.rowInputStr = "";
    const socket = new SockJS(baseWebSocketURL);
    this.webSocket = Stomp.over(socket);
    this.onWsConnectSuccess = onWsConnectSuccess;
    this.wsStatus = "";
    this.wsSendMsg = "";
    this.closed = false;
    this.isViMode = false;
    this.isEditorSave = false;
    this.isEditorText = "";
    this.editFileName = "";
    this.onOpenEditor = onOpenEditor;
    this.onCloseEditor = onCloseEditor;
    this.onFailEditor = onFailEditor;

    this.connectWebsocket();
  }

  /**
   * 创建终端
   * @returns
   */
  createTerminal(): Terminal {
    const terminal = new Terminal({
      cursorBlink: true, // 光标是否闪烁
      cursorStyle: "block", // 终端聚焦时光标的样式
      scrollback: 50, // 终端的回滚量。滚动是当行滚动到初始视口之外时保留的行数。
      tabStopWidth: 2, // 终端中制表位的大小
      windowsMode: true, // 是否启用Windows模式
      fontWeight: "500", // 字体粗细
      fontSize: 16, // 字体大小
      fontFamily:
        '"Fira Code", courier-new, courier, monospace, "Powerline Extra Symbols"', // 字体
      allowProposedApi: true // 是否允许使用建议的API
    } as ITerminalOptions);
    terminal.loadAddon(this.fitAddon);
    terminal.loadAddon(new Unicode11Addon());
    terminal.loadAddon(new SearchAddon());
    terminal.loadAddon(new WebLinksAddon());

    terminal.open(this.terminalEle);
    terminal.focus();

    // 观察终端尺寸的变化
    const resizeObserver = new ResizeObserver(() => {
      this.fitAddon.fit();
    });
    resizeObserver.observe(this.terminalEle);

    // 换行并输入起始符“$”
    this.fitAddon.fit();
    // 实时数据
    terminal.onData((data: string) => {
      this.handleTerminalInput(data);
    });

    // 终端尺寸变化
    terminal.onResize(() => {
      // const cols = size.cols;
      // const rows = size.rows;
      this.fitAddon?.fit();
    });

    //禁止光标移动
    terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      let keyCode = e.keyCode || e.which || e.charCode;
      const moveKey = [37, 38, 39, 40].includes(keyCode);
      return !moveKey;
    });

    //监听命令窗口事件
    terminal.onKey((e: { key: string; domEvent: KeyboardEvent }) => {
      //如果是编辑模式则忽略键盘操作
      if (this.isViMode) {
        return;
      }

      this.handleTerminalKey(e);
    });

    return terminal;
  }

  /**
   * 重新连接ws
   */
  reconnectWebsocket() {
    this.webSocket.disconnect();
    this.terminal.write(`\r\n`);
    const socket = new SockJS(baseWebSocketURL);
    this.webSocket = Stomp.over(socket);
    this.connectWebsocket();
  }

  /**
   * 建立ws连接
   */
  connectWebsocket() {
    this.webSocket.connect({}, () => {
      console.log("ws连接成功");
      this.onWsConnectSuccess && this.onWsConnectSuccess();
      this.terminal.write("connection  success" + "\r\n");
      this.wsStatus = "init";
      let wsParam: WsParam = {
        id: this.wsOptions.id,
        type: this.wsOptions.type,
        command: null
      };
      this.webSocket.subscribe("/topic/output", message => {
        // this.terminal.write(message.body + "\r\n");
        rev(message);
      });
      this.sendInit(wsParam);
    });
    const rev = (data: IMessage) => {
      console.log(data.body);
      if (this.wsStatus === "init") {
        // ws连接初始化的响应消息
        this.rowPrefixStr = data.body;
        this.terminal.write(data.body);
      } else if (this.wsStatus === "reqStart") {
        this.wsStatus = "resIng";

        if (this.isViMode) {
          // vi模式
          this.handleViModeMsg(data.body);
          return;
        }

        if (this.isEditorSave) {
          this.handleEditorSaveMsg(data.body);
        }

        // 发完命令后第一条响应：去除开头命令字符串
        if (data.body.startsWith(this.rowCommand)) {
          let tempStr = data.body;
          tempStr = tempStr.replace(
            new RegExp(`(^${this.rowCommand})`, "gm"),
            ""
          );

          // 末尾有前缀，则换行处理
          if (data.body.includes(this.rowPrefixStr.trim())) {
            tempStr = tempStr.replace(
              new RegExp(`(^${this.rowPrefixStr})`, "gm"),
              "\n\r"
            );
          }

          // cd 开头，获取前缀
          if (this.rowCommand?.startsWith("cd")) {
            this.rowPrefixStr = tempStr;
          }

          tempStr && this.terminal.write(`${tempStr}`);
        }
      } else if (this.wsStatus === "resIng") {
        if (this.isViMode) {
          // vi模式
          this.handleViModeMsg(data.body);
        } else {
          this.terminal.write(`${data.body}`);
        }
      }
    };
  }

  /**
   * vi模式后响应消息的处理
   * @param data
   * @returns
   */
  handleViModeMsg(data: string) {
    // 没有当前文件
    if (
      data.includes("No such file or directory") &&
      !data.includes(this.rowPrefixStr.trim())
    ) {
      // 当前响应既包含提示，但不包含前缀[root@VM-0-12-centos ~]#
      this.isViMode = false;
      this.terminal.write("\r\nNo such file or directory");
      return;
    } else if (
      data.includes("No such file or directory") &&
      data.includes(this.rowPrefixStr.trim())
    ) {
      // 当前响应既包含提示，也包含前缀[root@VM-0-12-centos ~]#
      this.isViMode = false;
      this.terminal.write("\r\nNo such file or directory");
      this.terminal.write(`\r\n${this.rowPrefixStr}`);
      return;
    }

    // 处理文件消息
    if (
      data.startsWith(this.rowCommand) &&
      !data.includes(this.rowPrefixStr.trim())
    ) {
      // 当前响应既包含命令行cat xxx.txt，但不包含前缀[root@VM-0-12-centos ~]#
      let tempStr = data;
      tempStr = tempStr.replace(new RegExp(`(^${this.rowCommand})`, "gm"), "");
      this.isEditorText += tempStr.trim();
    } else if (
      data.startsWith(this.rowCommand) &&
      data.includes(this.rowPrefixStr.trim())
    ) {
      // 当前响应既包含命令行cat xxx.txt，也包含前缀[root@VM-0-12-centos ~]#
      let tempStr = data;
      tempStr = tempStr.replace(new RegExp(`(^${this.rowCommand})`, "gm"), "");
      let lastIndex = tempStr.lastIndexOf(this.rowPrefixStr);
      tempStr = tempStr.substring(0, lastIndex);
      this.isEditorText += tempStr.trim();

      this.onOpenEditor && this.onOpenEditor(this.isEditorText);
      this.isEditorText = "";
      this.isViMode = false;
    } else if (data.includes(this.rowPrefixStr.trim())) {
      // 内容全部发送完毕
      let tempStr = data;
      let lastIndex = tempStr.lastIndexOf(this.rowPrefixStr);
      tempStr = tempStr.substring(0, lastIndex);
      this.isEditorText += tempStr.trim();

      this.onOpenEditor && this.onOpenEditor(this.isEditorText);
      this.isEditorText = "";
      this.isViMode = false;
    } else {
      this.isEditorText += data;
    }
  }

  /**
   * 发送编辑器文本
   * @param editorStr
   */
  wsSendEditorStr(editorStr: string) {
    editorStr = editorStr.replaceAll("\r\n", "\n");
    if (editorStr.endsWith("\n")) {
      let lastIndex = editorStr.lastIndexOf("\n");
      editorStr = editorStr.substring(0, lastIndex);
    }

    let command = 'echo "' + editorStr + '" > ' + this.editFileName;
    // let command = "echo '" + editorStr + "' >  " + this.editFileName;
    this.rowCommand = command;

    this.wsStatus = "resIng";
    this.isEditorSave = true;

    let wsParam: WsParam = {
      id: this.wsOptions.id,
      type: this.wsOptions.type,
      command: command
    };
    this.send(wsParam);
  }

  /**
   * 编辑保存后响应消息的处理
   * @param data
   */
  handleEditorSaveMsg(data: string) {
    // 编辑保存
    if (data.startsWith("echo")) {
      // 保存成功
      this.onCloseEditor && this.onCloseEditor();

      this.isEditorSave = false;
      let wsParam: WsParam = {
        id: this.wsOptions.id,
        type: this.wsOptions.type,
        command: "\r"
      };
      this.send(wsParam);
      this.terminal.focus();
    } else {
      // 保存失败
      this.onFailEditor && this.onFailEditor();
    }
  }

  /**
   * 处理终端输入的数据
   * @param data
   */
  handleTerminalInput(data: string) {
    const rowInputStr = this.rowInputStr;
    // console.log("🥑 utils/xtermUtils.ts:29 ~ [rowInputStr]:", rowInputStr);

    // Backspace
    if (data === "\x7f") {
      this.rowInputStr = rowInputStr.substring(0, rowInputStr.length - 1);
      if (rowInputStr.length > 0) {
        this.terminal.write("\b \b");
      }
    } else {
      this.rowInputStr += data;
      this.terminal.write(data);
    }
  }

  /**
   * 处理终端中按下的键
   * @param e
   */
  handleTerminalKey(e: { key: string; domEvent: KeyboardEvent }) {
    const ev = e.domEvent;
    if (ev.key === "Enter" || ev.code === "Enter") {
      // 去掉开头的空格
      this.rowInputStr = this.rowInputStr.trimStart();

      //判断是否输入的是vi或vim，判断是否是正确的vi命令格式
      if (/^(vi|vim)\s{1,}[a-zA-Z0-9\/]{1,}/.test(this.rowInputStr)) {
        // 匹配文件名
        let matches = this.rowInputStr.match(/\s+(\S+)/);
        if (matches && matches.length > 1) {
          this.editFileName = matches[1];
        }

        this.rowInputStr = this.rowInputStr.replace(/vim|vi/, "cat");
        this.isViMode = true;
      }

      //判断是否为apt安装命令，如果是apt转化成apt-get
      if (this.rowInputStr.startsWith("apt")) {
        this.rowInputStr = this.rowInputStr.replace("apt", "apt-get");
      }

      this.rowCommand = this.rowInputStr;
      this.rowInputStr += e.key;

      this.wsStatus = "reqStart";

      let wsParam: WsParam = {
        id: this.wsOptions.id,
        type: this.wsOptions.type,
        command: this.rowInputStr
      };
      this.send(wsParam);
      // 清空当前行
      this.rowInputStr = "";
    } else if (ev.key === "Space" || ev.code === "Space") {
      this.terminal.write(e.key);
      this.rowInputStr += e.key;
    } else if (ev.ctrlKey && ev.key === "c") {
      // Ctrl+C
      this.rowInputStr += e.key;
      let wsParam: WsParam = {
        id: this.wsOptions.id,
        type: this.wsOptions.type,
        command: "Ctrl + C"
      };
      this.send(wsParam);
      // 清空当前行
      this.rowInputStr = "";
    }
  }

  sendInit(wsParam: WsParam) {
    this.webSocket.send("/app/terminal/init", {}, JSON.stringify(wsParam));
  }

  send(wsParam: WsParam) {
    this.webSocket.send("/app/terminal/exec", {}, JSON.stringify(wsParam));
  }
}
