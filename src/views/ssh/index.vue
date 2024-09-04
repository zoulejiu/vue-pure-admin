<script setup lang="ts">
import { ref } from "vue";

import { useSsh } from "./hook";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Refresh from "@iconify-icons/ep/refresh";
import EditPen from "@iconify-icons/ep/edit-pen";
import TerminalView from "@/views/components/terminal";
const { columns, dataList, loading, getHostInfoList, resetForm, connection } =
  useSsh();
const formRef = ref();
</script>
<template>
  <div class="main">
    <el-form
      ref="formRef"
      :inline="true"
      class="search-form bg-bg_color w-[99/100] pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item>
        <el-button
          type="primary"
          :icon="useRenderIcon('ri:search-line')"
          :loading="loading"
          @click="getHostInfoList"
        >
          搜索
        </el-button>
        <el-button :icon="useRenderIcon(Refresh)" @click="resetForm(formRef)">
          重置
        </el-button>
      </el-form-item>
    </el-form>
    <pure-table :data="dataList" :columns="columns">
      <template #operation="{ row }">
        <el-button
          class="reset-margin"
          link
          type="primary"
          :icon="useRenderIcon(EditPen)"
          @click="connection(row)"
          >连接</el-button
        >
      </template>
    </pure-table>
  </div>
  <TerminalView :id="1" type="ssh" />
</template>
