export type ToastType = "success" | "error";

export type ToastMessage = {
  id: string;
  type: ToastType;
  message: string;
};

export const FLASH_TOAST_COOKIE = "dongyar_flash_toast";
