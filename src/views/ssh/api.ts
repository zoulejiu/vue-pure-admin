import { http } from "@/utils/http";

type ResultTable = {
  success: boolean;
  data?: Array<any>;
};
export const getList = (data?: object) => {
  return http.request<ResultTable>("get", "/api/host/list", { data });
};
