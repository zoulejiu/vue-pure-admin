// // import type {
// //   AxiosResponseHeaders,
// //   InternalAxiosRequestConfig,
// //   RawAxiosResponseHeaders
// // } from "axios";
//
// type Result<T = any> = {
//   success: boolean;
//   data: T;
//   status: number;
//   message: string;
// };
//
// declare module "axios" {
//   export interface AxiosResponse<T = any, D = any> {
//     data: Result<T>;
//     status: number;
//     statusText: string;
//     headers: RawAxiosResponseHeaders | AxiosResponseHeaders;
//     config: InternalAxiosRequestConfig<D>;
//     request?: any;
//   }
// }
