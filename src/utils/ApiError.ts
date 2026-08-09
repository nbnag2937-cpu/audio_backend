// Loi nghiep vu tuy chinh, giup middleware error luon tra ve dung status code + message
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, message: string, code = "ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, code = "BAD_REQUEST"): ApiError {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = "Chua dang nhap hoac token khong hop le", code = "UNAUTHORIZED"): ApiError {
    return new ApiError(401, message, code);
  }

  static forbidden(message = "Ban khong co quyen thuc hien hanh dong nay", code = "FORBIDDEN"): ApiError {
    return new ApiError(403, message, code);
  }

  static notFound(message = "Khong tim thay du lieu", code = "NOT_FOUND"): ApiError {
    return new ApiError(404, message, code);
  }

  static conflict(message: string, code = "CONFLICT"): ApiError {
    return new ApiError(409, message, code);
  }

  static internal(message = "Loi he thong", code = "INTERNAL_ERROR"): ApiError {
    return new ApiError(500, message, code);
  }
}
