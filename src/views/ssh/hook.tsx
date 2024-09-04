import { onMounted, ref } from "vue";
import { getList } from "./api";

export function useSsh() {
  const loading = ref(true);
  const dataList = ref([]);
  const columns: TableColumnList = [
    {
      label: "序号",
      prop: "id"
    },
    {
      label: "名称",
      prop: "name"
    },
    {
      label: "Host",
      prop: "host"
    },
    {
      label: "端口",
      prop: "port"
    },
    {
      label: "连接类型",
      prop: "type",
      cellRenderer: ({ row }) => getConnectType(row.type)
    },
    {
      label: "账号",
      prop: "userName"
    },
    {
      label: "Key Path",
      prop: "sshKeyPath"
    },
    {
      label: "状态",
      prop: "status",
      cellRenderer: ({ row, props }) => (
        <el-tag size={props.size} type={getStatueIcon(row.status)}>
          {getStatusText(row.status)}
        </el-tag>
      )
    },
    {
      label: "操作",
      fixed: "right",
      width: 150,
      slot: "operation"
    }
  ];
  const getConnectType = type => {
    switch (type) {
      case 0:
        return "账号密码";
      case 1:
        return "Key Path";
    }
  };
  const getStatueIcon = status => {
    switch (status) {
      case 0:
        return "warning";
      case 1:
        return "primary";
      case -1:
        return "danger";
    }
  };
  const getStatusText = status => {
    switch (status) {
      case 0:
        return "启用";
      case 1:
        return "启用";
      case -1:
        return "已禁用";
    }
  };

  async function getHostInfoList() {
    loading.value = true;
    const { data } = await getList();
    dataList.value = data;
    loading.value = false;
  }
  onMounted(() => {
    getHostInfoList();
  });
  function resetForm(formRef) {
    if (!formRef) {
      return;
    }
    formRef.resetFields();
    getHostInfoList();
  }
  function connecTion(data) {

  }

  return {
    columns,
    getHostInfoList,
    dataList,
    loading,
    resetForm,
    connection: connecTion
  };
}
