import { Request, Response } from 'express';
import supabase from '../../supabase';

export const uploadImageToSupabase = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const fileName = `${Date.now()}-${file.originalname}`;
    const bucket = process.env.SUPABASE_BUCKET as string;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrl } = supabase
      .storage
      .from(bucket)
      .getPublicUrl(fileName);

    res.status(201).json({
      message: 'Image uploaded successfully to Supabase',
      url: publicUrl.publicUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
};
