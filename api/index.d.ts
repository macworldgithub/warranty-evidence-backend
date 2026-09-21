import 'reflect-metadata';
import { Request, Response } from 'express';
declare function handler(req: Request, res: Response): Promise<any>;
export default handler;
