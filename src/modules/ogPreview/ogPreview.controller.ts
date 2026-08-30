import { Request, Response, NextFunction } from "express";
import { fetchOgImage } from "./ogPreview.service";

export async function getOgPreview(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const url = req.query.url as string | undefined;

    if (!url) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu tham số url" });
    }

    const { imageUrl, resolvedUrl } = await fetchOgImage(url);

    return res.status(200).json({ success: true, imageUrl, resolvedUrl });
  } catch (error) {
    next(error);
    return;
  }
}
