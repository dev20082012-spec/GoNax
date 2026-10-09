import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

export class AuthController {
  constructor(private authService: AuthService = new AuthService()) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, organization, role } = req.body;
      const result = await this.authService.register(email, password, organization, role);
      res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: result
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message
      });
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      res.json({
        success: true,
        message: 'Authentication successful.',
        data: result
      });
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: err.message
      });
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      res.json({
        success: true,
        data: req.user
      });
    } catch (err) {
      next(err);
    }
  };

  exportData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const data = await this.authService.exportUserData(req.user.userId);
      res.json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  deleteData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const outcome = await this.authService.deleteUserData(req.user.userId);
      res.json({
        success: true,
        message: 'All personal observations and predictions successfully deleted.',
        data: outcome
      });
    } catch (err) {
      next(err);
    }
  };
}
