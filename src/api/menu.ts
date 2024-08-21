import { http } from "@/utils/http";
type Result = {
  success: boolean;
  message: string;
  data: Array<any>;
};
export const insertMenu = (data?: object) => {
  return http.request<Result>("post", "/api/menu/insert", { data });
};
export const updateMenu = (data?: object) => {
  return http.request<Result>("post", "/api/menu/update", { data });
};
export const deleteMenu = (data?: object) => {
  return http.request<Result>("delete", "/api/menu/delete/" + data);
};
