// Generic CRUD hooks factory
export {
  createCrudHooks,
  getErrorMessage,
  useInvalidateQueries,
  type ListParams,
  type PagedResult,
  type ApiError,
  type CrudConfig,
} from "./useCrud";

// Admin hooks
export * from "./admin/usePaymentMethods";
